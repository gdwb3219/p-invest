import { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { compareTables } from "../utils/tableComparison";
import "./TestPage.css";

function TestPage() {
  const [data1, setData1] = useState([]);
  const [data2, setData2] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const table1Ref = useRef(null);
  const table2Ref = useRef(null);
  const isScrollingRef = useRef(false);

  // 테이블 비교 결과
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
    return compareTables(data1, data2, headers1, headers2);
  }, [data1, data2]);

  useEffect(() => {
    fetchData();
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
    setLoading(true);
    setError(null);
    try {
      // 두 개의 API에서 병렬로 데이터 가져오기
      const [response1, response2] = await Promise.all([
        axios.get("http://127.0.0.1:8080/api/mongo-data1/"),
        axios.get("http://127.0.0.1:8080/api/mongo-data2/"),
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
          [response1.data].filter(Boolean);
      const data2Array = Array.isArray(response2.data)
        ? response2.data
        : response2.data?.data ||
          response2.data?.results ||
          [response2.data].filter(Boolean);

      console.log("Processed Data 1:", data1Array);
      console.log("Processed Data 2:", data2Array);

      setData1(data1Array);
      setData2(data2Array);
    } catch (err) {
      console.error("데이터 가져오기 오류:", err);
      setError("데이터를 불러오는 중 오류가 발생했습니다.");
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

  // 셀이 차이가 있는지 확인
  const isCellDifferent = (rowIndex, column) => {
    if (!comparisonResult) return false;
    const key = `${rowIndex}_${column}`;
    return !!comparisonResult.cellDifferences[key];
  };

  // 변경이 있는 컬럼 목록 추출
  const getChangedColumns = () => {
    if (!comparisonResult) return [];

    const changedColumnsSet = new Set();
    comparisonResult.differentRows.forEach((rowIndex) => {
      const rowDiff = comparisonResult.rowDifferences[rowIndex];
      Object.keys(rowDiff).forEach((column) => {
        if (rowDiff[column].changed) {
          changedColumnsSet.add(column);
        }
      });
    });

    return Array.from(changedColumnsSet);
  };

  const changedColumns = getChangedColumns();
  const hasChanges = changedColumns.length > 0;

  return (
    <div className="page-container">
      <div className="test-page">
        <h1>MongoDB 데이터 테이블</h1>
        <p>MongoDB에서 가져온 데이터를 테이블로 표시합니다.</p>

        <div className="test-content">
          <button
            onClick={fetchData}
            className="refresh-btn"
            disabled={loading}
          >
            {loading ? "로딩 중..." : "데이터 새로고침"}
          </button>

          {error && <div className="error-message">{error}</div>}

          {loading && (
            <div className="loading-message">데이터를 불러오는 중...</div>
          )}

          {!loading && !error && (
            <div className="tables-container">
              <div className="table-section">
                <h2>Data 1</h2>
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
                <h2>Data 2</h2>
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
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonResult.differentRows.map((rowIndex) => {
                        const row1 = data1[rowIndex] || {};
                        const row2 = data2[rowIndex] || {};
                        const rowDiff =
                          comparisonResult.rowDifferences[rowIndex];

                        return (
                          <tr key={rowIndex}>
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
                                    row1[column] || row2[column] || ""
                                  )}
                                </td>
                              );
                            })}
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
