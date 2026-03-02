import React from "react";
import { useEffect, useState } from "react";
const API_URL = "http://127.0.0.1:8080/api/sap-his-data/test";

function ToggleDashboard() {
  const [data, setData] = useState([]);
  const [expandedRows, setExpandedRows] = useState(new Set());

  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => setData(data))
      .catch((err) => console.error("Error fetching data:", err));
  }, []);

  const toggleRow = (PK) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(PK)) {
      newExpandedRows.delete(PK);
    } else {
      newExpandedRows.add(PK);
    }
    setExpandedRows(newExpandedRows);
  };

  return (
    <div className='dashboard-container'>
      <table border='1' style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>FK Code</th>
            <th>Name (Latest)</th>
            <th>Price (Latest)</th>
            <th>Import ID</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <React.Fragment key={row.PrimeKey}>
              {/* 1. 최신 데이터 행 (클릭 가능) */}
              <tr
                onClick={() => toggleRow(row.PrimeKey)}
                style={{
                  cursor: "pointer",
                  backgroundColor: "#f9f9f9",
                  fontWeight: "bold",
                }}
              >
                <td>
                  {row.PrimeKey} {expandedRows.has(row.PrimeKey) ? "▼" : "▶"}
                </td>
                <td>{row.latest_data.name}</td>
                <td>{row.latest_data.price}</td>
                <td>{row.latest_data.import_id} (최신)</td>
              </tr>

              {/* 2. 과거 이력 행 (Dropdown 영역) */}
              {expandedRows.has(row.PrimeKey) &&
                row.history.map((historyRow) => (
                  <tr
                    key={historyRow._id}
                    style={{ backgroundColor: "#fffbe6" }} // 시각적 구분을 위한 배경색
                  >
                    <td style={{ paddingLeft: "20px" }}>↳ History</td>
                    <td>{historyRow.name}</td>
                    <td>{historyRow.price}</td>
                    <td>{historyRow.import_id}</td>
                  </tr>
                ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ToggleDashboard;
