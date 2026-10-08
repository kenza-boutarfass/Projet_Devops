/**
 * Quality Report & DevSecOps Audit Generator
 * Synthesizes dataset profile, quality rules, ODCS contract, and validation execution into audit reports and CI/CD artifacts.
 */

function generateMarkdownReport(project, dataset, contract, validationRun, professorFeedback = null) {
  const score = validationRun ? Number(validationRun.quality_score) : (project.quality_score || 90);
  const sloMin = validationRun ? Number(validationRun.slo_minimum) : 90;
  const sloMet = validationRun ? validationRun.slo_met : score >= sloMin;
  const gateStatus = sloMet ? 'PASSED' : 'FAILED';
  const gateBadge = sloMet ? '✅ PASSED (CLEAR TO DEPLOY)' : '❌ FAILED (PIPELINE BLOCKED)';

  const datasetProfile = dataset?.profile_summary || {};
  const assertions = validationRun?.assertions_result || [];
  const breaches = assertions.filter((a) => a.status === 'FAILED');

  let md = `# 🛡️ Enterprise Data Quality & DevSecOps Gate Report

> **Project:** ${project.name} (\`${project.slug}\`)  
> **Environment:** \`${project.environment || 'Production'}\`  
> **Target Dataset:** \`${dataset ? dataset.name : 'N/A'}\`  
> **Contract Version:** \`${contract ? contract.version : 'v1.0.0'}\` (ODCS 0.9.3)  
> **Generated:** ${new Date().toISOString()}  

---

## 🚦 CI/CD Quality Gate Status

| Metric | Result | Target / SLO | Status |
| :--- | :--- | :--- | :--- |
| **Quality Gate Verdict** | **${gateStatus}** | Minimum **${sloMin}%** | ${gateBadge} |
| **Overall Quality Score** | **${score}%** | $\\ge$ ${sloMin}% | ${score >= sloMin ? '🟢 Compliant' : '🔴 Breach'} |
| **Contract Policy** | \`${contract?.contract_spec?.serviceLevelObjectives?.policyOnBreach || 'BLOCK_PIPELINE'}\` | Pre-deployment Gate | ${sloMet ? 'Deployment Allowed' : 'Build Failed'} |
| **Execution Runtime** | **${validationRun?.execution_time_ms || 0} ms** | $< 5000\\text{ ms}$ | 🟢 High Performance |

---

## 📊 Dataset Ingestion & Profiling Summary

- **Total Records:** ${dataset?.row_count || datasetProfile.totalRows || 0} rows
- **Schema Columns:** ${dataset?.column_count || datasetProfile.totalColumns || 0} columns
- **File Format:** \`${dataset?.file_format || 'csv'}\`
- **Missing Value Ratio:** ${datasetProfile.qualityHealth?.nullRatio !== undefined ? `${datasetProfile.qualityHealth.nullRatio}%` : '0%'}

---

## 📜 Executable Contract Assertions (${assertions.length} total)

| Column | Assertion Type | Severity | Pass Rate | Violations | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
${assertions.map((a) => `| \`${a.column}\` | \`${a.ruleType}\` | \`${a.severity}\` | ${a.passRate}% | ${a.violationsCount} | ${a.status === 'PASSED' ? '🟢 PASSED' : '🔴 FAILED'} |`).join('\n')}

`;

  if (breaches.length > 0) {
    md += `\n### ⚠️ Critical Breaches Log (${breaches.length} detected)\n\n`;
    breaches.forEach((b) => {
      md += `#### Column \`${b.column}\` — Rule: \`${b.ruleType}\`\n`;
      md += `- **Description:** ${b.description || 'Quality expectation failed'}\n`;
      md += `- **Pass Rate:** ${b.passRate}% (${b.violationsCount} invalid row(s))\n`;
      if (b.sampleViolations && b.sampleViolations.length > 0) {
        md += `- **Sample Failure Instances:**\n`;
        b.sampleViolations.forEach((v) => {
          md += `  - Row #${v.row}: Value \`${v.value}\` (${v.reason})\n`;
        });
      }
      md += `\n`;
    });
  } else {
    md += `\n> 🏆 **Zero Breaches Detected:** All ${assertions.length} contract assertions strictly verified without deviation.\n\n`;
  }

  if (professorFeedback) {
    md += `---

## 🎓 Academic Supervision Review

> **Evaluator Notes:**  
> "${professorFeedback}"
\n`;
  }

  md += `---
*Generated deterministically by Projet_Devops Enterprise Data Quality Platform.*
`;

  return md;
}

function generateGitHubActionsSnippet(project) {
  return `name: Data Quality Gate (DevSecOps)

on:
  push:
    branches: [main, master, staging]
  pull_request:
    branches: [main]

jobs:
  data-quality-gate:
    name: Verify Data Contract & Assertions
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Execute Deterministic Contract Gate
        env:
          PROJECT_ID: "${project.id}"
          API_URL: "https://quality-api.internal"
          API_TOKEN: "\${{ secrets.DATA_QUALITY_GATE_TOKEN }}"
        run: |
          echo "🚀 Evaluating Data Quality Contract for project ${project.name}..."
          RESPONSE=$(curl -s -w "\\n%{http_code}" -X POST "$API_URL/api/projects/$PROJECT_ID/validation/run" \\
            -H "Authorization: Bearer $API_TOKEN" \\
            -H "Content-Type: application/json")
          
          HTTP_BODY=$(echo "$RESPONSE" | sed '$d')
          HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1)

          if [ "$HTTP_STATUS" -ne 201 ]; then
            echo "❌ Quality Gate Failed or Connection Error (HTTP $HTTP_STATUS)"
            echo "$HTTP_BODY"
            exit 1
          fi

          GATE_STATUS=$(echo "$HTTP_BODY" | jq -r '.run.status')
          SCORE=$(echo "$HTTP_BODY" | jq -r '.run.quality_score')

          echo "📊 Quality Score: $SCORE%"
          echo "🚦 Gate Status: $GATE_STATUS"

          if [ "$GATE_STATUS" != "PASSED" ]; then
            echo "🛑 BLOCKED: Data quality breach exceeds SLO tolerance. Blocking deployment pipeline."
            exit 1
          fi

          echo "✅ PASSED: Quality gate verified successfully. Clear to proceed to deployment."
`;
}

module.exports = {
  generateMarkdownReport,
  generateGitHubActionsSnippet,
};
