/**
 * Deterministic Validation Engine
 * Executes contract assertions against dataset rows and generates comprehensive breach reports.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isNullOrEmpty(val) {
  return val === null || val === undefined || String(val).trim() === '';
}

function evaluateAssertion(assertion, rows) {
  const column = assertion.column;
  const ruleType = assertion.assertion || assertion.rule_type;
  const params = assertion.parameters || assertion.params || {};

  let validCount = 0;
  let violations = [];

  const totalRows = rows.length;
  if (totalRows === 0) {
    return {
      id: assertion.id,
      column,
      ruleType,
      severity: assertion.severity || 'WARNING',
      description: assertion.description,
      totalRows: 0,
      validCount: 0,
      violationsCount: 0,
      passRate: 100,
      status: 'PASSED',
      sampleViolations: [],
    };
  }

  // Pre-processing for uniqueness
  let seenValues = new Map();
  if (ruleType === 'UNIQUE') {
    rows.forEach((row, idx) => {
      const val = row[column];
      if (!isNullOrEmpty(val)) {
        const key = String(val).trim();
        if (!seenValues.has(key)) {
          seenValues.set(key, []);
        }
        seenValues.get(key).push(idx + 1);
      }
    });
  }

  rows.forEach((row, idx) => {
    const rowNum = idx + 1;
    const val = row[column];
    let isValid = true;
    let failureReason = '';

    switch (ruleType) {
      case 'NOT_NULL':
        if (isNullOrEmpty(val)) {
          isValid = false;
          failureReason = 'Value is missing or empty';
        }
        break;

      case 'UNIQUE':
        if (!isNullOrEmpty(val)) {
          const occurrences = seenValues.get(String(val).trim());
          if (occurrences && occurrences.length > 1) {
            isValid = false;
            failureReason = `Duplicate value (appears ${occurrences.length} times in rows: ${occurrences.slice(0, 3).join(', ')})`;
          }
        }
        break;

      case 'RANGE':
        if (!isNullOrEmpty(val)) {
          const num = Number(val);
          if (isNaN(num)) {
            isValid = false;
            failureReason = `Value "${val}" is not a valid number`;
          } else {
            if (params.min !== undefined && num < params.min) {
              isValid = false;
              failureReason = `Value ${num} is below minimum allowed (${params.min})`;
            }
            if (params.max !== undefined && num > params.max) {
              isValid = false;
              failureReason = `Value ${num} exceeds maximum allowed (${params.max})`;
            }
          }
        }
        break;

      case 'POSITIVE':
        if (!isNullOrEmpty(val)) {
          const num = Number(val);
          if (isNaN(num) || num <= 0) {
            isValid = false;
            failureReason = `Value "${val}" must be strictly positive (> 0)`;
          }
        }
        break;

      case 'FORMAT_EMAIL':
        if (!isNullOrEmpty(val)) {
          if (!EMAIL_REGEX.test(String(val).trim())) {
            isValid = false;
            failureReason = `Value "${val}" does not match standard email format`;
          }
        }
        break;

      case 'ALLOWED_VALUES':
        if (!isNullOrEmpty(val)) {
          const allowed = Array.isArray(params.allowedValues) ? params.allowedValues : [];
          if (allowed.length > 0 && !allowed.includes(String(val).trim())) {
            isValid = false;
            failureReason = `Value "${val}" is not in allowed set: [${allowed.join(', ')}]`;
          }
        }
        break;

      case 'DATE_FORMAT':
        if (!isNullOrEmpty(val)) {
          const date = new Date(val);
          if (isNaN(date.getTime())) {
            isValid = false;
            failureReason = `Value "${val}" is not a valid date string`;
          }
        }
        break;

      default:
        // By default, if assertion is unrecognized, consider valid
        isValid = true;
    }

    if (isValid) {
      validCount++;
    } else {
      if (violations.length < 5) {
        violations.push({
          row: rowNum,
          value: val !== null && val !== undefined && val !== '' ? String(val) : '(empty / null)',
          reason: failureReason,
        });
      }
    }
  });

  const violationsCount = totalRows - validCount;
  const passRate = totalRows > 0 ? Number(((validCount / totalRows) * 100).toFixed(1)) : 100;
  const status = violationsCount === 0 ? 'PASSED' : 'FAILED';

  return {
    id: assertion.id,
    column,
    ruleType,
    severity: assertion.severity || 'ERROR',
    description: assertion.description,
    parameters: params,
    totalRows,
    validCount,
    violationsCount,
    passRate,
    status,
    sampleViolations: violations,
  };
}

/**
 * Execute contract validation over dataset rows
 * @param {Object} contract - The active Data Contract (with contract_spec.qualityRules)
 * @param {Array<Object>} rows - Array of dataset rows (key/value objects)
 * @returns {Object} Validation summary and detailed assertions report
 */
function executeContractValidation(contract, rows = []) {
  const startTime = Date.now();

  const contractSpec = contract.contract_spec || {};
  const assertions = contractSpec.qualityRules || [];
  const slo = contractSpec.serviceLevelObjectives || {};
  const sloMinimum = Number(slo.minimumQualityScore || 90.0);
  const sloPolicy = slo.policyOnBreach || 'BLOCK_PIPELINE';

  const assertionsResult = assertions.map((ast) => evaluateAssertion(ast, rows));

  const totalAssertions = assertionsResult.length;
  const passedAssertions = assertionsResult.filter((r) => r.status === 'PASSED').length;
  const failedAssertions = totalAssertions - passedAssertions;

  // Calcul du score global : moyenne pondérée des taux de réussite de chaque assertion
  let overallScore = 100.0;
  if (totalAssertions > 0) {
    const sumPassRates = assertionsResult.reduce((acc, r) => acc + r.passRate, 0);
    overallScore = Number((sumPassRates / totalAssertions).toFixed(2));
  }

  const sloMet = overallScore >= sloMinimum;
  const overallStatus = sloMet ? 'PASSED' : 'FAILED';
  const executionTimeMs = Date.now() - startTime;

  return {
    status: overallStatus,
    qualityScore: overallScore,
    sloMinimum,
    sloPolicy,
    sloMet,
    totalAssertions,
    passedAssertions,
    failedAssertions,
    executionTimeMs,
    totalRowsEvaluated: rows.length,
    assertionsResult,
    contractVersion: contract.version || 'v1.0.0',
    evaluatedAt: new Date().toISOString(),
  };
}

module.exports = {
  executeContractValidation,
  evaluateAssertion,
};
