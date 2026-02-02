import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import RevSelector from "../components/rev-compare/RevSelector";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./InvestDashboard.css";

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b"];
const API_BASE = "http://127.0.0.1:8080";

function InvestDashboard() {
  const [revisions, setRevisions] = useState([]);
  const [selectedRevId, setSelectedRevId] = useState("");
  const [rawData, setRawData] = useState([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRevisions();
  }, []);

  const fetchRevisions = async () => {
    setLoadingRevisions(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE}/api/imports/rev-list/`);
      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.data ?? res.data?.results ?? [];
      setRevisions(list);
    } catch (err) {
      console.error("Revision 목록 조회 실패:", err);
      setError("Revision 목록을 불러올 수 없습니다.");
    } finally {
      setLoadingRevisions(false);
    }
  };

  const fetchRevData = async () => {
    if (!selectedRevId) {
      setError("Revision을 선택해주세요.");
      return;
    }
    setLoadingData(true);
    setError(null);
    try {
      const rev = revisions.find(
        (r) =>
          (r.id ?? r._id ?? r.import_id ?? String(r)) === selectedRevId
      );
      const importId = rev?.import_id ?? rev?.importId;
      if (!importId) {
        setError("선택한 Revision에 import_id가 없습니다.");
        setLoadingData(false);
        return;
      }
      const res = await axios.get(`${API_BASE}/api/imports/rev-data`, {
        params: { import_id: importId },
      });
      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.data ?? res.data?.results ?? res.data?.sap_his_data ?? [];
      setRawData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Rev 데이터 조회 실패:", err);
      setError("데이터를 불러올 수 없습니다.");
      setRawData([]);
    } finally {
      setLoadingData(false);
    }
  };

  const genderKey = useMemo(() => {
    if (!rawData.length || !rawData[0]) return null;
    const keys = Object.keys(rawData[0]);
    return keys.find(
      (k) => k.toLowerCase() === "gender" || k.toLowerCase().includes("gender")
    ) ?? null;
  }, [rawData]);

  const rateKey = useMemo(() => {
    if (!rawData.length || !rawData[0]) return null;
    const keys = Object.keys(rawData[0]);
    return keys.find(
      (k) => k.toLowerCase() === "rate" || k.toLowerCase().includes("rate")
    ) ?? null;
  }, [rawData]);

  const genderChartData = useMemo(() => {
    if (!genderKey || !rawData.length) return [];
    const countBy = {};
    rawData.forEach((row) => {
      const v = row[genderKey];
      const label = v != null && String(v).trim() !== "" ? String(v).trim() : "(비어있음)";
      countBy[label] = (countBy[label] ?? 0) + 1;
    });
    return Object.entries(countBy).map(([name, value]) => ({ name, value }));
  }, [rawData, genderKey]);

  const rateChartData = useMemo(() => {
    if (!rateKey || !rawData.length) return [];
    const countBy = {};
    rawData.forEach((row) => {
      const v = row[rateKey];
      const label = v != null && String(v).trim() !== "" ? String(v).trim() : "(비어있음)";
      countBy[label] = (countBy[label] ?? 0) + 1;
    });
    return Object.entries(countBy)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [rawData, rateKey]);

  const hasCharts = genderChartData.length > 0 || rateChartData.length > 0;

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1>투자 대시보드</h1>
        <p>Revision 데이터의 gender·rate 기준 차트를 확인합니다.</p>
      </header>

      <section className="dashboard-controls">
        <RevSelector
          label="Revision"
          id="dashboard-rev"
          value={selectedRevId}
          onChange={setSelectedRevId}
          revisions={revisions}
          disabled={loadingRevisions}
          placeholder="-- Revision 선택 --"
        />
        <button
          type="button"
          className="dashboard-fetch-btn"
          onClick={fetchRevData}
          disabled={loadingRevisions || loadingData || !selectedRevId}
        >
          {loadingData ? "로딩 중..." : "데이터 조회"}
        </button>
      </section>

      {loadingRevisions && (
        <div className="dashboard-message">Revision 목록을 불러오는 중...</div>
      )}
      {error && <div className="dashboard-error">{error}</div>}

      {!loadingData && rawData.length > 0 && !hasCharts && (
        <div className="dashboard-message dashboard-warning">
          이 데이터에는 gender 또는 rate 컬럼이 없습니다.
        </div>
      )}

      {!loadingData && hasCharts && (
        <div className="dashboard-charts">
          {genderChartData.length > 0 && (
            <div className="chart-card">
              <h2>Gender 분포</h2>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={genderChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {genderChartData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, "건수"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {rateChartData.length > 0 && (
            <div className="chart-card chart-card-wide">
              <h2>Rate 분포</h2>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={rateChartData}
                  margin={{ top: 16, right: 24, left: 16, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip formatter={(value) => [value, "건수"]} />
                  <Legend />
                  <Bar
                    dataKey="count"
                    name="건수"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default InvestDashboard;
