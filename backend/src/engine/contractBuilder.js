/**
 * Data Contract Builder Engine
 * Compiles approved Quality Rules and Dataset Schema into an executable Open Data Contract specification (ODCS).
 */

function jsonToYaml(obj, indent = 0) {
  const spaces = '  '.repeat(indent);
  let yaml = '';

  if (Array.isArray(obj)) {
    obj.forEach((item) => {
      if (typeof item === 'object' && item !== null) {
        yaml += `${spaces}- ${jsonToYaml(item, indent + 1).trimStart()}`;
      } else {
        yaml += `${spaces}- ${JSON.stringify(item)}\n`;
      }
    });
  } else if (typeof obj === 'object' && obj !== null) {
    Object.entries(obj).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        yaml += `${spaces}${key}: null\n`;
      } else if (Array.isArray(value)) {
        if (value.length === 0) {
          yaml += `${spaces}${key}: []\n`;
        } else {
          yaml += `${spaces}${key}:\n${jsonToYaml(value, indent + 1)}`;
        }
      } else if (typeof value === 'object') {
        yaml += `${spaces}${key}:\n${jsonToYaml(value, indent + 1)}`;
      } else if (typeof value === 'string' && (value.includes(':') || value.includes('\n') || value.includes('"'))) {
        yaml += `${spaces}${key}: "${value.replace(/"/g, '\\"')}"\n`;
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    });
  }

  return yaml;
}

function buildDataContract(project, dataset, rules, version = 'v1.0.0') {
  // Sélectionner les règles actives (en priorité les règles approuvées)
  const approvedRules = rules.filter((r) => r.status === 'APPROVED');
  const activeRules = approvedRules.length > 0 ? approvedRules : rules;

  const profile = dataset?.profile_summary || { columns: [] };

  const schemaDefinitions = (profile.columns || []).map((col) => ({
    column: col.name,
    logicalType: col.inferredType,
    nullable: col.nullCount > 0,
    unique: Boolean(col.isUnique),
  }));

  const qualityAssertions = activeRules.map((r) => ({
    id: r.id,
    column: r.column_name,
    assertion: r.rule_type,
    severity: r.severity,
    parameters: r.params || {},
    description: r.description,
    status: r.status,
  }));

  const contractSpec = {
    dataContractSpecification: '0.9.3',
    info: {
      title: project.name,
      version,
      status: 'ACTIVE',
      environment: project.environment || 'Development',
      dataset: dataset ? dataset.name : 'Unknown',
      owner: project.owner_name || 'Project Owner',
      contact: project.owner_email || 'data-team@company.internal',
      generatedAt: new Date().toISOString(),
    },
    schema: schemaDefinitions,
    qualityRules: qualityAssertions,
    serviceLevelObjectives: {
      minimumQualityScore: 90,
      policyOnBreach: 'BLOCK_PIPELINE',
      slaExecution: 'PRE_DEPLOYMENT_GATE',
    },
  };

  const yamlContent = `# ========================================================
# EXECUTABLE DATA CONTRACT SPECIFICATION (ODCS)
# Project: ${project.name}
# Target Dataset: ${dataset ? dataset.name : 'N/A'}
# Generated: ${new Date().toISOString()}
# ========================================================

${jsonToYaml(contractSpec)}`;

  return {
    contractSpec,
    yamlContent,
    assertionsCount: qualityAssertions.length,
    approvedCount: approvedRules.length,
  };
}

module.exports = {
  buildDataContract,
  jsonToYaml,
};
