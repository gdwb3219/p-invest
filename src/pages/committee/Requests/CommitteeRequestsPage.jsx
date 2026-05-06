import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useApiUrl } from '../../../contexts/ApiUrlContext';
import '../../../styles/pages/invest-rev/InvestRevRequest.css';
import { getOrderedHeaders, normalizeRows } from '../Overview/overviewUtils';

/** 데이터 없을 때도 테이블 몸통 높이 유지용 빈 행 개수 */
const EMPTY_TABLE_PLACEHOLDER_ROWS = 12;

const COMMITTEE_LIST_PATH = '/committee/list/';
/** 현재 목록의 committee_status 일괄 변경 — 백엔드 계약에 맞게 조정하세요. */
const COMMITTEE_LIST_CONFIRM_PATH = '/committee/list/';
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

/** DELETE API용 Mongo 문서 _id 문자열 */
function getDocumentIdString(row) {
  const id = row?._id;
  if (id && typeof id === 'object' && id.$oid != null) return String(id.$oid);
  if (typeof id === 'string' && id.trim()) return id.trim();
  if (id != null) return String(id);
  return null;
}

/** _id가 없을 때 삭제 대상으로 쓸 prime-key 문자열 */
function getPrimeKeyString(row) {
  const pk = row?.['prime-key'] ?? row?.prime_key;
  if (pk == null || pk === '') return null;
  const s = String(pk).trim();
  return s || null;
}

/** 삭제 요청 body 및 로딩 중 행 매칭용 키 */
function getDeleteAnchor(row) {
  const oid = getDocumentIdString(row);
  if (oid)
    return { trackKey: `oid:${oid}`, payload: { _id: oid } };
  const pk = getPrimeKeyString(row);
  if (pk)
    return {
      trackKey: `pk:${pk}`,
      payload: { 'prime-key': pk },
    };
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
  const [approvedByInput, setApprovedByInput] = useState('');
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [confirmModalError, setConfirmModalError] = useState(null);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordModalError, setPasswordModalError] = useState(null);
  const [pendingConfirm, setPendingConfirm] = useState(null);

  const [deletingKey, setDeletingKey] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const selectAllCheckboxRef = useRef(null);

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

  const selectableTrackKeys = useMemo(
    () =>
      sortedRows
        .map((row) => getDeleteAnchor(row)?.trackKey)
        .filter(Boolean),
    [sortedRows],
  );

  useEffect(() => {
    const valid = new Set(selectableTrackKeys);
    setSelectedKeys((prev) => {
      const next = new Set();
      let changed = false;
      for (const k of prev) {
        if (valid.has(k)) next.add(k);
        else changed = true;
      }
      if (!changed && next.size === prev.size) return prev;
      return next;
    });
  }, [selectableTrackKeys]);

  const allSelectableSelected =
    selectableTrackKeys.length > 0 &&
    selectableTrackKeys.every((k) => selectedKeys.has(k));
  const someSelectableSelected = selectableTrackKeys.some((k) =>
    selectedKeys.has(k),
  );
  const hasBulkSelection =
    selectableTrackKeys.length > 0 &&
    selectableTrackKeys.some((k) => selectedKeys.has(k));

  useEffect(() => {
    const el = selectAllCheckboxRef.current;
    if (!el) return;
    el.indeterminate =
      someSelectableSelected && !allSelectableSelected;
  }, [someSelectableSelected, allSelectableSelected]);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedKeys((prev) => {
      if (selectableTrackKeys.length === 0) return prev;
      const allOn = selectableTrackKeys.every((k) => prev.has(k));
      if (allOn) return new Set();
      return new Set(selectableTrackKeys);
    });
  }, [selectableTrackKeys]);

  const handleToggleRowSelected = useCallback((trackKey) => {
    if (!trackKey) return;
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(trackKey)) next.delete(trackKey);
      else next.add(trackKey);
      return next;
    });
  }, []);

  const handleDownloadCsv = useCallback(() => {
    if (sortedRows.length === 0) return;
    const csv = buildRequestsTableCsv(sortedRows, rowDataHeaders);
    downloadCsv(csv, 'committee_requests');
  }, [sortedRows, rowDataHeaders]);

  const openConfirmModal = useCallback(() => {
    setConfirmModalError(null);
    setCommitteeNameInput('');
    setApprovedByInput('');
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
    setApprovedByInput('');
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

    const approvedBy = approvedByInput.trim();
    if (!approvedBy) {
      setConfirmModalError('승인자 이름을 입력해 주세요.');
      return;
    }

    setConfirmModalError(null);

    setPendingConfirm({
      new_status: name,
      approved_by: approvedBy,
    });

    setPasswordInput('');
    setPasswordModalError(null);
    setPasswordModalOpen(true);
  }, [committeeNameInput, approvedByInput]);

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
      setApprovedByInput('');
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

  const handleDeleteRow = useCallback(
    async (row) => {
      const anchor = getDeleteAnchor(row);
      if (!anchor) {
        window.alert(
          '문서 _id 또는 prime-key를 찾을 수 없어 삭제할 수 없습니다.',
        );
        return;
      }
      if (
        !window.confirm('이 행을 데이터베이스에서 삭제할까요? 이 작업은 되돌릴 수 없습니다.')
      ) {
        return;
      }
      setDeletingKey(anchor.trackKey);
      try {
        await axios.delete(committeeListUrl, {
          headers: { 'Content-Type': 'application/json' },
          data: anchor.payload,
        });
        await fetchList();
      } catch (err) {
        console.error('투심위 요청 삭제 오류:', err);
        window.alert(
          err.response?.data?.error ??
            err.response?.data?.message ??
            err.message ??
            '삭제 요청에 실패했습니다.',
        );
      } finally {
        setDeletingKey(null);
      }
    },
    [committeeListUrl, fetchList],
  );

  const handleBulkDeleteSelected = useCallback(async () => {
    const targets = sortedRows.filter((row) => {
      const a = getDeleteAnchor(row);
      return a != null && selectedKeys.has(a.trackKey);
    });
    if (targets.length === 0) {
      window.alert('삭제할 행을 선택해 주세요.');
      return;
    }
    if (
      !window.confirm(
        `선택한 ${targets.length}건을 데이터베이스에서 삭제할까요? 이 작업은 되돌릴 수 없습니다.`,
      )
    ) {
      return;
    }

    setBulkDeleting(true);
    const errors = [];
    try {
      for (const row of targets) {
        const anchor = getDeleteAnchor(row);
        if (!anchor) continue;
        try {
          await axios.delete(committeeListUrl, {
            headers: { 'Content-Type': 'application/json' },
            data: anchor.payload,
          });
        } catch (err) {
          errors.push(
            err.response?.data?.error ??
              err.response?.data?.message ??
              err.message ??
              '알 수 없는 오류',
          );
        }
      }
      setSelectedKeys(new Set());
      await fetchList();
      if (errors.length > 0) {
        window.alert(
          `일부 삭제에 실패했습니다. (${errors.length}건)\n${errors
            .slice(0, 3)
            .join('\n')}${errors.length > 3 ? '\n…' : ''}`,
        );
      }
    } finally {
      setBulkDeleting(false);
    }
  }, [committeeListUrl, fetchList, selectedKeys, sortedRows]);

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

      <div className='invest-rev-request__panel'>
        <div className='invest-rev-request__modal-header'>
          <h2
            className='invest-rev-request__panel-title'
            style={{ margin: 0 }}
          >
            요청 목록 ({sortedRows.length}건)
            {loading && rows.length === 0 ? (
              <span style={{ fontWeight: 400, marginLeft: '0.35rem' }}>
                · 불러오는 중…
              </span>
            ) : null}
          </h2>
          <button
            type='button'
            className='invest-rev-request__btn invest-rev-request__btn--secondary'
            onClick={handleDownloadCsv}
            disabled={sortedRows.length === 0}
          >
            CSV 다운로드
          </button>
        </div>
        <div className='invest-rev-request__table-wrap'>
          <table className='invest-rev-request__table invest-rev-request__table--committee-requests'>
            <thead>
              <tr>
                <th
                  className='invest-rev-request__th--committee-select'
                  scope='col'
                >
                  <input
                    ref={selectAllCheckboxRef}
                    type='checkbox'
                    className='invest-rev-request__row-radio'
                    checked={allSelectableSelected}
                    onChange={handleToggleSelectAll}
                    disabled={
                      selectableTrackKeys.length === 0 ||
                      loading ||
                      bulkDeleting
                    }
                    aria-label='전체 선택'
                  />
                </th>
                <th>#</th>
                {META_COLUMNS.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
                {rowDataHeaders.map((h) => (
                  <th key={`rd-${h}`} title={h}>
                    {h}
                  </th>
                ))}
                <th
                  className='invest-rev-request__th--committee-actions'
                  scope='col'
                >
                  삭제
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.length > 0
                ? sortedRows.map((row, idx) => {
                    const rd =
                      row?.row_data && typeof row.row_data === 'object'
                        ? row.row_data
                        : {};
                    const deleteAnchor = getDeleteAnchor(row);
                    const deleteTrackKey = deleteAnchor?.trackKey ?? null;
                    const isDeleting =
                      deleteTrackKey != null &&
                      deletingKey === deleteTrackKey;
                    const isRowSelected =
                      deleteTrackKey != null &&
                      selectedKeys.has(deleteTrackKey);
                    return (
                      <tr
                        key={getRowReactKey(row, idx)}
                        className={
                          isRowSelected
                            ? 'invest-rev-request__row--selected'
                            : undefined
                        }
                      >
                        <td className='invest-rev-request__td--committee-select'>
                          <input
                            type='checkbox'
                            className='invest-rev-request__row-radio'
                            checked={Boolean(
                              deleteTrackKey &&
                                selectedKeys.has(deleteTrackKey),
                            )}
                            onChange={() =>
                              handleToggleRowSelected(deleteTrackKey)
                            }
                            disabled={
                              !deleteTrackKey ||
                              loading ||
                              bulkDeleting ||
                              isDeleting
                            }
                            aria-label={`행 ${idx + 1} 선택`}
                          />
                        </td>
                        <td>{idx + 1}</td>
                        {META_COLUMNS.map((col) => (
                          <td key={col.key}>
                            {formatCellValue(row?.[col.key])}
                          </td>
                        ))}
                        {rowDataHeaders.map((h) => (
                          <td key={h} title={formatCellValue(rd[h])}>
                            {formatCellValue(rd[h])}
                          </td>
                        ))}
                        <td className='invest-rev-request__td--committee-actions'>
                          <button
                            type='button'
                            className='invest-rev-request__btn invest-rev-request__btn--remove invest-rev-request__btn--committee-delete'
                            aria-label='행 삭제'
                            disabled={
                              !deleteTrackKey ||
                              loading ||
                              bulkDeleting ||
                              isDeleting
                            }
                            onClick={() => void handleDeleteRow(row)}
                          >
                            {isDeleting ? '삭제 중…' : '삭제'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                : Array.from(
                    { length: EMPTY_TABLE_PLACEHOLDER_ROWS },
                    (_, i) => (
                      <tr
                        key={`committee-req-placeholder-${i}`}
                        className='invest-rev-request__tr--committee-placeholder'
                      >
                        <td
                          className='invest-rev-request__td--committee-select'
                        >
                          &#160;
                        </td>
                        <td>&#160;</td>
                        {META_COLUMNS.map((col) => (
                          <td key={col.key}>&#160;</td>
                        ))}
                        {rowDataHeaders.map((h) => (
                          <td key={h}>&#160;</td>
                        ))}
                        <td
                          className='invest-rev-request__td--committee-actions'
                        >
                          &#160;
                        </td>
                      </tr>
                    ),
                  )}
            </tbody>
          </table>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginTop: '1rem',
          }}
        >
          <button
            type='button'
            className='invest-rev-request__btn invest-rev-request__btn--secondary invest-rev-request__btn--committee-bulk-delete'
            onClick={() => void handleBulkDeleteSelected()}
            disabled={
              !hasBulkSelection || loading || bulkDeleting || sortedRows.length === 0
            }
          >
            {bulkDeleting ? '선택 삭제 중…' : '선택 삭제'}
          </button>
          <button
            type='button'
            className='invest-rev-request__btn invest-rev-request__btn--primary'
            onClick={openConfirmModal}
            disabled={loading || bulkDeleting}
          >
            투심위 리스트 확정
          </button>
        </div>
      </div>

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

            <div className='invest-rev-request__form-group'>
              <label
                className='invest-rev-request__label'
                htmlFor='committee-list-approved-by'
              >
                승인자
              </label>
              <input
                id='committee-list-approved-by'
                type='text'
                className='invest-rev-request__input'
                autoComplete='name'
                value={approvedByInput}
                placeholder='승인자 이름'
                onChange={(e) => {
                  setApprovedByInput(e.target.value);
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
