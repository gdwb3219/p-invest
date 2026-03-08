import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./HistoryPage.css";
import ToggleDashboard from "../components/toggle-history/ToggleDashboard";
const API_URL = "http://127.0.0.1:8080/api/sap-his-data/test";

// "BizName", "BizNum"을 항상 왼쪽 열로 두기 위한 헤더 정렬
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
  const [selectedPrimeKey, setSelectedPrimeKey] = useState(null);

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

  const headers =
    data.length > 0 ? getOrderedHeaders(Object.keys(data[0])) : [];

  return (
    <div className='page-container'>
      <div className='history-page'>
        <h1>이력 페이지</h1>
        <p>DB 최신 데이터를 테이블로 확인할 수 있습니다.</p>

        <div className='history-content'>
          <div className='history-toolbar'>
            <button
              type='button'
              className='history-refresh-btn'
              onClick={fetchLatestData}
              disabled={loading}
            >
              {loading ? "로딩 중..." : "새로고침"}
            </button>
          </div>

          {error && <div className='history-error'>{error}</div>}
          {loading && data.length === 0 && (
            <div className='history-loading'>데이터를 불러오는 중...</div>
          )}

          {!loading && data.length > 0 && (
            <div className='history-table-wrapper'>
              <table className='history-table'>
                <thead>
                  <tr>
                    <th className='history-row-num'>#</th>
                    {headers.map((h, i) => (
                      <th key={i}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, rowIndex) => {
                    const primeKey = row[PRIMEKEY_COLUMN] ?? row["prime_key"] ?? rowIndex;
                    const isSelected = selectedPrimeKey !== null && String(primeKey) === String(selectedPrimeKey);
                    return (
                      <tr
                        key={rowIndex}
                        onClick={() => setSelectedPrimeKey(String(primeKey))}
                        className={isSelected ? "history-row-selected" : ""}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedPrimeKey(String(primeKey));
                          }
                        }}
                        aria-pressed={isSelected}
                      >
                        <td className="history-row-num">{rowIndex + 1}</td>
                        {headers.map((header, colIndex) => (
                          <td key={colIndex}>{row[header] ?? ""}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && data.length === 0 && (
            <div className='history-empty'>표시할 데이터가 없습니다.</div>
          )}
        </div>

        <ToggleDashboard
          selectedPrimeKey={selectedPrimeKey}
          onClearSelection={() => setSelectedPrimeKey(null)}
        />
      </div>
    </div>
  );
}

export default HistoryPage;
