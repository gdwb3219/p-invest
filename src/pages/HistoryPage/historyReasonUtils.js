export const CHANGE_REASON_COLUMN = '변경사유(30자 이내)';
export const CHANGE_REASON_MAX_LENGTH = 30;
export const CHANGE_REASON_EMPTY_VALUE = '없음';

const CHANGE_REASON_KEYS = [
  CHANGE_REASON_COLUMN,
  '변경사유',
  'change_reason',
  'changeReason',
];

export const getRowImportId = (row) =>
  row?.import_id ?? row?.importId ?? row?.importID ?? '';

export const getRowPrimeKey = (row, fallback = '') =>
  row?.['prime-key'] ?? row?.prime_key ?? row?.primeKey ?? fallback;

/** DB에 저장된 변경사유 문자열 (수정 가능한 value로 그대로 표시) */
export const getChangeReasonValue = (row) => {
  if (!row) return '';
  for (const key of CHANGE_REASON_KEYS) {
    const raw = row[key];
    if (raw != null && raw !== '') {
      return String(raw);
    }
  }
  return '';
};

export const splitHeaders = (headers) => {
  if (!headers?.length) {
    return { dataHeaders: [], hasReasonColumn: false };
  }
  const hasReasonColumn = headers.includes(CHANGE_REASON_COLUMN);
  const dataHeaders = hasReasonColumn
    ? headers.filter((h) => h !== CHANGE_REASON_COLUMN)
    : headers;
  return { dataHeaders, hasReasonColumn };
};
