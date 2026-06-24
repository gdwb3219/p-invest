import { getRowImportId } from './historyReasonUtils';

export const normalizeRevisionsList = (raw) => {
  const list = Array.isArray(raw)
    ? raw
    : (raw?.data ?? raw?.results ?? []);
  return Array.isArray(list) ? list : [];
};

export const getRevisionImportId = (revision) =>
  revision?.import_id ??
  revision?.importId ??
  revision?.version ??
  '';

export const getRevisionRevId = (revision) => {
  if (!revision) return null;
  const value =
    revision.rev_id ??
    revision.revId ??
    revision.revision ??
    revision.revision_name ??
    getRevisionImportId(revision);
  if (value == null || String(value).trim() === '') return null;
  return String(value);
};

export const getRevisionVersionName = (revision) => {
  if (!revision) return null;
  const value =
    revision.name ??
    revision.revision_name ??
    revision.version_name ??
    revision.version;
  if (value == null || String(value).trim() === '') return null;
  return String(value);
};

export const getRevisionImportedAt = (revision) => {
  if (!revision || typeof revision !== 'object') return null;
  const value =
    revision.imported_at ??
    revision.importedAt ??
    revision.import_time ??
    revision.importTime ??
    revision.created_at ??
    revision.createdAt ??
    null;
  return value == null || value === '' ? null : value;
};

/** MongoDB Date(ISO 문자열, $date 확장 JSON, 타임스탬프 등) → Date */
export const parseMongoDate = (value) => {
  if (value == null || value === '') return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'object') {
    if (value.$date !== undefined && value.$date !== null) {
      return parseMongoDate(value.$date);
    }
    if (value.$numberLong != null) {
      const date = new Date(Number(value.$numberLong));
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  return null;
};

const getImportedAtTimestamp = (value) => {
  const date = parseMongoDate(value);
  return date ? date.getTime() : 0;
};

export const pickImportedAtFromRows = (rows) => {
  if (!rows?.length) return null;
  for (const row of rows) {
    const raw =
      row?.imported_at ??
      row?.importedAt ??
      row?.import_time ??
      row?.importTime;
    if (raw != null && raw !== '') return raw;
  }
  return null;
};

export const pickDominantImportId = (rows) => {
  if (!rows?.length) return '';
  const counts = new Map();
  for (const row of rows) {
    const id = getRowImportId(row);
    if (!id) continue;
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  let best = '';
  let max = 0;
  for (const [id, count] of counts) {
    if (count > max) {
      max = count;
      best = id;
    }
  }
  return best;
};

export const findRevisionByImportId = (revisions, importId) => {
  if (!importId || !revisions?.length) return null;
  const target = String(importId);
  return (
    revisions.find((revision) => {
      const id = getRevisionImportId(revision);
      return id && String(id) === target;
    }) ?? null
  );
};

export const pickLatestRevision = (revisions) => {
  if (!revisions?.length) return null;
  const sorted = [...revisions].sort((a, b) => {
    const ta = getImportedAtTimestamp(getRevisionImportedAt(a));
    const tb = getImportedAtTimestamp(getRevisionImportedAt(b));
    return tb - ta;
  });
  return sorted[0] ?? null;
};

export const resolveCurrentRevision = (revisions, rows) => {
  const importId = pickDominantImportId(rows);
  if (importId) {
    const matched = findRevisionByImportId(revisions, importId);
    if (matched) return matched;
  }
  return pickLatestRevision(revisions);
};

export const formatImportedAt = (value) => {
  const date = parseMongoDate(value);
  if (!date) {
    if (value != null && value !== '' && typeof value !== 'object') {
      return String(value);
    }
    return null;
  }

  return date.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const buildRevMeta = (revision, rows) => {
  const rowCount = rows?.length ?? 0;
  const fallbackImportId = pickDominantImportId(rows);

  if (!revision) {
    const rowImportedAt = pickImportedAtFromRows(rows);
    return {
      revId: fallbackImportId || null,
      versionName: null,
      importId: fallbackImportId || null,
      importedAt: rowImportedAt,
      importedAtLabel: formatImportedAt(rowImportedAt),
      rowCount,
    };
  }

  const importedAt =
    getRevisionImportedAt(revision) ?? pickImportedAtFromRows(rows);

  return {
    revId: getRevisionRevId(revision) ?? fallbackImportId ?? null,
    versionName: getRevisionVersionName(revision),
    importId: getRevisionImportId(revision) || fallbackImportId || null,
    importedAt,
    importedAtLabel: formatImportedAt(importedAt),
    rowCount,
  };
};
