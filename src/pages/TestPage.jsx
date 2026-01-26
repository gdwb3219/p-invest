import { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import RevSelector from "../components/rev-compare/RevSelector";
import "./TestPage.css";

function TestPage() {
  const [data1, setData1] = useState([]);
  const [data2, setData2] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [revisions, setRevisions] = useState([]);
  const [selectedRevision1, setSelectedRevision1] = useState("");
  const [selectedRevision2, setSelectedRevision2] = useState("");
  const [loadingRevisions, setLoadingRevisions] = useState(false);
  const table1Ref = useRef(null);
  const table2Ref = useRef(null);
  const isScrollingRef = useRef(false);

  // Unique Key 생성 함수 (id + email 조합)
  const getUniqueKey = (row) => {
    const id = row.id !== undefined ? String(row.id) : '';
    const email = row.email !== undefined ? String(row.email) : '';
    return `${id}::${email}`;
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
    const allHeaders = [...new Set([...headers1, ...headers2])];

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
        // 삭제: data1에 있고 data2에 없음
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

    // 변경된 컬럼 추출
    const changedColumnsSet = new Set();
    comparisonData.forEach((item) => {
      Object.keys(item.rowDiff).forEach((column) => {
        if (item.rowDiff[column].changed) {
          changedColumnsSet.add(column);
        }
      });
    });

    return {
      comparisonData,
      rowTypeMap,
      changedColumns: Array.from(changedColumnsSet),
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
      const response = await axios.get("http://127.0.0.1:8080/api/imports/rev-list/");
      const revisionsData = Array.isArray(response.data)
        ? response.data
        : response.data?.data || response.data?.results || [];
      console.log("Revisions Data:", revisionsData);
      setRevisions(revisionsData);
    } catch (err) {
      console.error("Revision 목록 가져오기 오류:", err);
      setError("Revision 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoadingRevisions(false);
    }
  };

  const handleRevision1Change = (value) => {
    console.log("selectedRevision1 변경:", value);
    setSelectedRevision1(value);
  };

  const handleRevision2Change = (value) => {
    console.log("selectedRevision2 변경:", value);
    setSelectedRevision2(value);
  };

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
      setError("두 개의 revision을 모두 선택해주세요.");
      return;
    }
    console.log("조회 버튼 동작")
    setLoading(true);
    setError(null);
    try {
      // 선택된 revision에서 import_id 추출
      // 다양한 형태의 ID 필드 지원 (id, _id, import_id 등)
      const getRevisionId = (r) => r.id || r._id || r.import_id || String(r);
      const revision1 = revisions.find((r) => getRevisionId(r) === selectedRevision1);
      const revision2 = revisions.find((r) => getRevisionId(r) === selectedRevision2);

      console.log("revision1:", revision1);
      console.log("revision2:", revision2); 
      console.log("selectedRevision1:", selectedRevision1);
      console.log("selectedRevision2:", selectedRevision2);

      if (!revision1 || !revision2) {
        setError("선택된 revision을 찾을 수 없습니다.");
        setLoading(false);
        return;
      }

      const importId1 = revision1.import_id || revision1.importId;
      const importId2 = revision2.import_id || revision2.importId;

      if (!importId1 || !importId2) {
        setError("선택된 revision에 import_id가 없습니다.");
        setLoading(false);
        return;
      }

      // 두 개의 API에서 병렬로 sap_his_data 가져오기
      console.log("importId1:", importId1);
      console.log("importId2:", importId2);
      const [response1, response2] = await Promise.all([
        axios.get(`http://127.0.0.1:8080/api/imports/rev-data`, {params: {import_id: importId1}}),
        axios.get(`http://127.0.0.1:8080/api/imports/rev-data`, {params: {import_id: importId2}}),
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

      setData1(data1Array);
      setData2(data2Array);
    } catch (err) {
      console.error("데이터 가져오기 오류:", err);
      setError("데이터를 불러오는 중 오류가 발생했습니다: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
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
  const hasChanges = comparisonResult && comparisonResult.comparisonData.length > 0;

  return (
    <div className="page-container">
      <div className="test-page">
        <h1>투자 데이터 비교 페이지</h1>
        <p>MongoDB에서 가져온 데이터를 테이블로 표시합니다.</p>

        <div className="test-content">
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
              disabled={loading || loadingRevisions || !selectedRevision1 || !selectedRevision2}
            >
              {loading ? "로딩 중..." : "조회"}
            </button>
          </div>

          {loadingRevisions && (
            <div className="loading-message">Revision 목록을 불러오는 중...</div>
          )}

          {error && <div className="error-message">{error}</div>}

          {loading && (
            <div className="loading-message">데이터를 불러오는 중...</div>
          )}

          {!loading && !error && (
            <div className="tables-container">
              <div className="table-section">
                <h2>기준 투자 리스트</h2>
                {data1.length > 0 ? (
                  <div className="table-wrapper" ref={table1Ref}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          {headers1.map((header, index) => (
                            <th key={index}>{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data1.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {headers1.map((header, colIndex) => (
                              <td
                                key={colIndex}
                                className={
                                  isCellDifferent(rowIndex, header)
                                    ? "cell-different"
                                    : ""
                                }
                              >
                                {row[header]}
                              </td>
                            ))}
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
                  <div className="table-wrapper" ref={table2Ref}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          {headers2.map((header, index) => (
                            <th key={index}>{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data2.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {headers2.map((header, colIndex) => (
                              <td
                                key={colIndex}
                                className={
                                  isCellDifferent(rowIndex, header)
                                    ? "cell-different"
                                    : ""
                                }
                              >
                                {row[header]}
                              </td>
                            ))}
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

          {/* 변경사항만 보여주는 테이블 */}
          {!loading && !error && data1.length > 0 && data2.length > 0 && (
            <div className="changes-section">
              <h2>비교 결과</h2>
              {hasChanges ? (
                <div className="changes-table-wrapper">
                  <table className="changes-table">
                    <thead>
                      <tr>
                        {changedColumns.map((header, index) => (
                          <th key={index}>{header}</th>
                        ))}
                        <th className="type-column">변경 타입</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonResult.comparisonData.map((item) => {
                        const { rowData, rowDiff, type } = item;

                        return (
                          <tr key={item.uniqueKey} className={`type-${type}`}>
                            {changedColumns.map((column, colIndex) => {
                              const diff = rowDiff[column];
                              const hasChange = diff && diff.changed;

                              return (
                                <td
                                  key={colIndex}
                                  className={hasChange ? "cell-different" : ""}
                                >
                                  {hasChange ? (
                                    <span className="cell-change-value">
                                      <span className="old-value">
                                        {diff.oldValue || "(비어있음)"}
                                      </span>
                                      <span className="change-arrow"> → </span>
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
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="no-changes-message">
                  <p>✓ 모든 데이터가 동일합니다.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TestPage;
