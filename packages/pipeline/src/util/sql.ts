export type SqlValue = string | number | null;

export function sqlValue(value: SqlValue): string {
  if (value === null) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Build multi-row INSERT statements, chunked so no single statement gets huge.
 * Returns SQL text ending with a trailing newline (empty string for no rows).
 */
export function insertRows(
  table: string,
  columns: string[],
  rows: SqlValue[][],
  chunkSize = 200,
): string {
  if (rows.length === 0) return '';
  const lines: string[] = [];
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const values = chunk.map((row) => `(${row.map(sqlValue).join(', ')})`).join(',\n  ');
    lines.push(`INSERT INTO ${table} (${columns.join(', ')}) VALUES\n  ${values};`);
  }
  return lines.join('\n') + '\n';
}
