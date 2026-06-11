import { getOrderedHeaders, normalizeRows } from '../Overview/overviewUtils';

export const COMMITTEE_HISTORY_LIST_PATH = '/committee/history-list/';

export const META_COLUMNS = [
  { key: '_id', label: '문서 ID' },
  { key: 'prime-key', label: 'prime-key' },
  { key: 'row_key', label: 'row_key' },
  { key: 'approve_reason', label: '승인 사유' },
  { key: 'requester', label: '요청자' },
  { key: 'status', label: 'status' },
  { key: 'approved_by', label: '승인자' },
  { key: 'created_at', label: '생성일시' },
  { key: 'committee_status', label: '투심위 상태' },
];

export function normalizeCommitteeListPayload(data) {
  if (Array.isArray(data)) return data;
  if (data?.data != null && Array.isArray(data.data)) return data.data;
  if (data?.items != null && Array.isArray(data.items)) return data.items;
  if (data?.results != null && Array.isArray(data.results)) return data.results;
  return normalizeRows(data);
}

export function formatCellValue(value) {
  if (value == null || value === '') return '';
  if (typeof value !== 'object') return String(value);
  if (value.$oid != null) return String(value.$oid);
  if (value.$date !== undefined && value.$date !== null) {
    const d = value.$date;
    let date = null;
    if (typeof d === 'string' || typeof d === 'number') {
      date = new Date(d);
    } else if (d && typeof d === 'object' && d.$numberLong != null) {
      date = new Date(Number(d.$numberLong));
    }
    if (date && !Number.isNaN(date.getTime())) {
      return date.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    }
    return String(d);
  }
  return JSON.stringify(value);
}

export function committeeStatusFilterKey(row) {
  const raw = row?.committee_status;
  if (raw == null || raw === '') return '__EMPTY__';
  return formatCellValue(raw);
}

export function committeeStatusFilterLabel(key) {
  return key === '__EMPTY__' ? '(값 없음)' : key;
}

export function getDocumentIdString(row) {
  const id = row?._id;
  if (id && typeof id === 'object' && id.$oid != null) return String(id.$oid);
  if (typeof id === 'string' && id.trim()) return id.trim();
  if (id != null) return String(id);
  return null;
}

/** 동일 _id가 API 응답에 중복 포함된 경우만 제거 (prime-key 기준 병합은 하지 않음) */
export function deduplicateCommitteeHistoryRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const seenIds = new Set();
  const result = [];
  for (const row of rows) {
    const id = getDocumentIdString(row);
    if (id) {
      if (seenIds.has(id)) continue;
      seenIds.add(id);
    }
    result.push(row);
  }
  return result;
}

/** 투심위 상태 필터 — 항상 새 배열 반환(원본 sortedRows 참조 공유 금지) */
export function filterCommitteeHistoryByStatus(rows, statusFilter) {
  const source = Array.isArray(rows) ? rows : [];
  if (!statusFilter) return source.slice();
  return source.filter(
    (row) => committeeStatusFilterKey(row) === statusFilter,
  );
}

export function getRowReactKey(row, index) {
  const id = getDocumentIdString(row);
  if (id) return `oid:${id}`;

  const pk = row?.['prime-key'] ?? row?.prime_key ?? row?.row_key;
  const created = formatCellValue(row?.created_at);
  if (pk != null) {
    return `pk:${String(pk)}|${created}|${index}`;
  }
  return `committee-history-${index}`;
}

function escapeCsvCell(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function buildHistoryTableCsv(sortedRows, rowDataHeaders) {
  const headerCells = ['#', ...META_COLUMNS.map((c) => c.label), ...rowDataHeaders];
  const lines = [headerCells.map(escapeCsvCell).join(',')];
  for (let idx = 0; idx < sortedRows.length; idx += 1) {
    const row = sortedRows[idx];
    const rd = row?.row_data && typeof row.row_data === 'object' ? row.row_data : {};
    const cells = [
      String(idx + 1),
      ...META_COLUMNS.map((col) => escapeCsvCell(formatCellValue(row?.[col.key]))),
      ...rowDataHeaders.map((h) => escapeCsvCell(formatCellValue(rd[h]))),
    ];
    lines.push(cells.join(','));
  }
  return lines.join('\r\n');
}

export function downloadCsv(text, baseName) {
  const stamp = new Date()
    .toISOString()
    .slice(0, 16)
    .replace(/[-T:]/g, '')
    .slice(0, 12);
  const blob = new Blob([`\uFEFF${text}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}_${stamp}.csv`;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function sortRowsByCreatedAt(rows) {
  const copy = Array.isArray(rows) ? [...rows] : [];
  return copy.sort((a, b) => {
    const ta = a?.created_at;
    const tb = b?.created_at;
    const da =
      ta && typeof ta === 'object' && ta.$date != null ? new Date(ta.$date).getTime() : NaN;
    const db =
      tb && typeof tb === 'object' && tb.$date != null ? new Date(tb.$date).getTime() : NaN;
    if (!Number.isNaN(db) || !Number.isNaN(da)) {
      if (Number.isNaN(da)) return 1;
      if (Number.isNaN(db)) return -1;
      return db - da;
    }
    const sa = String(a?.['prime-key'] ?? a?.row_key ?? '');
    const sb = String(b?.['prime-key'] ?? b?.row_key ?? '');
    return sb.localeCompare(sa);
  });
}

export function buildRowDataHeaders(sortedRows) {
  const keys = new Set();
  for (const doc of sortedRows) {
    const rd = doc?.row_data;
    if (rd && typeof rd === 'object' && !Array.isArray(rd)) {
      for (const k of Object.keys(rd)) keys.add(k);
    }
  }
  return getOrderedHeaders([...keys]);
}
