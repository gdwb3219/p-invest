import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useSessionStorage } from '../../../hooks/useCustomHooks';
import { useApiUrl } from '../../../contexts/ApiUrlContext';
import '../../../styles/pages/invest-rev/InvestRevRequest.css';
import '../../../styles/pages/invest-rev/InvestCommitteeChange.css';
import CancelModal from '../../invest-rev/modal/CancelModal.jsx';
import CommitteeSourceTablePanel from './components/CommitteeSourceTablePanel';
import CommitteeStagedTablePanel from './components/CommitteeStagedTablePanel';
import CommitteeApproveModal from './components/CommitteeApproveModal';
import CommitteeManualEntryModal from './components/CommitteeManualEntryModal';
import CommitteeCsvUploadModal from './components/CommitteeCsvUploadModal';
import {
  COMMITTEE_CREATE_LIST_PATH,
  COMMITTEE_APPROVAL_POST_PATH,
  COMMITTEE_STAGE_SESSION_KEY,
  normalizeRows,
  getRowKey,
  getPrimeKey,
  newManualRowKey,
  displayCell,
  getOrderedHeaders,
  buildCsvTemplate,
  parseCsvText,
} from './overviewUtils';

const INVEST_PROJECT_NAME_COL = '투자사업명';
const COMMITTEE_LIST_QUERY_KEY = 'committee_create_list';

function CommitteeOverviewPage() {
  const { API_URL } = useApiUrl();
  const COMMITTEE_CREATE_LIST_URL = `${API_URL}${COMMITTEE_CREATE_LIST_PATH}`;
  const COMMITTEE_APPROVAL_POST_URL = `${API_URL}${COMMITTEE_APPROVAL_POST_PATH}`;
  const queryClient = useQueryClient();

  const {
    data: rows = [],
    isFetching: loading,
    error: listError,
    refetch: refetchCommitteeList,
  } = useQuery({
    queryKey: [COMMITTEE_LIST_QUERY_KEY, COMMITTEE_CREATE_LIST_URL],
    queryFn: async () => {
      try {
        const res = await axios.get(COMMITTEE_CREATE_LIST_URL);
        return normalizeRows(res.data);
      } catch (err) {
        console.error('투심위 목록 조회 오류:', err);
        throw err;
      }
    },
  });

  const error = listError
    ? (listError.response?.data?.message ??
      listError.response?.data?.error ??
      listError.message ??
      '투심위 생성 목록을 불러오지 못했습니다.')
    : null;

  const [sourceSelectedKeys, setSourceSelectedKeys] = useState(() => new Set());
  const [stagedSelectedKeys, setStagedSelectedKeys] = useState(() => new Set());
  const [stagedRows, setStagedRows] = useSessionStorage(
    COMMITTEE_STAGE_SESSION_KEY,
    [],
  );

  const [submitError, setSubmitError] = useState(null);
  const [submitMessage, setSubmitMessage] = useState(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveReasons, setApproveReasons] = useState({});
  const [approveRequesterName, setApproveRequesterName] = useState('');
  const [approveValidationMessage, setApproveValidationMessage] =
    useState(null);
  const [manualItemModalOpen, setManualItemModalOpen] = useState(false);
  const [manualInsertAfterIndex, setManualInsertAfterIndex] = useState(null);
  const [manualDraftRows, setManualDraftRows] = useState([]);
  const [manualFormError, setManualFormError] = useState(null);
  const [manualFieldErrors, setManualFieldErrors] = useState({});
  const [csvUploadModalOpen, setCsvUploadModalOpen] = useState(false);
  const [csvUploadRows, setCsvUploadRows] = useState([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvDragOver, setCsvDragOver] = useState(false);
  const [clearStagingModalOpen, setClearStagingModalOpen] = useState(false);
  const [sourceInvestNameFilter, setSourceInvestNameFilter] = useState('');

  const sourceTableWrapRef = useRef(null);
  const stagedTableWrapRef = useRef(null);
  const syncingScrollRef = useRef(false);
  const dragStartIndexRef = useRef(null);
  const dragBaseSelectionRef = useRef(new Set());
  const isDraggingRef = useRef(false);
  const dragTableTypeRef = useRef(null); // "source" | "staged"
  const pendingManualFocusRef = useRef(null);
  const csvFileInputRef = useRef(null);

  const headers = useMemo(() => {
    const fromRows = rows.length > 0 ? Object.keys(rows[0]) : [];
    const fromStaged = (Array.isArray(stagedRows) ? stagedRows : []).flatMap(
      (e) => Object.keys(e?.row ?? {}),
    );
    const union = [...new Set([...fromRows, ...fromStaged])];
    if (union.length === 0) return [];
    return getOrderedHeaders(union);
  }, [rows, stagedRows]);

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

  const filteredSourceVisibleRows = useMemo(() => {
    const q = sourceInvestNameFilter.trim().toLowerCase();
    if (!q || !headers.includes(INVEST_PROJECT_NAME_COL)) return visibleRows;
    return visibleRows.filter(({ row }) =>
      String(row[INVEST_PROJECT_NAME_COL] ?? '')
        .toLowerCase()
        .includes(q),
    );
  }, [visibleRows, sourceInvestNameFilter, headers]);

  const syncSourceSelectedKeysWithRows = useCallback(() => {
    const currentKeys = new Set(
      filteredSourceVisibleRows.map(({ rowKey }) => rowKey),
    );
    setSourceSelectedKeys((prev) => {
      const next = new Set();
      prev.forEach((k) => {
        if (currentKeys.has(k)) next.add(k);
      });
      return next;
    });
  }, [filteredSourceVisibleRows]);

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

  useEffect(() => {
    setApproveReasons((prev) => {
      const next = {};
      (Array.isArray(stagedRows) ? stagedRows : []).forEach((entry, idx) => {
        const rowKey = String(entry?.rowKey ?? idx);
        next[rowKey] = prev[rowKey] ?? '';
      });
      return next;
    });
  }, [stagedRows]);

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
          : filteredSourceVisibleRows;
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
    [filteredSourceVisibleRows, stagedRows],
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
    setApproveModalOpen(false);
    setApproveValidationMessage(null);
    setApproveReasons({});
    setApproveRequesterName('');
    setManualItemModalOpen(false);
    setManualInsertAfterIndex(null);
    setManualDraftRows([]);
    setManualFormError(null);
    setManualFieldErrors({});
    setCsvUploadModalOpen(false);
    setCsvUploadRows([]);
    setCsvFileName('');
    setCsvDragOver(false);
    setClearStagingModalOpen(false);
  }, [setStagedRows]);

  const approveMutation = useMutation({
    mutationFn: async (payload) => {
      await axios.post(COMMITTEE_APPROVAL_POST_URL, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      return payload.requests.length;
    },
    onSuccess: (requestCount) => {
      setSubmitMessage(`${requestCount}건 승인 요청이 저장되었습니다.`);
      setApproveModalOpen(false);
      clearStaging();
      void queryClient.invalidateQueries({
        queryKey: [COMMITTEE_LIST_QUERY_KEY],
      });
    },
    onError: (err) => {
      console.error('승인 요청 저장 오류:', err);
      setSubmitError(
        err.response?.data?.error ??
          err.response?.data?.message ??
          err.message ??
          '승인 요청 저장에 실패했습니다.',
      );
    },
  });

  const submitting = approveMutation.isPending;

  const closeCsvUploadModal = useCallback(() => {
    setCsvUploadModalOpen(false);
    setCsvUploadRows([]);
    setCsvFileName('');
    setCsvDragOver(false);
  }, []);

  const createEmptyManualDraftRow = useCallback(() => {
    const row = {};
    headers.forEach((h) => {
      row[h] = '';
    });
    return row;
  }, [headers]);

  const openManualItemModal = useCallback(
    (insertAfterIndex = null) => {
      if (headers.length === 0) return;
      setManualItemModalOpen(true);
      setManualInsertAfterIndex(
        typeof insertAfterIndex === 'number' ? insertAfterIndex : null,
      );
      setManualFormError(null);
      setManualFieldErrors({});
      setManualDraftRows([createEmptyManualDraftRow()]);
    },
    [headers.length, createEmptyManualDraftRow],
  );

  const closeManualItemModal = useCallback(() => {
    setManualItemModalOpen(false);
    setManualInsertAfterIndex(null);
    setManualDraftRows([]);
    setManualFormError(null);
    setManualFieldErrors({});
  }, []);

  const handleManualDraftChange = useCallback((rowIndex, col, value) => {
    setManualDraftRows((prev) =>
      prev.map((row, idx) =>
        idx === rowIndex ? { ...row, [col]: value } : row,
      ),
    );
    setManualFieldErrors((prev) => {
      const key = `${rowIndex}:${col}`;
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const addManualDraftRow = useCallback(() => {
    if (headers.length === 0) return;
    setManualDraftRows((prev) => [...prev, createEmptyManualDraftRow()]);
  }, [headers.length, createEmptyManualDraftRow]);

  const handleManualCellKeyDown = useCallback(
    (e, rowIndex, colIndex) => {
      if (headers.length === 0) return;
      const isLastCol = colIndex === headers.length - 1;
      if (!isLastCol) return;
      if (e.key !== 'Enter' && e.key !== 'Tab') return;
      e.preventDefault();
      const nextRowIndex = rowIndex + 1;
      const focusColIndex = headers.length > 1 ? 1 : 0;
      pendingManualFocusRef.current = {
        rowIndex: nextRowIndex,
        colIndex: focusColIndex,
      };
      setManualDraftRows((prev) => [...prev, createEmptyManualDraftRow()]);
    },
    [headers.length, createEmptyManualDraftRow],
  );

  useEffect(() => {
    if (!manualItemModalOpen) return;
    const pending = pendingManualFocusRef.current;
    if (!pending) return;
    const focusId = `committee-manual-cell-${pending.rowIndex}-${pending.colIndex}`;
    requestAnimationFrame(() => {
      const el = document.getElementById(focusId);
      if (el) el.focus();
      pendingManualFocusRef.current = null;
    });
  }, [manualDraftRows, manualItemModalOpen]);

  const saveManualItemToStaging = useCallback(() => {
    if (headers.length === 0) return;
    const nextErrors = {};
    const rowsToInsert = [];

    manualDraftRows.forEach((draftRow, rowIndex) => {
      const values = headers.map((h) => String(draftRow?.[h] ?? '').trim());
      const hasAnyValue = values.some((v) => v.length > 0);
      if (!hasAnyValue) return;
      const row = {};
      let hasMissing = false;
      headers.forEach((h, colIndex) => {
        const value = values[colIndex];
        row[h] = value;
        if (!value) {
          hasMissing = true;
          nextErrors[`${rowIndex}:${h}`] = true;
        }
      });
      if (!hasMissing) rowsToInsert.push(row);
    });

    if (rowsToInsert.length === 0) {
      setManualFormError('최소 1개 행의 모든 항목을 입력해주세요.');
      return;
    }

    if (Object.keys(nextErrors).length > 0) {
      setManualFieldErrors(nextErrors);
      setManualFormError('입력 중인 행의 빈 칸을 모두 작성해주세요.');
      return;
    }

    setStagedRows((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const additions = rowsToInsert.map((row) => ({
        rowKey: newManualRowKey(),
        row,
        isManual: true,
      }));
      let pos = list.length;
      if (
        manualInsertAfterIndex !== null &&
        manualInsertAfterIndex !== undefined &&
        Number.isInteger(manualInsertAfterIndex)
      ) {
        if (manualInsertAfterIndex < 0) pos = 0;
        else pos = Math.min(manualInsertAfterIndex + 1, list.length);
      }
      return [...list.slice(0, pos), ...additions, ...list.slice(pos)];
    });
    setSubmitError(null);
    setSubmitMessage(null);
    closeManualItemModal();
    setManualDraftRows([]);
  }, [
    headers,
    manualDraftRows,
    manualInsertAfterIndex,
    setStagedRows,
    closeManualItemModal,
  ]);

  const removeStagedRow = useCallback(
    (rowKey) => {
      setStagedRows((prev) =>
        (Array.isArray(prev) ? prev : []).filter(
          (entry, idx) => String(entry?.rowKey ?? idx) !== rowKey,
        ),
      );
      setStagedSelectedKeys((prev) => {
        const next = new Set(prev);
        next.delete(rowKey);
        return next;
      });
      setSubmitError(null);
      setSubmitMessage(null);
    },
    [setStagedRows],
  );

  const openCsvUploadModal = useCallback(() => {
    if (headers.length === 0) return;
    setCsvUploadModalOpen(true);
    setCsvUploadRows([]);
    setCsvFileName('');
    setCsvDragOver(false);
  }, [headers.length]);

  const downloadCsvTemplate = useCallback(() => {
    if (headers.length === 0) return;
    const content = buildCsvTemplate(headers);
    const blob = new Blob(['\uFEFF', content], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'committee_staging_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [headers]);

  const parseCsvFileToRows = useCallback(
    async (file) => {
      if (!file || headers.length === 0) return false;
      try {
        // 에러 발생 추정 지점
        const text = await file.text();

        // 변경 해보자
        // // 인코딩 방식 변경 1
        // const buffer = await file.arrayBuffer();

        // const decoder = new TextDecoder('euc-kr');
        // const text = decoder.decode(buffer);

        // 스마트한 디코딩 로직 예시 2
        // const buffer = await file.arrayBuffer();
        // let text = new TextDecoder('utf-8').decode(buffer);

        // // utf-8로 읽었는데 글자가 깨진 기호()가 포함되어 있다면, euc-kr로 다시 읽기
        // if (text.includes('')) {
        //   text = new TextDecoder('euc-kr').decode(buffer);
        // }

        const matrix = parseCsvText(text);
        if (matrix.length < 2) throw new Error('empty');
        const csvHeaders = matrix[0].map((v) => String(v ?? '').trim());
        const headerMatched =
          csvHeaders.length === headers.length &&
          headers.every((h, idx) => csvHeaders[idx] === h);
        if (!headerMatched) throw new Error('header mismatch');

        const parsedRows = [];
        for (let i = 1; i < matrix.length; i += 1) {
          const line = matrix[i];
          if (line.length !== headers.length)
            throw new Error('column mismatch');
          const values = line.map((v) => String(v ?? '').trim());
          const hasAny = values.some((v) => v.length > 0);
          if (!hasAny) continue;
          if (values.some((v) => v.length === 0)) throw new Error('empty cell');
          const row = {};
          headers.forEach((h, idx) => {
            row[h] = values[idx];
          });
          parsedRows.push(row);
        }
        if (parsedRows.length === 0) throw new Error('no rows');
        setCsvUploadRows(parsedRows);
        setCsvFileName(file.name ?? '');
        return true;
      } catch (err) {
        console.error('CSV 파일 파싱 오류:', err);
        setCsvUploadRows([]);
        setCsvFileName('');
        alert('포맷이 맞지 않습니다.');
        return false;
      }
    },
    [headers],
  );

  const uploadCsvRowsToStaging = useCallback(() => {
    if (!csvUploadRows.length) return;
    setStagedRows((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const additions = csvUploadRows.map((row) => ({
        rowKey: newManualRowKey(),
        row,
        isManual: true,
      }));
      return [...list, ...additions];
    });
    setSubmitError(null);
    setSubmitMessage(null);
    closeCsvUploadModal();
  }, [csvUploadRows, setStagedRows, closeCsvUploadModal]);

  const stagedColCount = headers.length + 2;

  const missingApproveReasonKeys = useMemo(
    () =>
      stagedRows
        .map((entry, idx) => String(entry?.rowKey ?? idx))
        .filter((rowKey) => !(approveReasons[rowKey] ?? '').trim()),
    [stagedRows, approveReasons],
  );

  const canSubmitApprove =
    stagedRows.length > 0 &&
    missingApproveReasonKeys.length === 0 &&
    approveRequesterName.trim().length > 0 &&
    !submitting;

  const openApproveModal = useCallback(() => {
    if (stagedRows.length === 0 || submitting) return;
    setApproveModalOpen(true);
    setApproveValidationMessage(null);
    setApproveRequesterName('');
    setSubmitError(null);
    setSubmitMessage(null);
  }, [stagedRows.length, submitting]);

  const closeApproveModal = useCallback(() => {
    if (submitting) return;
    setApproveModalOpen(false);
    setApproveValidationMessage(null);
    setApproveRequesterName('');
  }, [submitting]);

  const handleApproveReasonChange = useCallback((rowKey, value) => {
    setApproveReasons((prev) => ({ ...prev, [rowKey]: value }));
  }, []);

  // 투심위 승인 요청
  const handleApproveRequest = useCallback(() => {
    if (stagedRows.length === 0 || submitting) return;
    if (missingApproveReasonKeys.length > 0) {
      setApproveValidationMessage('요청 사유를 입력해주세요.');
      return;
    }
    if (!approveRequesterName.trim()) {
      setApproveValidationMessage('승인 요청자를 입력해주세요.');
      return;
    }
    setSubmitError(null);
    setSubmitMessage(null);
    setApproveValidationMessage(null);
    const trimmedRequester = approveRequesterName.trim();
    const payload = {
      requests: stagedRows.map((entry) => ({
        prime_key: getPrimeKey(entry?.row, entry?.rowKey),
        row_key: entry.rowKey,
        row_data: entry.row,
        approve_reason: (approveReasons[String(entry?.rowKey)] ?? '').trim(),
        approve_requester: trimmedRequester,
      })),
    };
    approveMutation.mutate(payload);
  }, [
    stagedRows,
    submitting,
    missingApproveReasonKeys.length,
    approveReasons,
    approveRequesterName,
    approveMutation,
  ]);

  return (
    <div className='invest-rev-sub-page invest-rev-request'>
      <p className='invest-rev-sub-badge invest-rev-sub-badge--active'>
        현재 탭: 투심위 리스트 생성
      </p>
      <p className='invest-rev-sub-desc' style={{ marginBottom: '1rem' }}>
        양쪽 테이블에서 CTRL + 클릭/드래그로 다중 선택 후, 가운데 화살표
        버튼으로 임시 저장 항목을 이동할 수 있습니다.
      </p>

      <div className='invest-rev-request__toolbar'>
        <button
          type='button'
          className='invest-rev-request__btn invest-rev-request__btn--secondary'
          onClick={() => void refetchCommitteeList()}
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
        <CommitteeSourceTablePanel
          headers={headers}
          visibleRows={filteredSourceVisibleRows}
          sourceUnfilteredCount={visibleRows.length}
          sourceInvestNameFilter={sourceInvestNameFilter}
          setSourceInvestNameFilter={setSourceInvestNameFilter}
          investProjectNameColumn={INVEST_PROJECT_NAME_COL}
          hasInvestProjectColumn={headers.includes(INVEST_PROJECT_NAME_COL)}
          sourceSelectedKeys={sourceSelectedKeys}
          sourceTableWrapRef={sourceTableWrapRef}
          handleSourceTableScroll={handleSourceTableScroll}
          beginDragSelection={beginDragSelection}
          updateDragSelection={updateDragSelection}
          endDragSelection={endDragSelection}
          displayCell={displayCell}
        />

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

        <CommitteeStagedTablePanel
          headers={headers}
          stagedRows={stagedRows}
          stagedSelectedKeys={stagedSelectedKeys}
          stagedColCount={stagedColCount}
          stagedTableWrapRef={stagedTableWrapRef}
          handleStagedTableScroll={handleStagedTableScroll}
          beginDragSelection={beginDragSelection}
          updateDragSelection={updateDragSelection}
          endDragSelection={endDragSelection}
          removeStagedRow={removeStagedRow}
          openManualItemModal={openManualItemModal}
          displayCell={displayCell}
        />
      </div>

      <div
        className='invest-rev-request__toolbar'
        style={{ marginTop: '1rem' }}
      >
        <button
          type='button'
          className='invest-rev-request__btn invest-rev-request__btn--primary'
          onClick={openApproveModal}
          disabled={stagedRows.length === 0 || submitting}
        >
          {submitting ? '요청 전송 중…' : '투심위 승인요청'}
        </button>
        <button
          type='button'
          className='invest-rev-request__btn invest-rev-request__btn--secondary'
          onClick={() => setClearStagingModalOpen(true)}
          disabled={stagedRows.length === 0 || submitting}
        >
          투심위 리스트 전체 삭제
        </button>
        <button
          type='button'
          className='invest-rev-request__btn invest-rev-request__btn--secondary'
          style={{ marginLeft: 'auto' }}
          onClick={downloadCsvTemplate}
          disabled={headers.length === 0}
        >
          양식 다운로드
        </button>
        <button
          type='button'
          className='invest-rev-request__btn invest-rev-request__btn--secondary'
          onClick={openCsvUploadModal}
          disabled={headers.length === 0}
        >
          양식 업로드
        </button>
      </div>

      <CommitteeApproveModal
        approveModalOpen={approveModalOpen}
        submitting={submitting}
        approveValidationMessage={approveValidationMessage}
        missingApproveReasonKeys={missingApproveReasonKeys}
        closeApproveModal={closeApproveModal}
        stagedRows={stagedRows}
        approveReasons={approveReasons}
        handleApproveReasonChange={handleApproveReasonChange}
        approveRequesterName={approveRequesterName}
        setApproveRequesterName={setApproveRequesterName}
        canSubmitApprove={canSubmitApprove}
        setApproveValidationMessage={setApproveValidationMessage}
        handleApproveRequest={handleApproveRequest}
        displayCell={displayCell}
      />

      <CommitteeManualEntryModal
        manualItemModalOpen={manualItemModalOpen}
        manualFormError={manualFormError}
        headers={headers}
        manualDraftRows={manualDraftRows}
        manualFieldErrors={manualFieldErrors}
        handleManualDraftChange={handleManualDraftChange}
        handleManualCellKeyDown={handleManualCellKeyDown}
        addManualDraftRow={addManualDraftRow}
        closeManualItemModal={closeManualItemModal}
        saveManualItemToStaging={saveManualItemToStaging}
      />

      <CommitteeCsvUploadModal
        open={csvUploadModalOpen}
        csvFileName={csvFileName}
        csvUploadReadyCount={csvUploadRows.length}
        csvDragOver={csvDragOver}
        setCsvDragOver={setCsvDragOver}
        onClose={closeCsvUploadModal}
        onPickFile={() => csvFileInputRef.current?.click()}
        onDropFile={parseCsvFileToRows}
        onUpload={uploadCsvRowsToStaging}
      />

      <input
        ref={csvFileInputRef}
        type='file'
        accept='.csv,text/csv'
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void parseCsvFileToRows(file);
          e.target.value = '';
        }}
      />

      <CancelModal
        open={clearStagingModalOpen}
        title='투심위 리스트를 모두 삭제할까요?'
        message='투심위 생성 리스트(임시 보관)에 있는 모든 항목이 삭제됩니다. 계속 진행할까요?'
        cancelLabel='뒤로 가기'
        confirmLabel='전체 삭제'
        onCancel={() => setClearStagingModalOpen(false)}
        onConfirm={clearStaging}
      />
    </div>
  );
}

export default CommitteeOverviewPage;
