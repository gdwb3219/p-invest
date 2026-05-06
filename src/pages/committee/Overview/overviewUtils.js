export const COMMITTEE_CREATE_LIST_PATH = '/committee/create-list/';
export const COMMITTEE_APPROVAL_POST_PATH = '/committee/create-list/';
export const COMMITTEE_STAGE_SESSION_KEY =
  'p-invest:committee:overview-staging';
export const KEY_FIRST = ['구분0 (사업명)', '구분0 순번'];
export const APPROVE_REASON_COLUMNS = [
  '구분0 (사업명)',
  '구분0 순번',
  '투자사업명',
];

export function normalizeRows(raw) {
  const list = Array.isArray(raw) ? raw : (raw?.data ?? raw?.results ?? []);
  return Array.isArray(list) ? list : [];
}

export function getRowKey(row, index) {
  const key =
    row?.['prime-key'] ??
    row?.prime_key ??
    row?.id ??
    row?._id ??
    row?.target_id ??
    index;
  return String(key);
}

export function getPrimeKey(row, fallback) {
  const key = row?.['prime-key'] ?? row?.prime_key ?? fallback;
  return String(key);
}

export function newManualRowKey() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return `manual-${crypto.randomUUID()}`;
  }
  return `manual-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function displayCell(v) {
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function getOrderedHeaders(headers) {
  if (!headers || headers.length === 0) return headers || [];
  const first = KEY_FIRST.filter((k) => headers.includes(k));
  const rest = headers.filter((k) => !KEY_FIRST.includes(k));
  return [...first, ...rest];
}

function escapeCsvCell(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildCsvTemplate(headers) {
  if (!Array.isArray(headers) || headers.length === 0) return '';
  return `${headers.map(escapeCsvCell).join(',')}\r\n`;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  console.log(line, 'linelineline');

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  if (inQuotes) {
    throw new Error('invalid csv quote');
  }

  result.push(current);
  return result;
}

export function parseCsvText(csvText) {
  const normalized = String(csvText ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const lines = normalized
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return [];
  return lines.map(parseCsvLine);
}
