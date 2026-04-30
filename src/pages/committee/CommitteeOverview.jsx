import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useSessionStorage } from '../../hooks/useCustomHooks';
import { useApiUrl } from '../../contexts/ApiUrlContext';
import '../../styles/pages/invest-rev/InvestRevRequest.css';

const COMMITTEE_CREATE_LIST_PATH = '/committee/create-list/';
const COMMITTEE_APPROVAL_POST_PATH = '/committee/create-list/';
const COMMITTEE_STAGE_SESSION_KEY = 'p-invest:committee:overview-staging';
const KEY_FIRST = ['구분0 (사업명)', '구분0 순번'];

function normalizeRows(raw) {
  const list = Array.isArray(raw) ? raw : (raw?.data ?? raw?.results ?? []);
  return Array.isArray(list) ? list : [];
}

function getRowKey(row, index) {
  const key =
    row?.['prime-key'] ??
    row?.prime_key ??
    row?.id ??
    row?._id ??
    row?.target_id ??
    index;
  return String(key);
}

function displayCell(v) {
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function getOrderedHeaders(headers) {
  if (!headers || headers.length === 0) return headers || [];
  const first = KEY_FIRST.filter((k) => headers.includes(k));
  const rest = headers.filter((k) => !KEY_FIRST.includes(k));
  return [...first, ...rest];
}

function CommitteeOverview() {
  const { API_URL } = useApiUrl();
  const COMMITTEE_CREATE_LIST_URL = `${API_URL}${COMMITTEE_CREATE_LIST_PATH}`;
  const COMMITTEE_APPROVAL_POST_URL = `${API_URL}${COMMITTEE_APPROVAL_POST_PATH}`;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [sourceSelectedKeys, setSourceSelectedKeys] = useState(() => new Set());
  const [stagedSelectedKeys, setStagedSelectedKeys] = useState(() => new Set());
  const [stagedRows, setStagedRows] = useSessionStorage(
    COMMITTEE_STAGE_SESSION_KEY,
    [],
  );

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitMessage, setSubmitMessage] = useState(null);
  const sourceTableWrapRef = useRef(null);
  const stagedTableWrapRef = useRef(null);
  const syncingScrollRef = useRef(false);
  const dragStartIndexRef = useRef(null);
  const dragBaseSelectionRef = useRef(new Set());
  const isDraggingRef = useRef(false);
  const dragTableTypeRef = useRef(null); // "source" | "staged"

  const fetchCommitteeList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(COMMITTEE_CREATE_LIST_URL);
      setRows(normalizeRows(res.data));
    } catch (err) {
      console.error('투심위 목록 조회 오류:', err);
      setError(
        err.response?.data?.message ??
          err.response?.data?.error ??
          err.message ??
          '투심위 생성 목록을 불러오지 못했습니다.',
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [COMMITTEE_CREATE_LIST_URL]);

  useEffect(() => {
    void fetchCommitteeList();
  }, [fetchCommitteeList]);

  const headers = useMemo(() => {
    if (rows.length === 0) return [];
    return getOrderedHeaders(Object.keys(rows[0]));
  }, [rows]);

  const stagedKeySet = useMemo(() => {
    const s = new Set();
    stagedRows.forEach((entry, idx) => {
      s.add(String(entry?.rowKey ?? entry?.id ?? idx));
    });
    return s;
  }, [stagedRows]);

  const visibleRows = useMemo(
    () =>
      rows
        .map((row, idx) => ({
          row,
          rowKey: getRowKey(row, idx),
          sourceIndex: idx,
        }))
        .filter(({ rowKey }) => !stagedKeySet.has(rowKey)),
    [rows, stagedKeySet],
  );

  const syncSourceSelectedKeysWithRows = useCallback(() => {
    const currentKeys = new Set(visibleRows.map(({ rowKey }) => rowKey));
    setSourceSelectedKeys((prev) => {
      const next = new Set();
      prev.forEach((k) => {
        if (currentKeys.has(k)) next.add(k);
      });
      return next;
    });
  }, [visibleRows]);

  useEffect(() => {
    syncSourceSelectedKeysWithRows();
  }, [syncSourceSelectedKeysWithRows]);

  const syncStagedSelectedKeysWithRows = useCallback(() => {
    const currentKeys = new Set(
      (Array.isArray(stagedRows) ? stagedRows : []).map((entry, idx) =>
        String(entry?.rowKey ?? idx),
      ),
    );
    setStagedSelectedKeys((prev) => {
      const next = new Set();
      prev.forEach((k) => {
        if (currentKeys.has(k)) next.add(k);
      });
      return next;
    });
  }, [stagedRows]);

  useEffect(() => {
    syncStagedSelectedKeysWithRows();
  }, [syncStagedSelectedKeysWithRows]);

  const toggleSelection = useCallback((rowKey, ctrlPressed, tableType) => {
    const setFn =
      tableType === 'staged' ? setStagedSelectedKeys : setSourceSelectedKeys;
    setFn((prev) => {
      if (!ctrlPressed) return new Set([rowKey]);
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  }, []);

  const applyRangeSelection = useCallback(
    (startIndex, endIndex, additive, tableType) => {
      const targetRows =
        tableType === 'staged'
          ? (Array.isArray(stagedRows) ? stagedRows : []).map((entry, idx) => ({
              rowKey: String(entry?.rowKey ?? idx),
            }))
          : visibleRows;
      const min = Math.min(startIndex, endIndex);
      const max = Math.max(startIndex, endIndex);
      const rangeKeys = new Set(
        targetRows.slice(min, max + 1).map(({ rowKey }) => rowKey),
      );
      const next = additive
        ? new Set([...dragBaseSelectionRef.current, ...rangeKeys])
        : rangeKeys;
      if (tableType === 'staged') setStagedSelectedKeys(next);
      else setSourceSelectedKeys(next);
    },
    [visibleRows, stagedRows],
  );

  const beginDragSelection = useCallback(
    (e, rowKey, rowIndex, tableType) => {
      e.preventDefault();
      const additive = e.ctrlKey;
      dragTableTypeRef.current = tableType;
      dragStartIndexRef.current = rowIndex;
      const currentSelected =
        tableType === 'staged' ? stagedSelectedKeys : sourceSelectedKeys;
      dragBaseSelectionRef.current = additive
        ? new Set(currentSelected)
        : new Set();
      isDraggingRef.current = true;
      applyRangeSelection(rowIndex, rowIndex, additive, tableType);
      setSubmitError(null);
      setSubmitMessage(null);
      if (!additive && !e.shiftKey) {
        toggleSelection(rowKey, false, tableType);
      }
    },
    [
      applyRangeSelection,
      sourceSelectedKeys,
      stagedSelectedKeys,
      toggleSelection,
    ],
  );

  const updateDragSelection = useCallback(
    (e, rowIndex) => {
      if (!isDraggingRef.current || dragStartIndexRef.current == null) return;
      if (!dragTableTypeRef.current) return;
      applyRangeSelection(
        dragStartIndexRef.current,
        rowIndex,
        e.ctrlKey,
        dragTableTypeRef.current,
      );
    },
    [applyRangeSelection],
  );

  const endDragSelection = useCallback(() => {
    isDraggingRef.current = false;
    dragStartIndexRef.current = null;
    dragTableTypeRef.current = null;
  }, []);

  useEffect(() => {
    const onWindowMouseUp = () => endDragSelection();
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => window.removeEventListener('mouseup', onWindowMouseUp);
  }, [endDragSelection]);

  const handleSourceTableScroll = useCallback((e) => {
    if (syncingScrollRef.current) return;
    const stagedEl = stagedTableWrapRef.current;
    if (!stagedEl) return;
    syncingScrollRef.current = true;
    stagedEl.scrollLeft = e.currentTarget.scrollLeft;
    requestAnimationFrame(() => {
      syncingScrollRef.current = false;
    });
  }, []);

  const handleStagedTableScroll = useCallback((e) => {
    if (syncingScrollRef.current) return;
    const sourceEl = sourceTableWrapRef.current;
    if (!sourceEl) return;
    syncingScrollRef.current = true;
    sourceEl.scrollLeft = e.currentTarget.scrollLeft;
    requestAnimationFrame(() => {
      syncingScrollRef.current = false;
    });
  }, []);

  const moveRowsToStaging = useCallback(
    (targetKeys) => {
      if (!targetKeys || targetKeys.size === 0) return;
      const selectedEntries = rows
        .map((row, idx) => ({ row, rowKey: getRowKey(row, idx) }))
        .filter(({ rowKey }) => targetKeys.has(rowKey));
      if (selectedEntries.length === 0) return;

      setStagedRows((prev) => {
        const prevList = Array.isArray(prev) ? prev : [];
        const prevKeySet = new Set(
          prevList.map((entry, idx) => String(entry?.rowKey ?? idx)),
        );
        const additions = selectedEntries.filter(
          ({ rowKey }) => !prevKeySet.has(rowKey),
        );
        if (additions.length === 0) return prevList;
        return [...prevList, ...additions];
      });

      setSourceSelectedKeys(() => new Set());
      setSubmitError(null);
      setSubmitMessage(null);
    },
    [rows, setStagedRows],
  );

  const moveRowsToSource = useCallback(
    (targetKeys) => {
      if (!targetKeys || targetKeys.size === 0) return;
      setStagedRows((prev) =>
        (Array.isArray(prev) ? prev : []).filter(
          (entry, idx) => !targetKeys.has(String(entry?.rowKey ?? idx)),
        ),
      );
      setStagedSelectedKeys(() => new Set());
      setSubmitError(null);
      setSubmitMessage(null);
    },
    [setStagedRows],
  );

  const clearStaging = useCallback(() => {
    setStagedRows([]);
  }, [setStagedRows]);

  const handleApproveRequest = useCallback(async () => {
    if (stagedRows.length === 0 || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitMessage(null);
    try {
      const payload = {
        requests: stagedRows.map((entry) => ({
          row_key: entry.rowKey,
          row_data: entry.row,
        })),
      };
      await axios.post(COMMITTEE_APPROVAL_POST_URL, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      setSubmitMessage(`${stagedRows.length}건 승인 요청이 저장되었습니다.`);
      clearStaging();
    } catch (err) {
      console.error('승인 요청 저장 오류:', err);
      setSubmitError(
        err.response?.data?.error ??
          err.response?.data?.message ??
          err.message ??
          '승인 요청 저장에 실패했습니다.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [stagedRows, submitting, COMMITTEE_APPROVAL_POST_URL, clearStaging]);

  return (
    <div className='invest-rev-sub-page invest-rev-request'>
      <p className='invest-rev-sub-badge invest-rev-sub-badge--active'>
        현재 탭: 투심위 개요
      </p>
      <p className='invest-rev-sub-desc' style={{ marginBottom: '1rem' }}>
        양쪽 테이블에서 CTRL + 클릭/드래그로 다중 선택 후, 가운데 화살표
        버튼으로 임시 저장 항목을 이동할 수 있습니다.
      </p>

      <div className='invest-rev-request__toolbar'>
        <button
          type='button'
          className='invest-rev-request__btn invest-rev-request__btn--secondary'
          onClick={() => void fetchCommitteeList()}
          disabled={loading}
        >
          {loading ? '불러오는 중…' : '목록 새로고침'}
        </button>
        <p className='invest-rev-request__hint'>
          GET: <code>{COMMITTEE_CREATE_LIST_URL}</code>
          {' · '}POST: <code>{COMMITTEE_APPROVAL_POST_URL}</code>
        </p>
      </div>

      {error && (
        <div className='invest-rev-request__error' role='alert'>
          {error}
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '1rem',
          alignItems: 'stretch',
        }}
      >
        <div className='invest-rev-request__panel'>
          <h2 className='invest-rev-request__panel-title'>
            투심위 대상 목록 (CTRL + 클릭 다중 선택)
          </h2>
          {visibleRows.length === 0 ? (
            <p className='invest-rev-request__empty'>
              표시할 생성 목록이 없습니다. (이동된 항목 제외)
            </p>
          ) : (
            <>
              <div
                className='invest-rev-request__table-wrap'
                ref={sourceTableWrapRef}
                onScroll={handleSourceTableScroll}
              >
                <table className='invest-rev-request__table'>
                  <thead>
                    <tr>
                      <th>#</th>
                      {headers.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map(({ row, rowKey }, idx) => {
                      const selected = sourceSelectedKeys.has(rowKey);
                      return (
                        <tr
                          key={rowKey}
                          className={
                            selected ? 'invest-rev-request__row--selected' : ''
                          }
                          onMouseDown={(e) =>
                            beginDragSelection(e, rowKey, idx, 'source')
                          }
                          onMouseEnter={(e) => updateDragSelection(e, idx)}
                          onMouseUp={endDragSelection}
                          title='CTRL + 클릭으로 다중 선택'
                        >
                          <td>{idx + 1}</td>
                          {headers.map((h) => (
                            <td key={h}>{displayCell(row[h])}</td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '0.5rem',
            }}
          >
            <button
              type='button'
              className='invest-rev-request__btn invest-rev-request__btn--primary'
              onClick={() => moveRowsToStaging(sourceSelectedKeys)}
              disabled={sourceSelectedKeys.size === 0}
              title='선택 항목을 아래 임시 저장소로 이동'
            >
              ▼
            </button>
            <button
              type='button'
              className='invest-rev-request__btn invest-rev-request__btn--secondary'
              onClick={() => moveRowsToSource(stagedSelectedKeys)}
              disabled={stagedSelectedKeys.size === 0}
              title='선택 항목을 위 원본 목록으로 복귀'
            >
              ▲
            </button>
          </div>
        </div>

        <div className='invest-rev-request__panel'>
          <h2 className='invest-rev-request__panel-title'>
            투심위 생성 리스트
          </h2>
          {stagedRows.length === 0 ? (
            <p className='invest-rev-request__empty'>
              투자 심의 위원회 추가 리스트가 없습니다.
            </p>
          ) : (
            <div
              className='invest-rev-request__table-wrap'
              ref={stagedTableWrapRef}
              onScroll={handleStagedTableScroll}
            >
              <table className='invest-rev-request__table'>
                <thead>
                  <tr>
                    <th>#</th>
                    {headers.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stagedRows.map((entry, idx) => {
                    const rowKey = String(entry?.rowKey ?? idx);
                    const row = entry?.row ?? {};
                    const selected = stagedSelectedKeys.has(rowKey);
                    return (
                      <tr
                        key={rowKey}
                        className={
                          selected ? 'invest-rev-request__row--selected' : ''
                        }
                        onMouseDown={(e) =>
                          beginDragSelection(e, rowKey, idx, 'staged')
                        }
                        onMouseEnter={(e) => updateDragSelection(e, idx)}
                        onMouseUp={endDragSelection}
                        title='CTRL + 클릭으로 다중 선택'
                      >
                        <td>{idx + 1}</td>
                        {headers.map((h) => (
                          <td key={h}>{displayCell(row[h])}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <div
        className='invest-rev-request__toolbar'
        style={{ marginTop: '1rem' }}
      >
        <button
          type='button'
          className='invest-rev-request__btn invest-rev-request__btn--primary'
          onClick={() => void handleApproveRequest()}
          disabled={stagedRows.length === 0 || submitting}
        >
          {submitting ? '요청 전송 중…' : '투심위 승인요청'}
        </button>
        <button
          type='button'
          className='invest-rev-request__btn invest-rev-request__btn--secondary'
          onClick={clearStaging}
          disabled={stagedRows.length === 0 || submitting}
        >
          투심위 리스트 전체 삭제
        </button>
      </div>
    </div>
  );
}

export default CommitteeOverview;
