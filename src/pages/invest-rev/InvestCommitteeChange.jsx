import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useSessionStorage } from '../../hooks/useCustomHooks';
import '../../styles/pages/invest-rev/InvestRevRequest.css';
import '../../styles/pages/invest-rev/InvestCommitteeChange.css';
import CancelModal from './modal/CancelModal.jsx';
import ClearStagingModal from './modal/ClearStagingModal.jsx';
import BulkChangeRequestModal from './modal/BulkChangeRequestModal.jsx';

const HISTORY_GUARD_STATE = { __iccStagingGuard: 1 };

const LATEST_SHEET_URL = 'http://127.0.0.1:8080/pinvest/sap-his-data/test';

/** BulkCreateChangeRequestsView — Django URL에 맞게 수정하세요. */
const BULK_CHANGE_REQUESTS_URL =
  'http://127.0.0.1:8080/pinvest/invest-change/bulk-requests/';

/** 백엔드 Mongo / 논리 테이블명에 맞게 조정 */
const TARGET_TABLE = 'sap_his_data';

const PRIMEKEY_COLUMN = 'prime-key';
const DEFAULT_EDIT_COLUMN = '담당자 성명';

const KEY_FIRST = ['구분0 (사업명)', '구분0 순번'];

/** sessionStorage(JSON)용 — Map 대신 [targetId, entry][] */
const COMMITTEE_CHANGE_STAGING_SESSION_KEY =
  'p-invest:invest-rev:committee-change-staging';

function entriesToStagedMap(entries) {
  const m = new Map();
  if (!Array.isArray(entries)) return m;
  for (const pair of entries) {
    if (
      Array.isArray(pair) &&
      pair.length === 2 &&
      (typeof pair[0] === 'string' || typeof pair[0] === 'number')
    ) {
      m.set(String(pair[0]), pair[1]);
    }
  }
  return m;
}

function getOrderedHeaders(headers) {
  if (!headers || headers.length === 0) return headers || [];
  const first = KEY_FIRST.filter((k) => headers.includes(k));
  const rest = headers.filter((k) => !KEY_FIRST.includes(k));
  return [...first, ...rest];
}

/** 최신 시트(행 배열) — HistoryPage와 동일 소스 */
function normalizeRows(raw) {
  const list = Array.isArray(raw)
    ? raw
    : (raw?.data ?? raw?.results ?? raw?.sap_his_data ?? [raw].filter(Boolean));
  return Array.isArray(list) ? list : [];
}

/** 행 고유 식별자 (prime-key 또는 인덱스) */
function getRowKey(row, index) {
  const pk = row?.[PRIMEKEY_COLUMN];
  if (pk != null && String(pk).trim() !== '') return String(pk);
  return `__idx_${index}`;
}

/** 셀 값 표시 (object → JSON, 길이 제한) */
function displayCell(v) {
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** 얕은 복사 (object → 복사본) */
function shallowRowCopy(row) {
  if (!row || typeof row !== 'object') return {};
  return { ...row };
}

/** 변경 후 데이터 생성 (얕은 복사 + 값 설정) */
function buildAfterData(beforeRow, columnKey, newValue) {
  const next = shallowRowCopy(beforeRow);
  next[columnKey] = newValue;
  return next;
}

/** 주요 상태 관리 및 데이터 흐름 제어 */
// Component 시작점
function InvestCommitteeChange() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [sheetError, setSheetError] = useState(null);

  /** target_id → 스테이징 항목 (sessionStorage 동기화) */
  const [stagedEntries, setStagedEntries] = useSessionStorage(
    COMMITTEE_CHANGE_STAGING_SESSION_KEY,
    [],
  );
  const stagedMap = useMemo(
    () => entriesToStagedMap(stagedEntries),
    [stagedEntries],
  );
  const setStagedMap = useCallback(
    (updater) => {
      setStagedEntries((prevArr) => {
        const prevMap = entriesToStagedMap(
          Array.isArray(prevArr) ? prevArr : [],
        );
        const nextMap = updater(prevMap);
        return Array.from(nextMap.entries());
      });
    },
    [setStagedEntries],
  );

  // 임시 보관 영역 관련 상태
  const hasStaging = stagedMap.size > 0;
  const [guardModal, setGuardModal] = useState(null); // null | "reload" | "back"
  const [clearStagingModalOpen, setClearStagingModalOpen] = useState(false);
  const [bulkSubmitModalOpen, setBulkSubmitModalOpen] = useState(false);
  const historyGuardActiveRef = useRef(false);
  const skipPopGuardRef = useRef(false);
  const pendingRouterBackRef = useRef(false);

  // 행 변경 모달 관련 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRowIndex, setModalRowIndex] = useState(null);
  const [editColumn, setEditColumn] = useState('');
  const [valueAfter, setValueAfter] = useState('');
  const [reason, setReason] = useState('');
  const [modalFormError, setModalFormError] = useState(null);

  // 변경 요청 관련 상태
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitMessage, setSubmitMessage] = useState(null);

  // 최신 시트 로드 관련 상태
  const fetchLatestSheet = useCallback(async () => {
    setLoadingSheet(true);
    setSheetError(null);
    try {
      const res = await axios.get(LATEST_SHEET_URL);
      const list = normalizeRows(res.data);
      setRows(list);
    } catch (err) {
      console.error('최신 시트 로드 오류:', err);
      setSheetError(
        err.response?.data?.message ??
          err.response?.data?.error ??
          err.message ??
          '최신 데이터를 불러오지 못했습니다.',
      );
      setRows([]);
    } finally {
      setLoadingSheet(false);
    }
  }, []);

  // 최신 시트 로드 효과
  useEffect(() => {
    fetchLatestSheet();
  }, [fetchLatestSheet]);

  // 히스토리 보호 관련 효과
  useEffect(() => {
    if (!hasStaging) {
      if (
        historyGuardActiveRef.current &&
        window.history.state &&
        typeof window.history.state === 'object' &&
        window.history.state.__iccStagingGuard === 1
      ) {
        historyGuardActiveRef.current = false;
        skipPopGuardRef.current = true;
        window.history.back();
        skipPopGuardRef.current = false;
      }
      return undefined;
    }

    if (!historyGuardActiveRef.current) {
      window.history.pushState(HISTORY_GUARD_STATE, '');
      historyGuardActiveRef.current = true;
    }

    const onPopState = () => {
      if (skipPopGuardRef.current) return;
      setGuardModal('back');
      window.history.pushState(HISTORY_GUARD_STATE, '');
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [hasStaging]);

  // 라우터 뒤로 가기 관련 효과
  useEffect(() => {
    if (!pendingRouterBackRef.current) return;
    if (stagedMap.size > 0) return;
    pendingRouterBackRef.current = false;
    navigate(-1);
  }, [stagedMap.size, navigate]);

  const headers = useMemo(() => {
    if (rows.length === 0) return [];
    return getOrderedHeaders(Object.keys(rows[0]));
  }, [rows]);

  const displayHeaders = useMemo(
    () => headers.filter((h) => h !== PRIMEKEY_COLUMN),
    [headers],
  );

  const tableHeaders = useMemo(
    () => displayHeaders.slice(0, 8),
    [displayHeaders],
  );

  const stagedIds = useMemo(() => new Set(stagedMap.keys()), [stagedMap]);

  const visibleRowEntries = useMemo(() => {
    return rows
      .map((row, index) => ({ row, index }))
      .filter(({ row, index }) => !stagedIds.has(getRowKey(row, index)));
  }, [rows, stagedIds]);

  const modalRow =
    modalRowIndex != null && rows[modalRowIndex] ? rows[modalRowIndex] : null;

  const valueBeforeModal = modalRow && editColumn ? modalRow[editColumn] : null;

  useEffect(() => {
    if (!modalOpen || !modalRow) return;
    const cols = displayHeaders;
    const nextCol =
      cols.includes(DEFAULT_EDIT_COLUMN) && cols.length > 0
        ? DEFAULT_EDIT_COLUMN
        : cols[0] || '';
    setEditColumn((prev) => (prev && cols.includes(prev) ? prev : nextCol));
  }, [modalOpen, modalRow, displayHeaders]);

  useEffect(() => {
    if (!modalOpen || !modalRow || !editColumn) {
      setValueAfter('');
      return;
    }
    setValueAfter(displayCell(modalRow[editColumn]));
  }, [modalOpen, modalRow, editColumn]);

  const openModalForIndex = useCallback(
    (index) => {
      const row = rows[index];
      if (!row) return;
      const id = getRowKey(row, index);
      if (stagedIds.has(id)) return;
      setReason('');
      setModalFormError(null);
      setSubmitError(null);
      setSubmitMessage(null);
      setModalRowIndex(index);
      setModalOpen(true);
    },
    [rows, stagedIds],
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setModalRowIndex(null);
    setModalFormError(null);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen, closeModal]);

  const confirmStage = useCallback(() => {
    if (modalRowIndex == null || !modalRow || !editColumn) return;
    const id = getRowKey(modalRow, modalRowIndex);
    const before = shallowRowCopy(modalRow);
    const after = buildAfterData(modalRow, editColumn, valueAfter);
    const beforeStr = displayCell(before[editColumn]);
    const afterStr = String(valueAfter ?? '');
    if (beforeStr === afterStr) {
      setModalFormError(
        '변경 후 값이 기존과 같습니다. 값을 수정하거나 취소하세요.',
      );
      return;
    }
    const r = reason.trim();
    if (!r) {
      setModalFormError('변경 사유를 입력해 주세요.');
      return;
    }
    setModalFormError(null);
    setStagedMap((prev) => {
      const next = new Map(prev);
      next.set(id, {
        targetId: id,
        beforeData: before,
        afterData: after,
        reason: r,
        editColumn,
        rowIndex: modalRowIndex,
      });
      return next;
    });
    closeModal();
  }, [
    modalRowIndex,
    modalRow,
    editColumn,
    valueAfter,
    reason,
    closeModal,
    setStagedMap,
  ]);

  const removeStaged = useCallback(
    (targetId) => {
      setStagedMap((prev) => {
        const next = new Map(prev);
        next.delete(targetId);
        return next;
      });
    },
    [setStagedMap],
  );

  const clearStaging = useCallback(() => {
    setStagedMap(() => new Map());
  }, [setStagedMap]);

  const requestSheetReload = useCallback(() => {
    if (stagedMap.size > 0) {
      setGuardModal('reload');
      return;
    }
    fetchLatestSheet();
  }, [stagedMap.size, fetchLatestSheet]);

  const confirmReloadAfterWarning = useCallback(() => {
    setGuardModal(null);
    clearStaging();
    fetchLatestSheet();
  }, [clearStaging, fetchLatestSheet]);

  const confirmBackAfterWarning = useCallback(() => {
    setGuardModal(null);
    pendingRouterBackRef.current = true;
    clearStaging();
  }, [clearStaging]);

  const dismissGuardModal = useCallback(() => {
    setGuardModal(null);
  }, []);

  const requestClearStaging = useCallback(() => {
    if (stagedMap.size === 0 || submitting) return;
    setClearStagingModalOpen(true);
  }, [stagedMap.size, submitting]);

  const dismissClearStagingModal = useCallback(() => {
    setClearStagingModalOpen(false);
  }, []);

  const confirmClearStaging = useCallback(() => {
    setClearStagingModalOpen(false);
    clearStaging();
  }, [clearStaging]);

  const dismissBulkSubmitModal = useCallback(() => {
    setBulkSubmitModalOpen(false);
  }, []);

  const canBulkSubmit = stagedMap.size > 0 && !submitting;

  // 일괄 변경 요청 수행 함수
  const performBulkSubmit = useCallback(async () => {
    if (!canBulkSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitMessage(null);
    const requests_list = Array.from(stagedMap.values()).map((s) => ({
      target_id: s.targetId,
      before_data: s.beforeData,
      after_data: s.afterData,
      reason: s.reason,
    }));
    const body = {
      target_table: TARGET_TABLE,
      requests: requests_list,
    };
    try {
      const res = await axios.post(BULK_CHANGE_REQUESTS_URL, body, {
        headers: { 'Content-Type': 'application/json' },
      });
      setSubmitMessage(
        res.data?.message ??
          `${res.data?.inserted_count ?? requests_list.length}건의 변경 요청이 접수되었습니다.`,
      );
      clearStaging();
      await fetchLatestSheet();
    } catch (err) {
      console.error('일괄 변경 요청 오류:', err);
      setSubmitError(
        err.response?.data?.error ??
          err.response?.data?.message ??
          err.message ??
          '변경 요청 API 호출에 실패했습니다. URL과 서버 응답을 확인하세요.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [canBulkSubmit, stagedMap, clearStaging, fetchLatestSheet]);

  const requestBulkSubmit = useCallback(() => {
    if (!canBulkSubmit) return;
    setBulkSubmitModalOpen(true);
  }, [canBulkSubmit]);

  const confirmBulkSubmit = useCallback(() => {
    setBulkSubmitModalOpen(false);
    void performBulkSubmit();
  }, [performBulkSubmit]);

  return (
    <>
      <div className='invest-rev-sub-page invest-rev-request'>
        <p className='invest-rev-sub-badge invest-rev-sub-badge--active'>
          투심위 변경
        </p>
        <p className='invest-rev-sub-desc' style={{ marginBottom: '1rem' }}>
          DB에 저장된 최신 SAP 이력 데이터에서 행을 선택해 담당자 등 필드를
          수정한 뒤, 임시 보관 영역에 쌓고 마지막에 한 번에 변경 요청을
          제출합니다.
        </p>

        <div className='invest-rev-request__toolbar'>
          <button
            type='button'
            className='invest-rev-request__btn invest-rev-request__btn--secondary'
            onClick={requestSheetReload}
            disabled={loadingSheet}
          >
            {loadingSheet ? '불러오는 중…' : '최신 데이터 다시 불러오기'}
          </button>
          <p className='invest-rev-request__hint'>
            GET: <code>{LATEST_SHEET_URL}</code>
            {' · '}
            POST: <code>{BULK_CHANGE_REQUESTS_URL}</code>
          </p>
        </div>

        {sheetError && (
          <div className='invest-rev-request__error' role='alert'>
            {sheetError}
          </div>
        )}
        {submitError && (
          <div className='invest-rev-request__error' role='alert'>
            {submitError}
          </div>
        )}
        {submitMessage && (
          <div className='invest-rev-request__success' role='status'>
            {submitMessage}
          </div>
        )}

        {loadingSheet && rows.length === 0 && !sheetError ? (
          <p className='invest-rev-request__loading'>
            데이터를 불러오는 중입니다…
          </p>
        ) : rows.length === 0 ? (
          <p className='invest-rev-request__empty'>
            표시할 행이 없습니다. API 응답 형식을 확인하세요.
          </p>
        ) : (
          <>
            <div className='invest-rev-request__layout'>
              <div className='invest-rev-request__panel'>
                <h2 className='invest-rev-request__panel-title'>
                  최신 SAP 이력 (행 더블클릭 또는 변경 버튼)
                </h2>
                <div className='invest-rev-request__table-wrap'>
                  <table className='invest-rev-request__table'>
                    <thead>
                      <tr>
                        {tableHeaders.map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                        {displayHeaders.length > 8 && <th>…</th>}
                        <th>변경</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRowEntries.map(({ row, index }) => {
                        const rk = getRowKey(row, index);
                        return (
                          <tr
                            key={rk}
                            onDoubleClick={() => openModalForIndex(index)}
                            title='더블클릭하여 변경'
                          >
                            {tableHeaders.map((h) => (
                              <td key={h}>{displayCell(row[h])}</td>
                            ))}
                            {displayHeaders.length > 8 && <td>…</td>}
                            <td>
                              <button
                                type='button'
                                className='icc-change-btn'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openModalForIndex(index);
                                }}
                              >
                                변경
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {visibleRowEntries.length === 0 && (
                  <p
                    className='invest-rev-request__empty'
                    style={{ marginTop: '0.75rem' }}
                  >
                    표시할 행이 모두 임시 보관 중입니다. 오른쪽 목록에서 항목을
                    제거하거나 제출을 완료하세요.
                  </p>
                )}
              </div>

              <div className='invest-rev-request__panel icc-staging-panel'>
                <h2 className='invest-rev-request__panel-title'>
                  임시 보관 (변경 요청 전)
                </h2>
                {stagedMap.size === 0 ? (
                  <p className='invest-rev-request__empty'>
                    변경할 행을 선택하면 이곳에 쌓입니다.
                  </p>
                ) : (
                  <div className='invest-rev-request__table-wrap'>
                    <table className='invest-rev-request__table'>
                      <thead>
                        <tr>
                          <th>{PRIMEKEY_COLUMN}</th>
                          <th>컬럼</th>
                          <th>변경 전</th>
                          <th>변경 후</th>
                          <th>사유</th>
                          <th aria-label='제거' />
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from(stagedMap.entries()).map(([id, entry]) => (
                          <tr key={id}>
                            <td>{displayCell(id)}</td>
                            <td>{entry.editColumn}</td>
                            <td>
                              {displayCell(
                                entry.beforeData?.[entry.editColumn],
                              )}
                            </td>
                            <td>
                              {displayCell(entry.afterData?.[entry.editColumn])}
                            </td>
                            <td
                              style={{
                                whiteSpace: 'normal',
                                maxWidth: '140px',
                              }}
                            >
                              {entry.reason}
                            </td>
                            <td>
                              <button
                                type='button'
                                className='icc-staging-remove'
                                onClick={() => removeStaged(id)}
                              >
                                제거
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className='icc-footer-actions'>
              <button
                type='button'
                className='invest-rev-request__btn invest-rev-request__btn--primary'
                disabled={!canBulkSubmit}
                onClick={requestBulkSubmit}
              >
                {submitting ? '전송 중…' : '변경 요청'}
              </button>
              <button
                type='button'
                className='invest-rev-request__btn invest-rev-request__btn--secondary'
                disabled={stagedMap.size === 0 || submitting}
                onClick={requestClearStaging}
              >
                임시 보관 비우기
              </button>
              <span className='invest-rev-request__hint'>
                대기 {stagedMap.size}건 · target_table:{' '}
                <code>{TARGET_TABLE}</code>
              </span>
            </div>
          </>
        )}
      </div>

      {modalOpen && modalRow && modalRowIndex != null ? (
        <div
          className='icc-modal-backdrop'
          role='presentation'
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className='icc-modal'
            role='dialog'
            aria-modal='true'
            aria-labelledby='icc-modal-title'
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 id='icc-modal-title' className='icc-modal-title'>
              행 변경
            </h2>
            <p className='icc-modal-sub'>
              기준 키: <strong>{getRowKey(modalRow, modalRowIndex)}</strong>
            </p>

            {modalFormError ? (
              <p className='icc-modal-error' role='alert'>
                {modalFormError}
              </p>
            ) : null}

            <div className='invest-rev-request__form-group'>
              <label className='invest-rev-request__label' htmlFor='icc-col'>
                변경할 컬럼
              </label>
              <select
                id='icc-col'
                className='invest-rev-request__select'
                value={editColumn}
                onChange={(e) => {
                  setEditColumn(e.target.value);
                  setModalFormError(null);
                }}
              >
                {displayHeaders.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div className='invest-rev-request__form-group'>
              <span className='invest-rev-request__label'>현재 값</span>
              <div className='invest-rev-request__readonly'>
                {displayCell(valueBeforeModal)}
              </div>
            </div>

            <div className='invest-rev-request__form-group'>
              <label className='invest-rev-request__label' htmlFor='icc-after'>
                변경할 값
              </label>
              <textarea
                id='icc-after'
                className='invest-rev-request__textarea'
                rows={3}
                value={valueAfter}
                onChange={(e) => {
                  setValueAfter(e.target.value);
                  setModalFormError(null);
                }}
                placeholder='새 값을 입력하세요'
              />
            </div>

            <div className='invest-rev-request__form-group'>
              <label className='invest-rev-request__label' htmlFor='icc-reason'>
                변경 사유 (필수)
              </label>
              <textarea
                id='icc-reason'
                className='invest-rev-request__textarea'
                rows={3}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setModalFormError(null);
                }}
                placeholder='예: 조직 개편에 따른 담당자 변경'
              />
            </div>

            <div className='icc-modal-actions'>
              <button
                type='button'
                className='invest-rev-request__btn invest-rev-request__btn--secondary'
                onClick={closeModal}
              >
                취소
              </button>
              <button
                type='button'
                className='invest-rev-request__btn invest-rev-request__btn--primary'
                onClick={confirmStage}
              >
                확인 · 임시 보관으로 이동
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <CancelModal
        open={guardModal === 'reload'}
        title='최신 데이터를 다시 불러올까요?'
        message='최신 SAP 이력을 다시 불러오면 지금 임시 보관 중인 변경 목록이 모두 삭제됩니다. 계속 진행할까요?'
        cancelLabel='머무르기'
        confirmLabel='다시 불러오기'
        onCancel={dismissGuardModal}
        onConfirm={confirmReloadAfterWarning}
      />
      <CancelModal
        open={guardModal === 'back'}
        title='이 페이지를 벗어날까요?'
        message='뒤로 가기를 완료하면 이 화면의 임시 보관 목록이 모두 삭제됩니다. 계속 진행할까요?'
        cancelLabel='머무르기'
        confirmLabel='뒤로 가기'
        onCancel={dismissGuardModal}
        onConfirm={confirmBackAfterWarning}
      />

      <ClearStagingModal
        open={clearStagingModalOpen}
        onCancel={dismissClearStagingModal}
        onConfirm={confirmClearStaging}
      />
      <BulkChangeRequestModal
        open={bulkSubmitModalOpen}
        onCancel={dismissBulkSubmitModal}
        onConfirm={confirmBulkSubmit}
      />
    </>
  );
}

export default InvestCommitteeChange;
