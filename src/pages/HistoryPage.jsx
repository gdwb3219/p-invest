import { useState, useEffect, useLayoutEffect, useCallback, Fragment, useRef } from "react";
import axios from "axios";
import "./HistoryPage.css";

const API_URL = "http://127.0.0.1:8080/api/sap-his-data/test";
const API_BASE = "http://127.0.0.1:8080/api/sap-his-data";
const PRIMEKEY_QUERY_PARAM = "prime_key";

const KEY_FIRST = ["BizName", "BizNum"];
const getOrderedHeaders = (headers) => {
  if (!headers || headers.length === 0) return headers || [];
  const first = KEY_FIRST.filter((k) => headers.includes(k));
  const rest = headers.filter((k) => !KEY_FIRST.includes(k));
  return [...first, ...rest];
};

const PRIMEKEY_COLUMN = "PrimeKey";

function HistoryPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedPrimeKey, setExpandedPrimeKey] = useState(null);
  const [historyByPrimeKey, setHistoryByPrimeKey] = useState({});
  const [columnWidths, setColumnWidths] = useState([]);
  const tableRef = useRef(null);

  const fetchLatestData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(API_URL);
      const raw = response.data;
      const list = Array.isArray(raw)
        ? raw
        : (raw?.data ??
          raw?.results ??
          raw?.sap_his_data ??
          [raw].filter(Boolean));
      setData(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("이력 데이터 로드 오류:", err);
      setError(
        err.response?.data?.message ??
          err.message ??
          "데이터를 불러오는 중 오류가 발생했습니다.",
      );
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLatestData();
  }, [fetchLatestData]);

  const fetchHistory = useCallback((primeKey) => {
    const key = String(primeKey);
    setHistoryByPrimeKey((prev) => ({
      ...prev,
      [key]: { ...prev[key], loading: true, error: null },
    }));
    axios
      .get(`${API_BASE}/by-primekey`, {
        params: { [PRIMEKEY_QUERY_PARAM]: primeKey },
      })
      .then((res) => {
        const raw = res.data;
        const list = Array.isArray(raw)
          ? raw
          : (raw?.data ??
            raw?.results ??
            raw?.sap_his_data ??
            [raw].filter(Boolean));
        setHistoryByPrimeKey((prev) => ({
          ...prev,
          [key]: { rows: Array.isArray(list) ? list : [], loading: false, error: null },
        }));
      })
      .catch((err) => {
        console.error("PrimeKey 이력 조회 오류:", err);
        setHistoryByPrimeKey((prev) => ({
          ...prev,
          [key]: {
            rows: [],
            loading: false,
            error:
              err.response?.data?.message ??
              err.message ??
              "해당 PrimeKey의 이력을 불러오지 못했습니다.",
          },
        }));
      });
  }, []);

  const toggleExpand = useCallback(
    (primeKey) => {
      const key = String(primeKey);
      setExpandedPrimeKey((prev) => (prev === key ? null : key));
      if (!historyByPrimeKey[key]) {
        fetchHistory(primeKey);
      }
    },
    [historyByPrimeKey, fetchHistory],
  );

  const headers =
    data.length > 0 ? getOrderedHeaders(Object.keys(data[0])) : [];
  const colSpan = headers.length + 1;

  // 아코디언이 닫혀 있을 때만 열 너비 측정 (펼친 뒤 측정하면 이미 넓어진 테이블 기준으로 잡혀 계속 넓어짐)
  useLayoutEffect(() => {
    if (!tableRef.current || data.length === 0 || expandedPrimeKey !== null)
      return;
    const ths = tableRef.current.querySelectorAll("thead th");
    if (ths.length) {
      setColumnWidths(Array.from(ths).map((th) => th.offsetWidth));
    }
  }, [data.length, expandedPrimeKey]);

  return (
    <div className="page-container">
      <div className="history-page">
        <h1>이력 페이지</h1>
        <p>행을 클릭하면 해당 PrimeKey의 변경 이력이 바로 아래에 펼쳐집니다.</p>

        <div className="history-content">
          <div className="history-toolbar">
            <button
              type="button"
              className="history-refresh-btn"
              onClick={fetchLatestData}
              disabled={loading}
            >
              {loading ? "로딩 중..." : "새로고침"}
            </button>
          </div>

          {error && <div className="history-error">{error}</div>}
          {loading && data.length === 0 && (
            <div className="history-loading">데이터를 불러오는 중...</div>
          )}

          {!loading && data.length > 0 && (
            <div className="history-table-wrapper">
              <table
                ref={tableRef}
                className={`history-table ${columnWidths.length === colSpan ? "history-table--fixed" : ""}`}
              >
                {columnWidths.length === colSpan && (
                  <colgroup>
                    {columnWidths.map((w, i) => (
                      <col key={i} style={{ width: w }} />
                    ))}
                  </colgroup>
                )}
                <thead>
                  <tr>
                    <th className="history-row-num history-th-expand">#</th>
                    {headers.map((h, i) => (
                      <th key={i}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, rowIndex) => {
                    const primeKey =
                      row[PRIMEKEY_COLUMN] ?? row["prime_key"] ?? rowIndex;
                    const keyStr = String(primeKey);
                    const isExpanded = expandedPrimeKey === keyStr;
                    const history = historyByPrimeKey[keyStr];

                    return (
                      <Fragment key={`row-${rowIndex}`}>
                        <tr
                          onClick={() => toggleExpand(primeKey)}
                          className={
                            isExpanded ? "history-row-selected" : ""
                          }
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleExpand(primeKey);
                            }
                          }}
                          aria-expanded={isExpanded}
                        >
                          <td className="history-row-num history-td-expand">
                            <span
                              className={`history-expand-icon ${isExpanded ? "history-expand-icon--open" : ""}`}
                              aria-hidden
                            >
                              ▶
                            </span>
                            {rowIndex + 1}
                          </td>
                          {headers.map((header, colIndex) => (
                            <td key={colIndex}>
                              {row[header] ?? ""}
                            </td>
                          ))}
                        </tr>
                        <tr
                          className={`history-accordion-row ${isExpanded ? "history-accordion-row--open" : ""}`}
                          aria-hidden={!isExpanded}
                        >
                          <td className="history-accordion-td" colSpan={colSpan}>
                            <div
                              className={`history-accordion-cell ${isExpanded ? "history-accordion-cell--open" : ""}`}
                            >
                              <div className="history-accordion-inner">
                                {(isExpanded || history) && (
                                  <>
                                    {history?.loading && (
                                      <div className="history-accordion-message history-accordion-message--loading">
                                        이력 불러오는 중...
                                      </div>
                                    )}
                                    {history?.error && !history?.loading && (
                                      <div className="history-accordion-message history-accordion-message--error">
                                        {history.error}
                                      </div>
                                    )}
                                    {!history?.loading &&
                                      !history?.error &&
                                      history?.rows?.length === 0 && (
                                        <div className="history-accordion-message history-accordion-message--empty">
                                          해당 PrimeKey로 저장된 이력이 없습니다.
                                        </div>
                                      )}
                                    {!history?.loading &&
                                      !history?.error &&
                                      history?.rows?.length > 0 && (
                                        <table className="history-accordion-table">
                                          {columnWidths.length === colSpan && (
                                            <colgroup>
                                              {columnWidths.map((w, i) => (
                                                <col key={i} style={{ width: w }} />
                                              ))}
                                            </colgroup>
                                          )}
                                          <tbody>
                                            {history.rows.map((hisRow, i) => (
                                              <tr key={`his-${keyStr}-${i}`}>
                                                <td className="history-accordion-td-num">
                                                  {i + 1}
                                                </td>
                                                {headers.map((header) => (
                                                  <td key={header}>
                                                    {hisRow[header] ?? ""}
                                                  </td>
                                                ))}
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      )}
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && data.length === 0 && (
            <div className="history-empty">표시할 데이터가 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HistoryPage;
