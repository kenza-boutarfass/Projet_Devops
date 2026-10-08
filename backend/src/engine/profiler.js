/**
 * Deterministic Data Profiling Engine
 * Analyzes structure, infers types, calculates null ratios and quality metrics without LLM dependency.
 */

function parseCSV(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { headers: [], rows: [] };

  // Détecter le délimiteur (virgule, point-virgule ou tabulation)
  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  let delimiter = ',';
  if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';
  else if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';

  function splitLine(line) {
    const values = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        insideQuotes = !insideQuotes;
      } else if (char === delimiter && !insideQuotes) {
        values.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^["']|["']$/g, ''));
    return values;
  }

  const headers = splitLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const rawValues = splitLine(lines[i]);
    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = rawValues[idx] !== undefined ? rawValues[idx] : '';
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

function inferType(value) {
  if (value === null || value === undefined || value === '') return 'NULL';
  const val = String(value).trim();

  // Boolean
  if (/^(true|false|oui|non|yes|no)$/i.test(val)) return 'BOOLEAN';

  // Email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'EMAIL';

  // Integer
  if (/^-?\d+$/.test(val)) return 'INTEGER';

  // Float
  if (/^-?\d+(\.\d+)?$/.test(val) && !isNaN(Number(val))) return 'FLOAT';

  // Date
  if (/^\d{4}-\d{2}-\d{2}/.test(val) && !isNaN(Date.parse(val))) return 'DATE';

  return 'TEXT';
}

function profileDataset(parsedData) {
  const { headers, rows } = parsedData;
  const totalRows = rows.length;
  const totalColumns = headers.length;

  if (totalRows === 0 || totalColumns === 0) {
    return {
      totalRows: 0,
      totalColumns: 0,
      columns: [],
      qualityHealth: { completeness: 0, consistency: 0, overallScore: 0 },
    };
  }

  let totalCells = totalRows * totalColumns;
  let nonNullCells = 0;

  const columnProfiles = headers.map((colName) => {
    const values = rows.map((r) => r[colName]);
    let nullCount = 0;
    const typeCounts = {};
    const numericValues = [];
    const distinctSet = new Set();
    const samples = [];

    values.forEach((v) => {
      const isNull = v === null || v === undefined || v === '';
      if (isNull) {
        nullCount++;
      } else {
        nonNullCells++;
        distinctSet.add(v);
        if (samples.length < 5 && !samples.includes(v)) {
          samples.push(v);
        }

        const type = inferType(v);
        typeCounts[type] = (typeCounts[type] || 0) + 1;

        if (type === 'INTEGER' || type === 'FLOAT') {
          numericValues.push(Number(v));
        }
      }
    });

    const populatedCount = totalRows - nullCount;
    const nullPercentage = totalRows > 0 ? Number(((nullCount / totalRows) * 100).toFixed(2)) : 0;
    const distinctCount = distinctSet.size;

    // Déterminer le type majoritaire
    let inferredType = 'TEXT';
    let maxTypeCount = 0;
    Object.entries(typeCounts).forEach(([t, count]) => {
      if (count > maxTypeCount) {
        maxTypeCount = count;
        inferredType = t;
      }
    });

    const colProfile = {
      name: colName,
      inferredType,
      nullCount,
      nullPercentage,
      distinctCount,
      isUnique: distinctCount === totalRows && nullCount === 0,
      samples,
    };

    if (numericValues.length > 0) {
      colProfile.min = Math.min(...numericValues);
      colProfile.max = Math.max(...numericValues);
      colProfile.avg = Number((numericValues.reduce((a, b) => a + b, 0) / numericValues.length).toFixed(2));
    }

    return colProfile;
  });

  const completeness = totalCells > 0 ? Number(((nonNullCells / totalCells) * 100).toFixed(1)) : 100;
  const overallScore = Math.min(100, Math.max(0, Math.round(completeness)));

  return {
    totalRows,
    totalColumns,
    columns: columnProfiles,
    qualityHealth: {
      completeness,
      overallScore,
      totalCells,
      nonNullCells,
      nullCells: totalCells - nonNullCells,
    },
  };
}

module.exports = {
  parseCSV,
  inferType,
  profileDataset,
};
