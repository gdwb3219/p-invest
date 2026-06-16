import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import RevSelector from '../components/rev-compare/RevSelector';
import { useApiUrl } from '../stores';
import '../styles/pages/TestPage.css';

// "BizName", "BizNum"을 항상 왼쪽 열로 두기 위한 헤더 정렬 (컴포넌트 외부에서 상수로 사용)
const KEY_FIRST = ['구분0 (사업명)', '구분0 순번'];
const getOrderedHeaders = (headers) => {
  if (!headers || headers.length === 0) return headers || [];
  const first = KEY_FIRST.filter((k) => headers.includes(k));
  const rest = headers.filter((k) => !KEY_FIRST.includes(k));
  return [...first, ...rest];
};

const createDummyRow = (headers) => {
  const row = {};
  headers.forEach((h) => {
    row[h] = '';
  });
  return row;
};

const findKeyFrom = (data, key, start, getKey) => {
  for (let i = start; i < data.length; i += 1) {
    if (getKey(data[i]) === key) return i;
  }
  return -1;
};

/** prime-key 기준으로 좌/우 테이블 행 수를 맞추고, 없는 쪽에 더미 행 삽입 */
const alignTablesByPrimeKey = (data1, data2, getKey, headers) => {
  const left = [];
  const right = [];
  let i = 0;
  let j = 0;

  while (i < data1.length || j < data2.length) {
    if (i >= data1.length) {
      const row2 = data2[j];
      const key = getKey(row2);
      left.push({
        row: createDummyRow(headers),
        isDummy: true,
        uniqueKey: key,
      });
      right.push({ row: row2, isDummy: false, uniqueKey: key });
      j += 1;
      continue;
    }
    if (j >= data2.length) {
      const row1 = data1[i];
      const key = getKey(row1);
      left.push({ row: row1, isDummy: false, uniqueKey: key });
      right.push({
        row: createDummyRow(headers),
        isDummy: true,
        uniqueKey: key,
      });
      i += 1;
      continue;
    }

    const row1 = data1[i];
    const row2 = data2[j];
    const key1 = getKey(row1);
    const key2 = getKey(row2);

    if (key1 === key2) {
      left.push({ row: row1, isDummy: false, uniqueKey: key1 });
      right.push({ row: row2, isDummy: false, uniqueKey: key2 });
      i += 1;
      j += 1;
      continue;
    }

    const key1In2 = findKeyFrom(data2, key1, j, getKey);
    const key2In1 = findKeyFrom(data1, key2, i, getKey);

    if (key1In2 === -1) {
      left.push({ row: row1, isDummy: false, uniqueKey: key1 });
      right.push({
        row: createDummyRow(headers),
        isDummy: true,
        uniqueKey: key1,
      });
      i += 1;
      continue;
    }
    if (key2In1 === -1) {
      left.push({
        row: createDummyRow(headers),
        isDummy: true,
        uniqueKey: key2,
      });
      right.push({ row: row2, isDummy: false, uniqueKey: key2 });
      j += 1;
      continue;
    }

    const distToMatch1 = key1In2 - j;
    const distToMatch2 = key2In1 - i;
    if (distToMatch2 <= distToMatch1) {
      left.push({
        row: createDummyRow(headers),
        isDummy: true,
        uniqueKey: key2,
      });
      right.push({ row: row2, isDummy: false, uniqueKey: key2 });
      j += 1;
    } else {
      left.push({ row: row1, isDummy: false, uniqueKey: key1 });
      right.push({
        row: createDummyRow(headers),
        isDummy: true,
        uniqueKey: key1,
      });
      i += 1;
    }
  }

  return { left, right };
};

// 탭별 초기 데이터
const getInitialTabData = () => ({
  data1: [],
  data2: [],
  selectedRevision1: '',
  selectedRevision2: '',
  loading: false,
  error: null,
});

let nextTabId = 1;
function TestPage() {
  const { API_URL } = useApiUrl();
  const REVISIONS_LIST_URL = `${API_URL}/imports/rev-list/`;
  const REV_DATA_URL = `${API_URL}/imports/rev-data`;

  const [tabs, setTabs] = useState([{ id: 1, name: '비교 1' }]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [tabData, setTabData] = useState(() => ({ 1: getInitialTabData() }));

  const [revisions, setRevisions] = useState([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);
  const [revisionListError, setRevisionListError] = useState(null);
  const table1Ref = useRef(null);
  const table2Ref = useRef(null);
  const isScrollingRef = useRef(false);
  /** prime_key 기준 비교 결과 필터 (비어 있으면 전체 표시) */
  const [selectedPrimeKeys, setSelectedPrimeKeys] = useState(() => new Set());
  const selectedPrimeKeysRef = useRef(selectedPrimeKeys);
  const rowDragStartIndexRef = useRef(null);
  const rowDragTableIdRef = useRef(null);
  const isRowDraggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const dragBaseSelectionRef = useRef(new Set());
  const ctrlClickPendingKeyRef = useRef(null);
  const lastClickedIndexRef = useRef({ 1: null, 2: null });

  useEffect(() => {
    selectedPrimeKeysRef.current = selectedPrimeKeys;
  }, [selectedPrimeKeys]);

  // 현재 탭 데이터 (계산)
  const currentTabData = tabData[activeTabId] || getInitialTabData();
  const data1 = currentTabData.data1;
  const data2 = currentTabData.data2;
  const loading = currentTabData.loading;
  const error = currentTabData.error;
  const selectedRevision1 = currentTabData.selectedRevision1;
  const selectedRevision2 = currentTabData.selectedRevision2;

  // DB의 "prime-key"를 unique key로 사용하여 비교 (삭제, 수정, 신규 판별)
  const getUniqueKey = (row) => {
    const v = row?.['prime-key'];
    return v !== undefined && v !== null ? String(v) : '';
  };

  // Unique Key 기준으로 테이블 비교
  const comparisonResult = useMemo(() => {
    if (
      !data1 ||
      !data2 ||
      data1.length === 0 ||
      data2.length === 0 ||
      !data1[0] ||
      !data2[0]
    ) {
      return null;
    }

    const headers1 = Object.keys(data1[0]);
    const headers2 = Object.keys(data2[0]);
    const allHeadersRaw = [...new Set([...headers1, ...headers2])];
    const allHeaders = getOrderedHeaders(allHeadersRaw);

    // Unique Key를 키로 하는 Map 생성
    const map1 = new Map();
    const map2 = new Map();

    data1.forEach((row) => {
      const key = getUniqueKey(row);
      map1.set(key, row);
    });

    data2.forEach((row) => {
      const key = getUniqueKey(row);
      map2.set(key, row);
    });

    // 모든 Unique Key 수집
    const allKeys = new Set([...map1.keys(), ...map2.keys()]);
    console.log('allKeys:', allKeys);

    const comparisonData = [];
    const rowTypeMap = {}; // Unique Key -> 타입 매핑

    allKeys.forEach((uniqueKey) => {
      const row1 = map1.get(uniqueKey);
      const row2 = map2.get(uniqueKey);

      let type = '';
      let rowData = {};
      let rowDiff = {};

      if (!row1 && row2) {
        // 신규: data1에 없고 data2에만 있음
        type = '신규';
        rowData = { ...row2 };
        // 모든 컬럼을 변경된 것으로 표시
        allHeaders.forEach((header) => {
          rowDiff[header] = {
            oldValue: '',
            newValue: row2[header] !== undefined ? String(row2[header]) : '',
            changed: true,
          };
        });
      } else if (row1 && !row2) {
        // 삭제: data1에 있고 data2에 -
        type = '삭제';
        rowData = { ...row1 };
        // 모든 컬럼을 삭제된 것으로 표시
        allHeaders.forEach((header) => {
          rowDiff[header] = {
            oldValue: row1[header] !== undefined ? String(row1[header]) : '',
            newValue: '',
            changed: true,
          };
        });
      } else if (row1 && row2) {
        // 수정 또는 동일: 두 테이블 모두에 있음
        rowData = { ...row2 };
        let hasChange = false;

        allHeaders.forEach((header) => {
          const value1 = row1[header] !== undefined ? String(row1[header]) : '';
          const value2 = row2[header] !== undefined ? String(row2[header]) : '';

          if (value1 !== value2) {
            rowDiff[header] = {
              oldValue: value1,
              newValue: value2,
              changed: true,
            };
            hasChange = true;
          } else {
            rowDiff[header] = {
              oldValue: value1,
              newValue: value2,
              changed: false,
            };
          }
        });

        type = hasChange ? '수정' : '동일';
      }

      if (type !== '동일') {
        // 동일한 경우는 제외하고 비교 결과에 추가
        comparisonData.push({
          uniqueKey,
          rowData,
          rowDiff,
          type,
        });
        rowTypeMap[uniqueKey] = type;
      }
    });

    // 변경된 컬럼 추출 ("BizName", "BizNum"은 항상 표시하기 위해 포함 후 정렬)
    const changedColumnsSet = new Set();
    comparisonData.forEach((item) => {
      Object.keys(item.rowDiff).forEach((column) => {
        if (item.rowDiff[column].changed) {
          changedColumnsSet.add(column);
        }
      });
    });
    const withKeyColumns = new Set([
      ...KEY_FIRST.filter((k) => allHeaders.includes(k)),
      ...changedColumnsSet,
    ]);
    const changedColumnsOrdered = getOrderedHeaders(Array.from(withKeyColumns));

    console.log('비교 결과');
    console.log(comparisonData);
    console.log(rowTypeMap);
    console.log(changedColumnsOrdered);
    console.log(allHeaders);

    return {
      comparisonData,
      rowTypeMap,
      changedColumns: changedColumnsOrdered,
      allHeaders,
    };
  }, [data1, data2]);

  const alignedTables = useMemo(() => {
    if (!data1?.length || !data2?.length || !data1[0] || !data2[0]) {
      return { left: [], right: [] };
    }
    const allHeadersRaw = [
      ...new Set([...Object.keys(data1[0]), ...Object.keys(data2[0])]),
    ];
    const headers = getOrderedHeaders(allHeadersRaw);
    return alignTablesByPrimeKey(data1, data2, getUniqueKey, headers);
  }, [data1, data2]);

  const alignedLeft = alignedTables.left;
  const alignedRight = alignedTables.right;

  // revision 목록 가져오기
  const fetchRevisions = useCallback(async () => {
    setLoadingRevisions(true);
    try {
      const response = await axios.get(REVISIONS_LIST_URL);
      const revisionsData = Array.isArray(response.data)
        ? response.data
        : response.data?.data || response.data?.results || [];
      console.log('Revisions Data:', revisionsData);
      setRevisions(revisionsData);
      setRevisionListError(null);
    } catch (err) {
      console.error('Revision 목록 가져오기 오류:', err);
      setRevisionListError('Revision 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingRevisions(false);
    }
  }, [REVISIONS_LIST_URL]);

  useEffect(() => {
    void fetchRevisions();
  }, [fetchRevisions]);

  const updateCurrentTabData = useCallback(
    (updates) => {
      setTabData((prev) => ({
        ...prev,
        [activeTabId]: {
          ...(prev[activeTabId] || getInitialTabData()),
          ...updates,
        },
      }));
    },
    [activeTabId],
  );

  const handleRevision1Change = (value) => {
    console.log('selectedRevision1 변경:', value);
    updateCurrentTabData({ selectedRevision1: value });
  };

  const handleRevision2Change = (value) => {
    console.log('selectedRevision2 변경:', value);
    updateCurrentTabData({ selectedRevision2: value });
  };

  const addTab = () => {
    nextTabId += 1;
    const newTab = { id: nextTabId, name: `비교 ${nextTabId}` };
    setTabs((prev) => [...prev, newTab]);
    setTabData((prev) => ({ ...prev, [nextTabId]: getInitialTabData() }));
    setActiveTabId(nextTabId);
  };

  const removeTab = (tabId, e) => {
    e.stopPropagation();
    const index = tabs.findIndex((t) => t.id === tabId);
    if (index === -1 || tabs.length <= 1) return;
    const remaining = tabs.filter((t) => t.id !== tabId);
    setTabs(() => remaining);
    setTabData((prev) => {
      const next = { ...prev };
      delete next[tabId];
      return next;
    });
    if (activeTabId === tabId && remaining.length > 0) {
      const nextIndex = Math.min(index, remaining.length - 1);
      setActiveTabId(remaining[nextIndex].id);
    }
  };

  const setActiveTab = (tabId) => setActiveTabId(tabId);

  // TestPage에서만 스크롤 스냅 적용 (구간별로 스크롤 멈춤)
  useEffect(() => {
    document.body.classList.add('test-page-scroll-snap');
    return () => document.body.classList.remove('test-page-scroll-snap');
  }, []);

  // 스크롤 동기화
  useEffect(() => {
    const table1 = table1Ref.current;
    const table2 = table2Ref.current;

    if (!table1 || !table2) return;

    const handleScroll1 = () => {
      if (isScrollingRef.current) return;
      isScrollingRef.current = true;
      table2.scrollTop = table1.scrollTop;
      table2.scrollLeft = table1.scrollLeft;
      requestAnimationFrame(() => {
        isScrollingRef.current = false;
      });
    };

    const handleScroll2 = () => {
      if (isScrollingRef.current) return;
      isScrollingRef.current = true;
      table1.scrollTop = table2.scrollTop;
      table1.scrollLeft = table2.scrollLeft;
      requestAnimationFrame(() => {
        isScrollingRef.current = false;
      });
    };

    table1.addEventListener('scroll', handleScroll1);
    table2.addEventListener('scroll', handleScroll2);

    return () => {
      table1.removeEventListener('scroll', handleScroll1);
      table2.removeEventListener('scroll', handleScroll2);
    };
  }, [alignedLeft.length, alignedRight.length]);

  const fetchData = async () => {
    if (!selectedRevision1 || !selectedRevision2) {
      updateCurrentTabData({ error: '두 개의 revision을 모두 선택해주세요.' });
      return;
    }
    const tabId = activeTabId;
    console.log('조회 버튼 동작');
    updateCurrentTabData({ loading: true, error: null });
    try {
      // 선택된 revision에서 import_id 추출
      // 다양한 형태의 ID 필드 지원 (id, _id, import_id 등)
      const getRevisionId = (r) => r.id || r._id || r.import_id || String(r);
      const revision1 = revisions.find(
        (r) => getRevisionId(r) === selectedRevision1,
      );
      const revision2 = revisions.find(
        (r) => getRevisionId(r) === selectedRevision2,
      );

      console.log('revision1:', revision1);
      console.log('revision2:', revision2);
      console.log('selectedRevision1:', selectedRevision1);
      console.log('selectedRevision2:', selectedRevision2);

      if (!revision1 || !revision2) {
        setTabData((prev) => ({
          ...prev,
          [tabId]: {
            ...(prev[tabId] || getInitialTabData()),
            error: '선택된 revision을 찾을 수 없습니다.',
            loading: false,
          },
        }));
        return;
      }

      const importId1 = revision1.import_id || revision1.importId;
      const importId2 = revision2.import_id || revision2.importId;

      if (!importId1 || !importId2) {
        setTabData((prev) => ({
          ...prev,
          [tabId]: {
            ...(prev[tabId] || getInitialTabData()),
            error: '선택된 revision에 import_id가 없습니다.',
            loading: false,
          },
        }));
        return;
      }

      // 두 개의 API에서 병렬로 sap_his_data 가져오기
      console.log('importId1:', importId1);
      console.log('importId2:', importId2);
      const [response1, response2] = await Promise.all([
        axios.get(REV_DATA_URL, {
          params: { import_id: importId1 },
        }),
        axios.get(REV_DATA_URL, {
          params: { import_id: importId2 },
        }),
      ]);

      console.log('Response 1:', response1.data);
      console.log('Response 2:', response2.data);
      console.log('Response 1 type:', Array.isArray(response1.data));
      console.log('Response 2 type:', Array.isArray(response2.data));

      // 응답 데이터가 배열인지 확인하고, 배열이 아니면 배열로 변환
      const data1Array = Array.isArray(response1.data)
        ? response1.data
        : response1.data?.data ||
          response1.data?.results ||
          response1.data?.sap_his_data ||
          [response1.data].filter(Boolean);
      const data2Array = Array.isArray(response2.data)
        ? response2.data
        : response2.data?.data ||
          response2.data?.results ||
          response2.data?.sap_his_data ||
          [response2.data].filter(Boolean);

      console.log('Processed Data 1:', data1Array);
      console.log('Processed Data 2:', data2Array);

      setTabData((prev) => ({
        ...prev,
        [tabId]: {
          ...(prev[tabId] || getInitialTabData()),
          data1: data1Array,
          data2: data2Array,
          loading: false,
          error: null,
        },
      }));
    } catch (err) {
      console.error('데이터 가져오기 오류:', err);
      setTabData((prev) => ({
        ...prev,
        [tabId]: {
          ...(prev[tabId] || getInitialTabData()),
          loading: false,
          error:
            '데이터를 불러오는 중 오류가 발생했습니다: ' +
            (err.response?.data?.message || err.message),
        },
      }));
    }
  };

  // 테이블 헤더 추출
  const getHeaders = (data) => {
    if (!data || data.length === 0 || !data[0]) return [];
    return Object.keys(data[0]);
  };

  const headers1 = getHeaders(data1);
  const headers2 = getHeaders(data2);

  const changedColumns = comparisonResult?.changedColumns || [];
  const rowTypeMap = comparisonResult?.rowTypeMap ?? {};

  const isFilterActive = selectedPrimeKeys.size > 0;

  const displayComparisonData = useMemo(() => {
    if (!comparisonResult) return [];
    if (!isFilterActive) return comparisonResult.comparisonData;
    return comparisonResult.comparisonData.filter((item) =>
      selectedPrimeKeys.has(item.uniqueKey),
    );
  }, [comparisonResult, isFilterActive, selectedPrimeKeys]);

  const getRowPrimeKey = useCallback(
    (tableId, rowIndex) => {
      const entry =
        tableId === 1 ? alignedLeft[rowIndex] : alignedRight[rowIndex];
      return entry?.uniqueKey ?? '';
    },
    [alignedLeft, alignedRight],
  );

  const applyRowRangeSelection = useCallback(
    (tableId, startIndex, endIndex, additive = false) => {
      const rows = tableId === 1 ? alignedLeft : alignedRight;
      if (!rows.length) return;
      const min = Math.min(startIndex, endIndex);
      const max = Math.max(startIndex, endIndex);
      const rangeKeys = new Set();
      for (let i = min; i <= max; i += 1) {
        const key = rows[i]?.uniqueKey;
        if (key) rangeKeys.add(key);
      }
      if (!additive) {
        setSelectedPrimeKeys(rangeKeys);
        return;
      }
      setSelectedPrimeKeys(
        new Set([...dragBaseSelectionRef.current, ...rangeKeys]),
      );
    },
    [alignedLeft, alignedRight],
  );

  const handleRowMouseDown = useCallback(
    (e, tableId, rowIndex) => {
      if (e.button !== 0) return;
      e.preventDefault();

      const rows = tableId === 1 ? alignedLeft : alignedRight;
      const entry = rows[rowIndex];
      if (!entry) return;

      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const lastIndex = lastClickedIndexRef.current[tableId];

      if (shift && lastIndex != null) {
        dragBaseSelectionRef.current = ctrl
          ? new Set(selectedPrimeKeysRef.current)
          : new Set();
        applyRowRangeSelection(tableId, lastIndex, rowIndex, ctrl);
        lastClickedIndexRef.current[tableId] = rowIndex;
        isRowDraggingRef.current = false;
        rowDragTableIdRef.current = null;
        ctrlClickPendingKeyRef.current = null;
        return;
      }

      rowDragTableIdRef.current = tableId;
      rowDragStartIndexRef.current = rowIndex;
      lastClickedIndexRef.current[tableId] = rowIndex;
      isRowDraggingRef.current = true;
      dragMovedRef.current = false;

      if (ctrl) {
        dragBaseSelectionRef.current = new Set(selectedPrimeKeysRef.current);
        ctrlClickPendingKeyRef.current = entry.uniqueKey;
        return;
      }

      ctrlClickPendingKeyRef.current = null;
      dragBaseSelectionRef.current = new Set();
      applyRowRangeSelection(tableId, rowIndex, rowIndex, false);
    },
    [alignedLeft, alignedRight, applyRowRangeSelection],
  );

  const handleRowMouseEnter = useCallback(
    (e, tableId, rowIndex) => {
      if (!isRowDraggingRef.current) return;
      if (rowDragTableIdRef.current !== tableId) return;
      if (rowDragStartIndexRef.current == null) return;
      dragMovedRef.current = true;
      const additive = Boolean(
        ctrlClickPendingKeyRef.current != null || e.ctrlKey || e.metaKey,
      );
      applyRowRangeSelection(
        tableId,
        rowDragStartIndexRef.current,
        rowIndex,
        additive,
      );
    },
    [applyRowRangeSelection],
  );

  const isSourceRowSelected = useCallback(
    (tableId, rowIndex) =>
      selectedPrimeKeys.has(getRowPrimeKey(tableId, rowIndex)),
    [selectedPrimeKeys, getRowPrimeKey],
  );

  const getSourceTableRowClassName = useCallback(
    (tableId, rowIndex) => {
      const entry =
        tableId === 1 ? alignedLeft[rowIndex] : alignedRight[rowIndex];
      if (!entry) return undefined;
      const { isDummy, uniqueKey } = entry;
      const type = rowTypeMap[uniqueKey];
      const classes = [];

      if (isDummy) {
        classes.push('row-dummy');
      } else if (type === '수정') {
        classes.push('row-type-수정');
      } else if (tableId === 1 && type === '삭제') {
        classes.push('row-type-삭제');
      } else if (tableId === 2 && type === '신규') {
        classes.push('row-type-신규');
      }

      if (isSourceRowSelected(tableId, rowIndex)) {
        classes.push('row-selected');
      }

      return classes.length > 0 ? classes.join(' ') : undefined;
    },
    [alignedLeft, alignedRight, rowTypeMap, isSourceRowSelected],
  );

  const endRowDrag = useCallback(() => {
    if (
      isRowDraggingRef.current &&
      ctrlClickPendingKeyRef.current != null &&
      !dragMovedRef.current
    ) {
      const key = ctrlClickPendingKeyRef.current;
      setSelectedPrimeKeys((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    }
    isRowDraggingRef.current = false;
    rowDragStartIndexRef.current = null;
    rowDragTableIdRef.current = null;
    ctrlClickPendingKeyRef.current = null;
    dragMovedRef.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', endRowDrag);
    return () => window.removeEventListener('mouseup', endRowDrag);
  }, [endRowDrag]);

  useEffect(() => {
    const handlePointerDownOutside = (e) => {
      if (e.target.closest('.invest-list-table-wrapper')) return;
      if (e.target.closest('.changes-section')) return;
      setSelectedPrimeKeys(new Set());
    };
    document.addEventListener('mousedown', handlePointerDownOutside);
    return () =>
      document.removeEventListener('mousedown', handlePointerDownOutside);
  }, []);

  useEffect(() => {
    setSelectedPrimeKeys(new Set());
    lastClickedIndexRef.current = { 1: null, 2: null };
  }, [activeTabId, data1, data2]);

  return (
    <div className='page-container'>
      <div className='test-page'>
        <h1>투자 데이터 비교 페이지</h1>
        <p>MongoDB에서 가져온 데이터를 테이블로 표시합니다.</p>

        <div
          className='sheet-tabs-wrap'
          role='tablist'
          aria-label='비교 시트 탭'
        >
          <div className='sheet-tabs'>
            {tabs.map((tab) => (
              <div
                key={tab.id}
                role='tab'
                aria-selected={activeTabId === tab.id}
                tabIndex={activeTabId === tab.id ? 0 : -1}
                className={`sheet-tab ${activeTabId === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveTab(tab.id);
                  }
                }}
              >
                <span className='sheet-tab-label'>{tab.name}</span>
                {tabs.length > 1 && (
                  <button
                    type='button'
                    className='sheet-tab-close'
                    onClick={(e) => removeTab(tab.id, e)}
                    aria-label={`${tab.name} 탭 닫기`}
                    title='탭 닫기'
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type='button'
              className='sheet-tab-add'
              onClick={addTab}
              aria-label='새 비교 탭 추가'
              title='새 탭 추가'
            >
              +
            </button>
          </div>
        </div>

        <div className='test-content'>
          {/* 구간 1: 테이블 1/2 비교 — 스크롤 시 이 구간 끝에서 한 번 멈춤 */}
          <section
            className='scroll-snap-section'
            aria-label='테이블 비교 구간'
          >
            <div className='revision-selector'>
              <div className='revision-selectors-row'>
                <RevSelector
                  label='기준 Revision'
                  id='revision1'
                  value={selectedRevision1}
                  onChange={handleRevision1Change}
                  revisions={revisions}
                  disabled={loadingRevisions || loading}
                />

                <RevSelector
                  label='비교 Revision'
                  id='revision2'
                  value={selectedRevision2}
                  onChange={handleRevision2Change}
                  revisions={revisions}
                  disabled={loadingRevisions || loading}
                />
              </div>

              <div className='revision-query-row'>
                <button
                  onClick={fetchData}
                  className='query-btn'
                  disabled={
                    loading ||
                    loadingRevisions ||
                    !selectedRevision1 ||
                    !selectedRevision2
                  }
                >
                  {loading ? '로딩 중...' : '조회'}
                </button>
              </div>
            </div>

            {loadingRevisions && (
              <div className='loading-message'>
                Revision 목록을 불러오는 중...
              </div>
            )}

            {revisionListError && (
              <div className='error-message'>{revisionListError}</div>
            )}
            {error && <div className='error-message'>{error}</div>}

            {loading && (
              <div className='loading-message'>데이터를 불러오는 중...</div>
            )}

            {!loading && !error && (
              <div className='tables-container'>
                <p className='table-selection-hint'>
                  prime-key 기준으로 좌·우 행이 맞춰지며, 삭제·신규 항목은
                  반대편에 빈 더미 행이 표시됩니다. 행 클릭·드래그로 비교 결과
                  필터. <strong>Shift</strong>+클릭 구간 선택,{' '}
                  <strong>Ctrl</strong>+클릭 토글·드래그로 추가 선택. 비교
                  테이블 1·2 밖(비교 결과 영역 제외) 클릭 시 필터 해제.
                </p>
                <div className='table-section'>
                  <h2>기준 투자 리스트 - {data1.length}건</h2>
                  {data1.length > 0 ? (
                    <div
                      className='table-wrapper invest-list-table-wrapper'
                      ref={table1Ref}
                    >
                      <table className='data-table' data-table-id={1}>
                        <thead>
                          <tr>
                            <th className='row-num-column'>#</th>
                            {getOrderedHeaders(headers1).map(
                              (header, index) => (
                                <th key={index}>{header}</th>
                              ),
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {alignedLeft.map((entry, rowIndex) => (
                            <tr
                              key={`t1-${entry.uniqueKey}-${rowIndex}`}
                              className={getSourceTableRowClassName(
                                1,
                                rowIndex,
                              )}
                              title='Shift+클릭 구간 · Ctrl+클릭 토글/추가'
                              onMouseDown={(e) =>
                                handleRowMouseDown(e, 1, rowIndex)
                              }
                              onMouseEnter={(e) =>
                                handleRowMouseEnter(e, 1, rowIndex)
                              }
                            >
                              <td className='row-num-column'>{rowIndex + 1}</td>
                              {getOrderedHeaders(headers1).map(
                                (header, colIndex) => (
                                  <td key={colIndex}>
                                    {entry.isDummy ? '' : entry.row[header]}
                                  </td>
                                ),
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p>데이터가 없습니다.</p>
                  )}
                </div>

                <div className='table-section'>
                  <h2>신규 투자 리스트 - {data2.length}건</h2>
                  {data2.length > 0 ? (
                    <div
                      className='table-wrapper invest-list-table-wrapper'
                      ref={table2Ref}
                    >
                      <table className='data-table' data-table-id={2}>
                        <thead>
                          <tr>
                            <th className='row-num-column'>#</th>
                            {getOrderedHeaders(headers2).map(
                              (header, index) => (
                                <th key={index}>{header}</th>
                              ),
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {alignedRight.map((entry, rowIndex) => (
                            <tr
                              key={`t2-${entry.uniqueKey}-${rowIndex}`}
                              className={getSourceTableRowClassName(
                                2,
                                rowIndex,
                              )}
                              title='Shift+클릭 구간 · Ctrl+클릭 토글/추가'
                              onMouseDown={(e) =>
                                handleRowMouseDown(e, 2, rowIndex)
                              }
                              onMouseEnter={(e) =>
                                handleRowMouseEnter(e, 2, rowIndex)
                              }
                            >
                              <td className='row-num-column'>{rowIndex + 1}</td>
                              {getOrderedHeaders(headers2).map(
                                (header, colIndex) => (
                                  <td key={colIndex}>
                                    {entry.isDummy ? '' : entry.row[header]}
                                  </td>
                                ),
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p>데이터가 없습니다.</p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* 구간 2: 비교 결과 테이블 — 스크롤 시 이 구간 끝에서 한 번 멈춤 */}
          {!loading && !error && data1.length > 0 && data2.length > 0 && (
            <section
              className='scroll-snap-section'
              aria-label='비교 결과 구간'
            >
              <div className='changes-section'>
                <h2>
                  비교 결과
                  {isFilterActive && (
                    <span className='comparison-filter-badge'>
                      {' '}
                      · 선택 {selectedPrimeKeys.size}건 필터 중
                    </span>
                  )}
                </h2>
                {displayComparisonData.length > 0 ? (
                  <div className='changes-table-wrapper changes-table-wrapper--fixed-rows'>
                    <table className='changes-table'>
                      <thead>
                        <tr>
                          <th className='row-num-column'>#</th>
                          {changedColumns.map((header, index) => (
                            <th key={index}>{header}</th>
                          ))}
                          <th className='type-column'>변경 타입</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayComparisonData.map((item, rowIndex) => {
                          const { rowData, rowDiff, type } = item;

                          return (
                            <tr key={item.uniqueKey} className={`type-${type}`}>
                              <td className='row-num-column'>{rowIndex + 1}</td>
                              {changedColumns.map((column, colIndex) => {
                                const diff = rowDiff[column];
                                const hasChange = diff && diff.changed;

                                return (
                                  <td
                                    key={colIndex}
                                    className={
                                      hasChange ? 'cell-different' : ''
                                    }
                                  >
                                    {hasChange ? (
                                      <span className='cell-change-value'>
                                        <span className='old-value'>
                                          {diff.oldValue || '(None)'}
                                        </span>
                                        <span className='change-arrow'>
                                          {' '}
                                          →{' '}
                                        </span>
                                        <span className='new-value'>
                                          {diff.newValue || '(None)'}
                                        </span>
                                      </span>
                                    ) : (
                                      rowData[column] || ''
                                    )}
                                  </td>
                                );
                              })}
                              <td className={`type-cell type-${type}`}>
                                <span className={`type-badge type-${type}`}>
                                  {type}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className='changes-table-wrapper changes-table-wrapper--fixed-rows'>
                    <table className='changes-table'>
                      <thead>
                        <tr>
                          <th className='row-num-column'>#</th>
                          {changedColumns.length > 0 ? (
                            changedColumns.map((header, index) => (
                              <th key={index}>{header}</th>
                            ))
                          ) : (
                            <th>데이터</th>
                          )}
                          <th className='type-column'>변경 타입</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className='changes-table-empty-row'>
                          <td
                            colSpan={Math.max(changedColumns.length, 1) + 2}
                            className='changes-table-empty-cell'
                          >
                            {isFilterActive ? (
                              <>
                                선택한 항목에 표시할 변경 사항이 없습니다. (동일
                                항목이거나 비교 결과에 포함되지 않음)
                              </>
                            ) : (
                              <>✓ 모든 데이터가 동일합니다.</>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default TestPage;
