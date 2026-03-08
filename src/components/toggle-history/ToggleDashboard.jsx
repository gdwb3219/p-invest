import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import "./ToggleDashboard.css";

const API_BASE = "http://127.0.0.1:8080/api/sap-his-data";
/** 백엔드가 다른 키를 쓰면 변경 (예: PrimeKey) */
const PRIMEKEY_QUERY_PARAM = "prime_key";
const KEY_FIRST = ["PrimeKey", "BizName", "BizNum"];

const getOrderedHeaders = (headers) => {
  if (!headers || headers.length === 0) return headers || [];
  const first = KEY_FIRST.filter((k) => headers.includes(k));
  const rest = headers.filter((k) => !KEY_FIRST.includes(k));
  return [...first, ...rest];
};

function ToggleDashboard({ selectedPrimeKey, onClearSelection }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  console.log(
    "selectedPrimeKeyselectedPrimeKeyselectedPrimeKey",
    selectedPrimeKey,
  );

  useEffect(() => {
    if (!selectedPrimeKey) {
      setRows([]);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    axios
      .get(`${API_BASE}/by-primekey`, {
        params: { [PRIMEKEY_QUERY_PARAM]: selectedPrimeKey },
        signal: controller.signal,
      })
      .then((res) => {
        const raw = res.data;
        const list = Array.isArray(raw)
          ? raw
          : (raw?.data ??
            raw?.results ??
            raw?.sap_his_data ??
            [raw].filter(Boolean));
        setRows(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (axios.isCancel(err)) return;
        console.error("PrimeKey 이력 조회 오류:", err);
        setError(
          err.response?.data?.message ??
            err.message ??
            "해당 PrimeKey의 이력을 불러오지 못했습니다.",
        );
        setRows([]);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [selectedPrimeKey]);

  const headers = useMemo(() => {
    if (rows.length === 0) return [];
    return getOrderedHeaders(Object.keys(rows[0]));
  }, [rows]);

  if (!selectedPrimeKey) {
    return (
      <div className='toggle-dashboard toggle-dashboard-empty'>
        <p>
          위 테이블에서 행을 클릭하면, 해당 PrimeKey의 변경 이력(모든 행)을
          여기에 표시합니다.
        </p>
      </div>
    );
  }

  return (
    <div className='toggle-dashboard'>
      <div className='toggle-dashboard-header'>
        <h3>PrimeKey 이력: {selectedPrimeKey}</h3>
        {onClearSelection && (
          <button
            type='button'
            className='toggle-dashboard-close'
            onClick={onClearSelection}
            aria-label='선택 해제'
          >
            선택 해제
          </button>
        )}
      </div>

      {loading && (
        <div className='toggle-dashboard-loading'>이력 불러오는 중...</div>
      )}
      {error && <div className='toggle-dashboard-error'>{error}</div>}

      {!loading && !error && rows.length > 0 && (
        <div className='toggle-dashboard-table-wrapper'>
          <table className='toggle-dashboard-table' border='1'>
            <thead>
              <tr>
                <th className='toggle-dashboard-row-num'>#</th>
                {headers.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td className='toggle-dashboard-row-num'>{rowIndex + 1}</td>
                  {headers.map((header, colIndex) => (
                    <td key={colIndex}>{row[header] ?? ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className='toggle-dashboard-empty-inner'>
          해당 PrimeKey로 저장된 이력이 없습니다.
        </div>
      )}
    </div>
  );
}

export default ToggleDashboard;
