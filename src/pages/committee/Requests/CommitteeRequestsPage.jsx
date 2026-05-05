import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useApiUrl } from '../../../contexts/ApiUrlContext';
import '../../../styles/pages/invest-rev/InvestRevRequest.css';
import { getOrderedHeaders, normalizeRows } from '../Overview/overviewUtils';

const COMMITTEE_LIST_PATH = '/committee/list/';
/** 현재 목록의 committee_status 일괄 변경 — 백엔드 계약에 맞게 조정하세요. */
const COMMITTEE_LIST_CONFIRM_PATH = '/committee/list/confirm-committee/';
/** 프론트엔드 전용 확정 단계 비밀번호(간이 보호). */
const COMMITTEE_CONFIRM_PASSWORD = '47392';

const META_COLUMNS = [
  { key: '_id', label: '문서 ID' },
  { key: 'prime-key', label: 'prime-key' },
  { key: 'row_key', label: 'row_key' },
  { key: 'approve_reason', label: '승인 사유' },
  { key: 'requester', label: '요청자' },
  { key: 'status', label: 'status' },
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

function getRowReactKey(row, index) {
  const id = row?._id;
  if (id && typeof id === 'object' && id.$oid != null) return id.$oid;
  if (id != null) return String(id);
  const pk = row?.['prime-key'] ?? row?.prime_key ?? row?.row_key;
  if (pk != null) return String(pk);
  return `committee-req-${index}`;
}

function getDocumentOidString(row) {
  const id = row?._id;
  if (id && typeof id === 'object' && id.$oid != null) return String(id.$oid);
  if (typeof id === 'string') return id;
  return null;
}

function escapeCsvCell(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildRequestsTableCsv(sortedRows, rowDataHeaders) {
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

function CommitteeRequestsPage() {
  const { API_URL } = useApiUrl();
  const committeeListUrl = `${API_URL}${COMMITTEE_LIST_PATH}`;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [committeeNameInput, setCommitteeNameInput] = useState('');
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [confirmModalError, setConfirmModalError] = useState(null);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordModalError, setPasswordModalError] = useState(null);
  const [pendingConfirm, setPendingConfirm] = useState(null);

  const committeeConfirmUrl = `${API_URL}${COMMITTEE_LIST_CONFIRM_PATH}`;

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(committeeListUrl);
      const list = normalizeCommitteeListPayload(res.data);
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('투심위 요청 목록 로드 오류:', err);
      setError(
        err.response?.data?.error ??
          err.response?.data?.message ??
          err.message ??
          '투심위 요청 목록을 불러오지 못했습니다.',
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [committeeListUrl]);

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
    if (sortedRows.length === 0) return;
    const csv = buildRequestsTableCsv(sortedRows, rowDataHeaders);
    downloadCsv(csv, 'committee_requests');
  }, [sortedRows, rowDataHeaders]);

  const openConfirmModal = useCallback(() => {
    setConfirmModalError(null);
    setCommitteeNameInput('');
    setPasswordModalOpen(false);
    setPasswordInput('');
    setPasswordModalError(null);
    setPendingConfirm(null);
    setConfirmModalOpen(true);
  }, []);

  const closePasswordModal = useCallback(() => {
    if (confirmSubmitting) return;
    setPasswordModalOpen(false);
    setPasswordInput('');
    setPasswordModalError(null);
  }, [confirmSubmitting]);

  const closeConfirmModal = useCallback(() => {
    if (confirmSubmitting) return;
    closePasswordModal();
    setConfirmModalOpen(false);
    setConfirmModalError(null);
    setPendingConfirm(null);
    setCommitteeNameInput('');
  }, [confirmSubmitting, closePasswordModal]);

  useEffect(() => {
    if (!confirmModalOpen && !passwordModalOpen) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (passwordModalOpen) closePasswordModal();
      else closeConfirmModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    confirmModalOpen,
    passwordModalOpen,
    closeConfirmModal,
    closePasswordModal,
  ]);

  const openPasswordStep = useCallback(() => {
    const name = committeeNameInput.trim();
    if (!name) {
      setConfirmModalError(
        "투자심의위원회 예정 날짜를 입력해 주세요. ex) '26년 6월 (예비) 투심위'",
      );
      return;
    }
    const documentIds = sortedRows
      .map((row) => getDocumentOidString(row))
      .filter((id) => id != null && id !== '');
    if (documentIds.length !== sortedRows.length) {
      setConfirmModalError(
        '일부 행에 MongoDB 문서 ID(_id)가 없어 일괄 수정을 보낼 수 없습니다.',
      );
      return;
    }
    setConfirmModalError(null);
    setPendingConfirm({ committee_status: name, document_ids: documentIds });
    setPasswordInput('');
    setPasswordModalError(null);
    setPasswordModalOpen(true);
  }, [committeeNameInput, sortedRows]);

  const submitAfterPassword = useCallback(async () => {
    if (passwordInput !== COMMITTEE_CONFIRM_PASSWORD) {
      setPasswordModalError('비밀번호가 틀렸습니다.');
      return;
    }
    if (pendingConfirm == null) {
      setPasswordModalError(
        '요청 정보가 없습니다. 처음부터 다시 시도해 주세요.',
      );
      return;
    }
    setPasswordModalError(null);
    setConfirmSubmitting(true);
    try {
      await axios.post(committeeConfirmUrl, pendingConfirm, {
        headers: { 'Content-Type': 'application/json' },
      });
      setPasswordModalOpen(false);
      setPasswordInput('');
      setPendingConfirm(null);
      setConfirmModalOpen(false);
      setCommitteeNameInput('');
      await fetchList();
    } catch (err) {
      console.error('투심위 상태 일괄 변경 오류:', err);
      setPasswordModalError(
        err.response?.data?.error ??
          err.response?.data?.message ??
          err.message ??
          '서버 요청에 실패했습니다.',
      );
    } finally {
      setConfirmSubmitting(false);
    }
  }, [committeeConfirmUrl, fetchList, passwordInput, pendingConfirm]);

  return (
    <div className='invest-rev-sub-page invest-rev-request'>
      <p className='invest-rev-sub-badge invest-rev-sub-badge--active'>
        현재 탭: 투심위 요청 현황
      </p>
      <p className='invest-rev-sub-desc' style={{ marginBottom: '1rem' }}>
        MongoDB에 저장된 투심위 요청 문서를 조회합니다. 메타 필드와{' '}
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
          GET: <code>{committeeListUrl}</code>
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
          표시할 요청이 없습니다. API 응답이 배열(또는 <code>data</code> /{' '}
          <code>results</code> 배열)인지 확인하세요.
        </p>
      ) : (
        <div className='invest-rev-request__panel'>
          <div className='invest-rev-request__modal-header'>
            <h2
              className='invest-rev-request__panel-title'
              style={{ margin: 0 }}
            >
              요청 목록 ({sortedRows.length}건)
            </h2>
            <button
              type='button'
              className='invest-rev-request__btn invest-rev-request__btn--secondary'
              onClick={handleDownloadCsv}
            >
              CSV 다운로드
            </button>
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
                {sortedRows.map((row, idx) => {
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
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: '1rem',
            }}
          >
            <button
              type='button'
              className='invest-rev-request__btn invest-rev-request__btn--primary'
              onClick={openConfirmModal}
              disabled={loading}
            >
              투심위 리스트 확정
            </button>
          </div>
        </div>
      )}

      {confirmModalOpen ? (
        <div
          className='invest-rev-request__modal-backdrop invest-rev-request__modal-backdrop--form'
          role='presentation'
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !passwordModalOpen) {
              closeConfirmModal();
            }
          }}
        >
          <div
            className='invest-rev-request__modal invest-rev-request__modal--form'
            role='dialog'
            aria-modal='true'
            aria-labelledby='committee-list-confirm-title'
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className='invest-rev-request__modal-header'>
              <h3
                id='committee-list-confirm-title'
                className='invest-rev-request__modal-title'
              >
                투심위 리스트 확정
              </h3>
            </div>

            {/* <p className='invest-rev-request__modal-desc'>
              투자심의위원회 예정 날짜를 입력 해주세요. ex) &apos;26년 6월
              (예비) 투심위
            </p> */}

            {confirmModalError && (
              <div className='invest-rev-request__error' role='alert'>
                {confirmModalError}
              </div>
            )}

            <div className='invest-rev-request__form-group'>
              <label
                className='invest-rev-request__label'
                htmlFor='committee-list-confirm-name'
              >
                투심위 이름
              </label>
              <textarea
                id='committee-list-confirm-name'
                className='invest-rev-request__textarea'
                rows={3}
                value={committeeNameInput}
                placeholder="'26년 6월 (예비) 투심위"
                onChange={(e) => {
                  setCommitteeNameInput(e.target.value);
                  if (confirmModalError) setConfirmModalError(null);
                }}
                disabled={confirmSubmitting || passwordModalOpen}
              />
            </div>

            <div
              className='invest-rev-request__toolbar'
              style={{
                justifyContent: 'flex-end',
                gap: '0.5rem',
                marginTop: '0.75rem',
              }}
            >
              <button
                type='button'
                className='invest-rev-request__btn invest-rev-request__btn--secondary'
                onClick={closeConfirmModal}
                disabled={confirmSubmitting || passwordModalOpen}
              >
                취소
              </button>
              <button
                type='button'
                className='invest-rev-request__btn invest-rev-request__btn--primary'
                onClick={openPasswordStep}
                disabled={confirmSubmitting || passwordModalOpen}
              >
                확정
              </button>
            </div>
            {/* <p
              className='invest-rev-request__hint'
              style={{ marginTop: '0.75rem' }}
            >
              POST: <code>{committeeConfirmUrl}</code>
              {' · '}body: <code>committee_status</code>,{' '}
              <code>document_ids</code>
            </p> */}
          </div>
        </div>
      ) : null}

      {passwordModalOpen ? (
        <div
          className='invest-rev-request__modal-backdrop invest-rev-request__modal-backdrop--form'
          style={{ zIndex: 1025 }}
          role='presentation'
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closePasswordModal();
          }}
        >
          <div
            className='invest-rev-request__modal invest-rev-request__modal--form'
            role='dialog'
            aria-modal='true'
            aria-labelledby='committee-list-password-title'
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className='invest-rev-request__modal-header'>
              <h3
                id='committee-list-password-title'
                className='invest-rev-request__modal-title'
              >
                비밀번호 확인
              </h3>
            </div>

            <p className='invest-rev-request__modal-desc'>
              투심위 리스트 확정을 진행하려면 비밀번호를 입력하세요.
            </p>

            {passwordModalError && (
              <div className='invest-rev-request__error' role='alert'>
                {passwordModalError}
              </div>
            )}

            <div className='invest-rev-request__form-group'>
              <label
                className='invest-rev-request__label'
                htmlFor='committee-list-confirm-password'
              >
                비밀번호
              </label>
              <input
                id='committee-list-confirm-password'
                type='password'
                className='invest-rev-request__input'
                autoComplete='off'
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (passwordModalError) setPasswordModalError(null);
                }}
                disabled={confirmSubmitting}
              />
            </div>

            <div
              className='invest-rev-request__toolbar'
              style={{
                justifyContent: 'flex-end',
                gap: '0.5rem',
                marginTop: '0.75rem',
                marginBottom: 0,
              }}
            >
              <button
                type='button'
                className='invest-rev-request__btn invest-rev-request__btn--secondary'
                onClick={closePasswordModal}
                disabled={confirmSubmitting}
              >
                취소
              </button>
              <button
                type='button'
                className='invest-rev-request__btn invest-rev-request__btn--primary'
                onClick={() => void submitAfterPassword()}
                disabled={confirmSubmitting}
              >
                {confirmSubmitting ? '처리 중…' : '확정'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default CommitteeRequestsPage;
