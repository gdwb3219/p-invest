import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useApiUrl } from '../../../contexts/ApiUrlContext';
import '../../../styles/pages/invest-rev/InvestRevRequest.css';
import { getOrderedHeaders, normalizeRows } from '../Overview/overviewUtils';

const COMMITTEE_HISTORY_LIST_PATH = '/committee/history-list/';

const META_COLUMNS = [
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

function normalizeCommitteeListPayload(data) {
  if (Array.isArray(data)) return data;
  if (data?.data != null && Array.isArray(data.data)) return data.data;
  if (data?.items != null && Array.isArray(data.items)) return data.items;
  return normalizeRows(data);
}

function formatCellValue(value) {
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

function committeeStatusFilterKey(row) {
  const raw = row?.committee_status;
  if (raw == null || raw === '') return '__EMPTY__';
  return formatCellValue(raw);
}

function committeeStatusFilterLabel(key) {
  return key === '__EMPTY__' ? '(값 없음)' : key;
}

function getRowReactKey(row, index) {
  const id = row?._id;
  if (id && typeof id === 'object' && id.$oid != null) return id.$oid;
  if (id != null) return String(id);
  const pk = row?.['prime-key'] ?? row?.prime_key ?? row?.row_key;
  if (pk != null) return String(pk);
  return `committee-history-${index}`;
}

function escapeCsvCell(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildHistoryTableCsv(sortedRows, rowDataHeaders) {
  const headerCells = [
    '#',
    ...META_COLUMNS.map((c) => c.label),
    ...rowDataHeaders,
  ];
  const lines = [headerCells.map(escapeCsvCell).join(',')];
  for (let idx = 0; idx < sortedRows.length; idx += 1) {
    const row = sortedRows[idx];
    const rd =
      row?.row_data && typeof row.row_data === 'object' ? row.row_data : {};
    const cells = [
      String(idx + 1),
      ...META_COLUMNS.map((col) =>
        escapeCsvCell(formatCellValue(row?.[col.key])),
      ),
      ...rowDataHeaders.map((h) => escapeCsvCell(formatCellValue(rd[h]))),
    ];
    lines.push(cells.join(','));
  }
  return lines.join('\r\n');
}

function downloadCsv(text, baseName) {
  const stamp = new Date()
    .toISOString()
    .slice(0, 16)
    .replace(/[-T:]/g, '')
    .slice(0, 12);
  const blob = new Blob([`\uFEFF${text}`], {
    type: 'text/csv;charset=utf-8',
  });
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

function CommitteeHistoryListPage() {
  const { API_URL } = useApiUrl();
  const historyListUrl = `${API_URL}${COMMITTEE_HISTORY_LIST_PATH}`;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [committeeStatusFilter, setCommitteeStatusFilter] = useState('');

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(historyListUrl);
      const list = normalizeCommitteeListPayload(res.data);
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('투심위 리스트 로드 오류:', err);
      setError(
        err.response?.data?.error ??
          err.response?.data?.message ??
          err.message ??
          '투심위 리스트를 불러오지 못했습니다.',
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [historyListUrl]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const ta = a?.created_at;
      const tb = b?.created_at;
      const da =
        ta && typeof ta === 'object' && ta.$date != null
          ? new Date(ta.$date).getTime()
          : NaN;
      const db =
        tb && typeof tb === 'object' && tb.$date != null
          ? new Date(tb.$date).getTime()
          : NaN;
      if (!Number.isNaN(db) || !Number.isNaN(da)) {
        if (Number.isNaN(da)) return 1;
        if (Number.isNaN(db)) return -1;
        return db - da;
      }
      const sa = String(a?.['prime-key'] ?? a?.row_key ?? '');
      const sb = String(b?.['prime-key'] ?? b?.row_key ?? '');
      return sb.localeCompare(sa);
    });
  }, [rows]);

  const committeeStatusOptions = useMemo(() => {
    const keys = new Set();
    for (const row of sortedRows) {
      keys.add(committeeStatusFilterKey(row));
    }
    const ordered = [...keys].sort((a, b) => {
      if (a === '__EMPTY__') return -1;
      if (b === '__EMPTY__') return 1;
      return a.localeCompare(b, 'ko');
    });
    return ordered.map((key) => ({
      value: key,
      label: committeeStatusFilterLabel(key),
    }));
  }, [sortedRows]);

  const filteredRows = useMemo(() => {
    if (!committeeStatusFilter) return sortedRows;
    return sortedRows.filter(
      (row) => committeeStatusFilterKey(row) === committeeStatusFilter,
    );
  }, [sortedRows, committeeStatusFilter]);

  const rowDataHeaders = useMemo(() => {
    const keys = new Set();
    for (const doc of sortedRows) {
      const rd = doc?.row_data;
      if (rd && typeof rd === 'object' && !Array.isArray(rd)) {
        for (const k of Object.keys(rd)) keys.add(k);
      }
    }
    return getOrderedHeaders([...keys]);
  }, [sortedRows]);

  const handleDownloadCsv = useCallback(() => {
    if (filteredRows.length === 0) return;
    const csv = buildHistoryTableCsv(filteredRows, rowDataHeaders);
    downloadCsv(csv, 'committee_history_list');
  }, [filteredRows, rowDataHeaders]);

  return (
    <div className='invest-rev-sub-page invest-rev-request'>
      <p className='invest-rev-sub-badge invest-rev-sub-badge--active'>
        현재 탭: 투심위 리스트
      </p>
      <p className='invest-rev-sub-desc' style={{ marginBottom: '1rem' }}>
        투심위 생성 현황에서 확정된 투심위 이력을 조회합니다. 메타 필드와{' '}
        <code>row_data</code> 컬럼을 한 테이블에서 가로 스크롤로 확인할 수
        있습니다.
      </p>

      <div className='invest-rev-request__toolbar'>
        <button
          type='button'
          className='invest-rev-request__btn invest-rev-request__btn--secondary'
          onClick={() => void fetchList()}
          disabled={loading}
        >
          {loading ? '불러오는 중…' : '목록 새로고침'}
        </button>
        <p className='invest-rev-request__hint'>
          GET: <code>{historyListUrl}</code>
        </p>
      </div>

      {error && (
        <div className='invest-rev-request__error' role='alert'>
          {error}
        </div>
      )}

      {loading && rows.length === 0 && !error ? (
        <p className='invest-rev-request__loading'>목록을 불러오는 중입니다…</p>
      ) : sortedRows.length === 0 ? (
        <p className='invest-rev-request__empty'>
          표시할 데이터가 없습니다. API 응답이 배열(또는 <code>data</code> /{' '}
          <code>items</code> 배열)인지 확인하세요.
        </p>
      ) : (
        <div className='invest-rev-request__panel'>
          <div
            className='invest-rev-request__modal-header'
            style={{
              flexWrap: 'wrap',
              gap: '0.75rem',
              alignItems: 'flex-end',
            }}
          >
            <h2
              className='invest-rev-request__panel-title'
              style={{ margin: 0, flex: '1 1 auto' }}
            >
              투심위 리스트 ({filteredRows.length}
              {committeeStatusFilter ? ` / 전체 ${sortedRows.length}` : ''}건)
            </h2>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'flex-end',
                gap: '0.75rem',
              }}
            >
              <div style={{ minWidth: '12rem', maxWidth: '22rem' }}>
                <label
                  className='invest-rev-request__label'
                  htmlFor='committee-history-status-filter'
                >
                  투심위 상태 필터
                </label>
                <select
                  id='committee-history-status-filter'
                  className='invest-rev-request__select'
                  value={committeeStatusFilter}
                  onChange={(e) => setCommitteeStatusFilter(e.target.value)}
                  disabled={loading}
                >
                  <option value=''>전체</option>
                  {committeeStatusOptions.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type='button'
                className='invest-rev-request__btn invest-rev-request__btn--secondary'
                onClick={handleDownloadCsv}
                disabled={filteredRows.length === 0}
              >
                CSV 다운로드
              </button>
            </div>
          </div>
          <div className='invest-rev-request__table-wrap'>
            <table className='invest-rev-request__table'>
              <thead>
                <tr>
                  <th>#</th>
                  {META_COLUMNS.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                  {rowDataHeaders.map((h) => (
                    <th key={`rd-${h}`} title={h}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => {
                  const rd =
                    row?.row_data && typeof row.row_data === 'object'
                      ? row.row_data
                      : {};
                  return (
                    <tr key={getRowReactKey(row, idx)}>
                      <td>{idx + 1}</td>
                      {META_COLUMNS.map((col) => (
                        <td key={col.key}>{formatCellValue(row?.[col.key])}</td>
                      ))}
                      {rowDataHeaders.map((h) => (
                        <td key={h} title={formatCellValue(rd[h])}>
                          {formatCellValue(rd[h])}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommitteeHistoryListPage;
