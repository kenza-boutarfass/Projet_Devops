/**
 * AI & Heuristic Rule Discovery Engine
 * Generates candidate Data Quality rules based on dataset profiling and context.
 */

async function discoverRulesForDataset(dataset, projectContext = {}) {
  const profile = dataset.profile_summary;
  if (!profile || !profile.columns || profile.columns.length === 0) {
    return [];
  }

  const rules = [];

  profile.columns.forEach((col) => {
    const colNameLower = col.name.toLowerCase();

    // 1. Règle NOT_NULL & COMPLETENESS
    if (col.nullCount === 0) {
      rules.push({
        column_name: col.name,
        rule_type: 'NOT_NULL',
        params: {},
        severity: 'ERROR',
        description: `Column "${col.name}" must not contain null or empty values.`,
        rationale: `Profile shows 100% completeness (0 nulls out of ${profile.totalRows} rows). Critical for data integrity.`,
      });
    } else if (col.nullPercentage <= 15) {
      const minCompleteness = Math.max(80, Math.floor(100 - col.nullPercentage - 5));
      rules.push({
        column_name: col.name,
        rule_type: 'COMPLETENESS_MIN',
        params: { minCompleteness },
        severity: 'WARNING',
        description: `Column "${col.name}" completeness must remain above ${minCompleteness}%.`,
        rationale: `Currently has ${col.nullPercentage}% nulls. Warning threshold prevents sudden data degradation.`,
      });
    }

    // 2. Règle UNIQUE / Clé candidate
    if (col.isUnique || (col.distinctCount === profile.totalRows && profile.totalRows > 0)) {
      rules.push({
        column_name: col.name,
        rule_type: 'UNIQUE',
        params: {},
        severity: 'ERROR',
        description: `Column "${col.name}" values must be strictly unique.`,
        rationale: `100% distinct values (${col.distinctCount}/${profile.totalRows}). Candidate primary key or natural identifier.`,
      });
    }

    // 3. Règle FORMAT EMAIL
    if (col.inferredType === 'EMAIL' || colNameLower.includes('email') || colNameLower.includes('mail')) {
      rules.push({
        column_name: col.name,
        rule_type: 'FORMAT_EMAIL',
        params: { regex: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' },
        severity: 'ERROR',
        description: `Column "${col.name}" must match standard RFC email format.`,
        rationale: `Email structure detected in records. Prevents invalid formatting from entering production.`,
      });
    }

    // 4. Règle VALEURS NUMÉRIQUES ET INTERVALLES
    if (col.inferredType === 'INTEGER' || col.inferredType === 'FLOAT') {
      if (colNameLower.includes('age')) {
        rules.push({
          column_name: col.name,
          rule_type: 'RANGE',
          params: { min: 18, max: 120 },
          severity: 'ERROR',
          description: `Column "${col.name}" must be between 18 and 120.`,
          rationale: `Standard human age boundary constraint. Prevents negative or unrealistic values.`,
        });
      } else if (colNameLower.includes('amount') || colNameLower.includes('price') || colNameLower.includes('cost') || colNameLower.includes('total')) {
        rules.push({
          column_name: col.name,
          rule_type: 'MIN_VALUE',
          params: { min: 0 },
          severity: 'ERROR',
          description: `Monetary column "${col.name}" must be non-negative (>= 0).`,
          rationale: `Financial amounts cannot be negative unless explicitly an account refund.`,
        });
      } else if (col.min !== undefined && col.max !== undefined && col.min >= 0) {
        rules.push({
          column_name: col.name,
          rule_type: 'MIN_VALUE',
          params: { min: 0 },
          severity: 'WARNING',
          description: `Column "${col.name}" values must be positive (>= 0).`,
          rationale: `Observed minimum is ${col.min}. Establishing non-negative boundary constraint.`,
        });
      }
    }

    // 5. Règle CATEGORICAL / ENUM (Valeurs autorisées)
    if (col.distinctCount <= 5 && col.distinctCount > 1 && profile.totalRows >= 5) {
      const allowedList = col.samples.map(String);
      rules.push({
        column_name: col.name,
        rule_type: 'ALLOWED_VALUES',
        params: { allowedValues: allowedList },
        severity: col.inferredType === 'BOOLEAN' ? 'ERROR' : 'WARNING',
        description: `Column "${col.name}" values must be one of: [${allowedList.join(', ')}].`,
        rationale: `Categorical domain detected with low cardinality (${col.distinctCount} distinct values). Prevents unauthorized category values.`,
      });
    }

    // 6. Règle DATE ISO-8601
    if (col.inferredType === 'DATE' || colNameLower.includes('date') || colNameLower.includes('_at')) {
      rules.push({
        column_name: col.name,
        rule_type: 'DATE_FORMAT',
        params: { format: 'YYYY-MM-DD' },
        severity: 'ERROR',
        description: `Column "${col.name}" must follow standard ISO date formatting (YYYY-MM-DD).`,
        rationale: `Consistent temporal parsing required for ETL and analytics pipelines.`,
      });
    }
  });

  return rules;
}

module.exports = {
  discoverRulesForDataset,
};
