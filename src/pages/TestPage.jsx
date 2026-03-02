import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import RevSelector from "../components/rev-compare/RevSelector";
import "./TestPage.css";

// "BizName", "BizNum"을 항상 왼쪽 열로 두기 위한 헤더 정렬 (컴포넌트 외부에서 상수로 사용)
const KEY_FIRST = ["BizName", "BizNum"];
const getOrderedHeaders = (headers) => {
  if (!headers || headers.length === 0) return headers || [];
  const first = KEY_FIRST.filter((k) => headers.includes(k));
  const rest = headers.filter((k) => !KEY_FIRST.includes(k));
  return [...first, ...rest];
};

// 탭별 초기 데이터
const getInitialTabData = () => ({
  data1: [],
  data2: [],
  selectedRevision1: "",
  selectedRevision2: "",
  loading: false,
  error: null,
});

let nextTabId = 1;
function TestPage() {
  const [tabs, setTabs] = useState([{ id: 1, name: "비교 1" }]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [tabData, setTabData] = useState(() => ({ 1: getInitialTabData() }));

  const [revisions, setRevisions] = useState([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);
  const [revisionListError, setRevisionListError] = useState(null);
  const table1Ref = useRef(null);
  const table2Ref = useRef(null);
  const tablesContainerRef = useRef(null);
  const isScrollingRef = useRef(false);
  /** 드래그 선택: { tableId: 1|2, startRow, startCol, endRow, endCol } */
  const [selection, setSelection] = useState(null);
  const selectionStartRef = useRef(null);

  // 현재 탭 데이터 (계산)
  const currentTabData = tabData[activeTabId] || getInitialTabData();
  const data1 = currentTabData.data1;
  const data2 = currentTabData.data2;
  const loading = currentTabData.loading;
  const error = currentTabData.error;
  const selectedRevision1 = currentTabData.selectedRevision1;
  const selectedRevision2 = currentTabData.selectedRevision2;

  // "BizName" + "BizNum"을 unique key로 사용하여 비교 (삭제, 수정, 신규 판별)
  const getUniqueKey = (row) => {
    const 사업명 = row["BizName"] !== undefined ? String(row["BizName"]) : "";
    const 순번 = row["BizNum"] !== undefined ? String(row["BizNum"]) : "";
    return `${사업명}::${순번}`;
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

    const comparisonData = [];
    const rowTypeMap = {}; // Unique Key -> 타입 매핑

    allKeys.forEach((uniqueKey) => {
      const row1 = map1.get(uniqueKey);
      const row2 = map2.get(uniqueKey);

      let type = "";
      let rowData = {};
      let rowDiff = {};

      if (!row1 && row2) {
        // 신규: data1에 없고 data2에만 있음
        type = "신규";
        rowData = { ...row2 };
        // 모든 컬럼을 변경된 것으로 표시
        allHeaders.forEach((header) => {
          rowDiff[header] = {
            oldValue: "",
            newValue: row2[header] !== undefined ? String(row2[header]) : "",
            changed: true,
          };
        });
      } else if (row1 && !row2) {
        // 삭제: data1에 있고 data2에 없음
        type = "삭제";
        rowData = { ...row1 };
        // 모든 컬럼을 삭제된 것으로 표시
        allHeaders.forEach((header) => {
          rowDiff[header] = {
            oldValue: row1[header] !== undefined ? String(row1[header]) : "",
            newValue: "",
            changed: true,
          };
        });
      } else if (row1 && row2) {
        // 수정 또는 동일: 두 테이블 모두에 있음
        rowData = { ...row2 };
        let hasChange = false;

        allHeaders.forEach((header) => {
          const value1 = row1[header] !== undefined ? String(row1[header]) : "";
          const value2 = row2[header] !== undefined ? String(row2[header]) : "";

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

        type = hasChange ? "수정" : "동일";
      }

      if (type !== "동일") {
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

    return {
      comparisonData,
      rowTypeMap,
      changedColumns: changedColumnsOrdered,
      allHeaders,
    };
  }, [data1, data2]);

  // revision 목록 가져오기
  useEffect(() => {
    fetchRevisions();
  }, []);

  const fetchRevisions = async () => {
    setLoadingRevisions(true);
    try {
      const response = await axios.get(
        "http://127.0.0.1:8080/api/imports/rev-list/"
      );
      const revisionsData = Array.isArray(response.data)
        ? response.data
        : response.data?.data || response.data?.results || [];
      console.log("Revisions Data:", revisionsData);
      setRevisions(revisionsData);
      setRevisionListError(null);
    } catch (err) {
      console.error("Revision 목록 가져오기 오류:", err);
      setRevisionListError("Revision 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoadingRevisions(false);
    }
  };

  const updateCurrentTabData = useCallback((updates) => {
    setTabData((prev) => ({
      ...prev,
      [activeTabId]: {
        ...(prev[activeTabId] || getInitialTabData()),
        ...updates,
      },
    }));
  }, [activeTabId]);

  const handleRevision1Change = (value) => {
    console.log("selectedRevision1 변경:", value);
    updateCurrentTabData({ selectedRevision1: value });
  };

  const handleRevision2Change = (value) => {
    console.log("selectedRevision2 변경:", value);
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
    document.body.classList.add("test-page-scroll-snap");
    return () => document.body.classList.remove("test-page-scroll-snap");
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

    table1.addEventListener("scroll", handleScroll1);
    table2.addEventListener("scroll", handleScroll2);

    return () => {
      table1.removeEventListener("scroll", handleScroll1);
      table2.removeEventListener("scroll", handleScroll2);
    };
  }, [data1, data2]);

  const fetchData = async () => {
    if (!selectedRevision1 || !selectedRevision2) {
      updateCurrentTabData({ error: "두 개의 revision을 모두 선택해주세요." });
      return;
    }
    const tabId = activeTabId;
    console.log("조회 버튼 동작");
    updateCurrentTabData({ loading: true, error: null });
    try {
      // 선택된 revision에서 import_id 추출
      // 다양한 형태의 ID 필드 지원 (id, _id, import_id 등)
      const getRevisionId = (r) => r.id || r._id || r.import_id || String(r);
      const revision1 = revisions.find(
        (r) => getRevisionId(r) === selectedRevision1
      );
      const revision2 = revisions.find(
        (r) => getRevisionId(r) === selectedRevision2
      );

      console.log("revision1:", revision1);
      console.log("revision2:", revision2);
      console.log("selectedRevision1:", selectedRevision1);
      console.log("selectedRevision2:", selectedRevision2);

      if (!revision1 || !revision2) {
        setTabData((prev) => ({
          ...prev,
          [tabId]: { ...(prev[tabId] || getInitialTabData()), error: "선택된 revision을 찾을 수 없습니다.", loading: false },
        }));
        return;
      }

      const importId1 = revision1.import_id || revision1.importId;
      const importId2 = revision2.import_id || revision2.importId;

      if (!importId1 || !importId2) {
        setTabData((prev) => ({
          ...prev,
          [tabId]: { ...(prev[tabId] || getInitialTabData()), error: "선택된 revision에 import_id가 없습니다.", loading: false },
        }));
        return;
      }

      // 두 개의 API에서 병렬로 sap_his_data 가져오기
      console.log("importId1:", importId1);
      console.log("importId2:", importId2);
      const [response1, response2] = await Promise.all([
        axios.get(`http://127.0.0.1:8080/api/imports/rev-data`, {
          params: { import_id: importId1 },
        }),
        axios.get(`http://127.0.0.1:8080/api/imports/rev-data`, {
          params: { import_id: importId2 },
        }),
      ]);

      console.log("Response 1:", response1.data);
      console.log("Response 2:", response2.data);
      console.log("Response 1 type:", Array.isArray(response1.data));
      console.log("Response 2 type:", Array.isArray(response2.data));

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

      console.log("Processed Data 1:", data1Array);
      console.log("Processed Data 2:", data2Array);

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
      // 테이블 영역이 렌더된 뒤 뷰포트 중앙으로 부드럽게 스크롤
      requestAnimationFrame(() => {
        setTimeout(() => {
          tablesContainerRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }, 120);
      });
    } catch (err) {
      console.error("데이터 가져오기 오류:", err);
      setTabData((prev) => ({
        ...prev,
        [tabId]: {
          ...(prev[tabId] || getInitialTabData()),
          loading: false,
          error:
            "데이터를 불러오는 중 오류가 발생했습니다: " +
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

  // 셀이 차이가 있는지 확인 (기존 테이블용)
  const isCellDifferent = (rowIndex, column) => {
    if (!comparisonResult) return false;
    const row = data1[rowIndex];
    if (!row) return false;
    const uniqueKey = getUniqueKey(row);
    const comparisonItem = comparisonResult.comparisonData.find(
      (item) => item.uniqueKey === uniqueKey
    );
    if (!comparisonItem) return false;
    return comparisonItem.rowDiff[column]?.changed || false;
  };

  const changedColumns = comparisonResult?.changedColumns || [];
  const hasChanges =
    comparisonResult && comparisonResult.comparisonData.length > 0;

  /** (row, col)가 현재 선택 범위 안인지 */
  const isCellInSelection = useCallback(
    (tableId, row, col) => {
      if (!selection || selection.tableId !== tableId) return false;
      const { startRow, startCol, endRow, endCol } = selection;
      const rMin = Math.min(startRow, endRow);
      const rMax = Math.max(startRow, endRow);
      const cMin = Math.min(startCol, endCol);
      const cMax = Math.max(startCol, endCol);
      return row >= rMin && row <= rMax && col >= cMin && col <= cMax;
    },
    [selection]
  );

  const getCellFromPoint = useCallback((clientX, clientY) => {
    const el = document.elementFromPoint(clientX, clientY);
    const cell = el?.closest?.("td, th");
    if (!cell) return null;
    const table = cell.closest("table[data-table-id]");
    if (!table) return null;
    const tableId = parseInt(table.getAttribute("data-table-id"), 10);
    const row = parseInt(cell.getAttribute("data-row"), 10);
    const col = parseInt(cell.getAttribute("data-col"), 10);
    if (Number.isNaN(tableId) || Number.isNaN(row) || Number.isNaN(col))
      return null;
    return { tableId, row, col };
  }, []);

  const handleTableMouseDown = useCallback((e) => {
    const cell = e.target.closest("td, th");
    if (!cell) return;
    const table = cell.closest("table[data-table-id]");
    if (!table) return;
    e.preventDefault();
    const tableId = parseInt(table.getAttribute("data-table-id"), 10);
    const row = parseInt(cell.getAttribute("data-row"), 10);
    const col = parseInt(cell.getAttribute("data-col"), 10);
    if (Number.isNaN(tableId) || Number.isNaN(row) || Number.isNaN(col))
      return;
    selectionStartRef.current = { tableId, row, col };
    setSelection({ tableId, startRow: row, startCol: col, endRow: row, endCol: col });
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!selectionStartRef.current) return;
      const cur = getCellFromPoint(e.clientX, e.clientY);
      if (!cur || cur.tableId !== selectionStartRef.current.tableId) return;
      setSelection((prev) => {
        if (!prev || prev.tableId !== cur.tableId) return prev;
        return {
          ...prev,
          endRow: cur.row,
          endCol: cur.col,
        };
      });
    };
    const handleMouseUp = () => {
      selectionStartRef.current = null;
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [getCellFromPoint]);

  return (
    <div className="page-container">
      <div className="test-page">
        <h1>투자 데이터 비교 페이지</h1>
        <p>MongoDB에서 가져온 데이터를 테이블로 표시합니다.</p>

        <div className="sheet-tabs-wrap" role="tablist" aria-label="비교 시트 탭">
          <div className="sheet-tabs">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                role="tab"
                aria-selected={activeTabId === tab.id}
                tabIndex={activeTabId === tab.id ? 0 : -1}
                className={`sheet-tab ${activeTabId === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveTab(tab.id);
                  }
                }}
              >
                <span className="sheet-tab-label">{tab.name}</span>
                {tabs.length > 1 && (
                  <button
                    type="button"
                    className="sheet-tab-close"
                    onClick={(e) => removeTab(tab.id, e)}
                    aria-label={`${tab.name} 탭 닫기`}
                    title="탭 닫기"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="sheet-tab-add"
              onClick={addTab}
              aria-label="새 비교 탭 추가"
              title="새 탭 추가"
            >
              +
            </button>
          </div>
        </div>

        <div className="test-content">
          {/* 구간 1: 테이블 1/2 비교 — 스크롤 시 이 구간 끝에서 한 번 멈춤 */}
          <section
            className="scroll-snap-section"
            aria-label="테이블 비교 구간"
          >
            <div className="revision-selector">
              <RevSelector
                label="기준 Revision"
                id="revision1"
                value={selectedRevision1}
                onChange={handleRevision1Change}
                revisions={revisions}
                disabled={loadingRevisions || loading}
              />

              <RevSelector
                label="비교 Revision"
                id="revision2"
                value={selectedRevision2}
                onChange={handleRevision2Change}
                revisions={revisions}
                disabled={loadingRevisions || loading}
              />

              <button
                onClick={fetchData}
                className="query-btn"
                disabled={
                  loading ||
                  loadingRevisions ||
                  !selectedRevision1 ||
                  !selectedRevision2
                }
              >
                {loading ? "로딩 중..." : "조회"}
              </button>
            </div>

            {loadingRevisions && (
              <div className="loading-message">
                Revision 목록을 불러오는 중...
              </div>
            )}

            {revisionListError && (
              <div className="error-message">{revisionListError}</div>
            )}
            {error && <div className="error-message">{error}</div>}

            {loading && (
              <div className="loading-message">데이터를 불러오는 중...</div>
            )}

            {!loading && !error && (
              <div className="tables-container" ref={tablesContainerRef}>
                <div className="table-section">
                  <h2>기준 투자 리스트</h2>
                  {data1.length > 0 ? (
                    <div
                      className="table-wrapper"
                      ref={table1Ref}
                      onMouseDown={handleTableMouseDown}
                      onSelectStart={(e) => e.preventDefault()}
                    >
                      <table className="data-table" data-table-id={1}>
                        <thead>
                          <tr>
                            <th
                              className="row-num-column"
                              data-row={0}
                              data-col={0}
                            >
                              #
                            </th>
                            {getOrderedHeaders(headers1).map(
                              (header, index) => (
                                <th
                                  key={index}
                                  data-row={0}
                                  data-col={index + 1}
                                >
                                  {header}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {data1.map((row, rowIndex) => (
                            <tr key={`t1-${rowIndex}`}>
                              <td
                                className={`row-num-column ${isCellInSelection(1, rowIndex + 1, 0) ? "cell-selected" : ""}`}
                                data-row={rowIndex + 1}
                                data-col={0}
                              >
                                {rowIndex + 1}
                              </td>
                              {getOrderedHeaders(headers1).map(
                                (header, colIndex) => (
                                  <td
                                    key={colIndex}
                                    data-row={rowIndex + 1}
                                    data-col={colIndex + 1}
                                    className={
                                      [
                                        isCellDifferent(rowIndex, header)
                                          ? "cell-different"
                                          : "",
                                        isCellInSelection(
                                          1,
                                          rowIndex + 1,
                                          colIndex + 1
                                        )
                                          ? "cell-selected"
                                          : "",
                                      ]
                                        .filter(Boolean)
                                        .join(" ") || undefined
                                    }
                                  >
                                    {row[header]}
                                  </td>
                                )
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

                <div className="table-section">
                  <h2>신규 투자 리스트</h2>
                  {data2.length > 0 ? (
                    <div
                      className="table-wrapper"
                      ref={table2Ref}
                      onMouseDown={handleTableMouseDown}
                      onSelectStart={(e) => e.preventDefault()}
                    >
                      <table className="data-table" data-table-id={2}>
                        <thead>
                          <tr>
                            <th
                              className="row-num-column"
                              data-row={0}
                              data-col={0}
                            >
                              #
                            </th>
                            {getOrderedHeaders(headers2).map(
                              (header, index) => (
                                <th
                                  key={index}
                                  data-row={0}
                                  data-col={index + 1}
                                >
                                  {header}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {data2.map((row, rowIndex) => (
                            <tr key={`t2-${rowIndex}`}>
                              <td
                                className={`row-num-column ${isCellInSelection(2, rowIndex + 1, 0) ? "cell-selected" : ""}`}
                                data-row={rowIndex + 1}
                                data-col={0}
                              >
                                {rowIndex + 1}
                              </td>
                              {getOrderedHeaders(headers2).map(
                                (header, colIndex) => (
                                  <td
                                    key={colIndex}
                                    data-row={rowIndex + 1}
                                    data-col={colIndex + 1}
                                    className={
                                      [
                                        isCellDifferent(rowIndex, header)
                                          ? "cell-different"
                                          : "",
                                        isCellInSelection(
                                          2,
                                          rowIndex + 1,
                                          colIndex + 1
                                        )
                                          ? "cell-selected"
                                          : "",
                                      ]
                                        .filter(Boolean)
                                        .join(" ") || undefined
                                    }
                                  >
                                    {row[header]}
                                  </td>
                                )
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
              className="scroll-snap-section"
              aria-label="비교 결과 구간"
            >
              <div className="changes-section">
                <h2>비교 결과</h2>
                {hasChanges ? (
                  <div className="changes-table-wrapper">
                    <table className="changes-table">
                      <thead>
                        <tr>
                          <th className="row-num-column">#</th>
                          {changedColumns.map((header, index) => (
                            <th key={index}>{header}</th>
                          ))}
                          <th className="type-column">변경 타입</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonResult.comparisonData.map(
                          (item, rowIndex) => {
                            const { rowData, rowDiff, type } = item;

                            return (
                              <tr
                                key={item.uniqueKey}
                                className={`type-${type}`}
                              >
                                <td className="row-num-column">
                                  {rowIndex + 1}
                                </td>
                                {changedColumns.map((column, colIndex) => {
                                  const diff = rowDiff[column];
                                  const hasChange = diff && diff.changed;

                                  return (
                                    <td
                                      key={colIndex}
                                      className={
                                        hasChange ? "cell-different" : ""
                                      }
                                    >
                                      {hasChange ? (
                                        <span className="cell-change-value">
                                          <span className="old-value">
                                            {diff.oldValue || "(비어있음)"}
                                          </span>
                                          <span className="change-arrow">
                                            {" "}
                                            →{" "}
                                          </span>
                                          <span className="new-value">
                                            {diff.newValue || "(비어있음)"}
                                          </span>
                                        </span>
                                      ) : (
                                        rowData[column] || ""
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
                          }
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="no-changes-message">
                    <p>✓ 모든 데이터가 동일합니다.</p>
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
