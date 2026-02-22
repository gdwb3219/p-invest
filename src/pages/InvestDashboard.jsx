import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import RevSelector from "../components/rev-compare/RevSelector";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
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
  const [dashData, setDashData] = useState([]);
  const [dashPieData, setDashPieData] = useState([]);
  const [dashLineData, setDashLineData] = useState([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingDash, setLoadingDash] = useState(false);
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
        (r) => (r.id ?? r._id ?? r.import_id ?? String(r)) === selectedRevId
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
    return (
      keys.find(
        (k) =>
          k.toLowerCase() === "투자명" || k.toLowerCase().includes("투자명")
      ) ?? null
    );
  }, [rawData]);

  const rateKey = useMemo(() => {
    if (!rawData.length || !rawData[0]) return null;

    const keys = Object.keys(rawData[0]);

    // 디버깅용: 실제 어떤 키들이 들어있는지 콘솔에서 확인해보세요.
    // console.log("현재 데이터의 키 목록:", keys);

    return (
      keys.find((k) => {
        // 1. 양쪽 공백 제거
        const cleanKey = k.trim();
        // 2. 비교 대상 문자열도 공백 없이 검색
        return cleanKey.includes("예산(억원)");
      }) ?? null
    );
  }, [rawData]);


  const genderChartData = useMemo(() => {
    if (!genderKey || !rawData.length) return [];
    const countBy = {};
    rawData.forEach((row) => {
      const v = row[genderKey];
      const label =
        v != null && String(v).trim() !== "" ? String(v).trim() : "(비어있음)";
      countBy[label] = (countBy[label] ?? 0) + 1;
    });
    return Object.entries(countBy).map(([name, value]) => ({ name, value }));
  }, [rawData, genderKey]);

  const rateChartData = useMemo(() => {
    if (!rateKey || !rawData.length) return [];
    const countBy = {};
    rawData.forEach((row) => {
      const v = row[rateKey];
      const label =
        v != null && String(v).trim() !== "" ? String(v).trim() : "(비어있음)";
      countBy[label] = (countBy[label] ?? 0) + 1;
    });
    return Object.entries(countBy)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [rawData, rateKey]);


  const hasCharts = genderChartData.length > 0 || rateChartData.length > 0;

  const handleDash = async () => {
    setLoadingDash(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE}/api/sap-his-data/dash`);
      const data = res.data ?? {};
      setDashData(Array.isArray(data.chartData) ? data.chartData : []);
      setDashPieData(Array.isArray(data.pieData) ? data.pieData : []);
      setDashLineData(Array.isArray(data.lineData) ? data.lineData : []);
    } catch (err) {
      console.error("Dash 데이터 조회 실패:", err);
      setError("대시 차트 데이터를 불러올 수 없습니다.");
      setDashData([]);
      setDashPieData([]);
      setDashLineData([]);
    } finally {
      setLoadingDash(false);
    }
  };

  const dashBarDataKeys = useMemo(() => {
    if (!dashData.length || !dashData[0]) return { nameKey: "name", valueKey: "value" };
    const keys = Object.keys(dashData[0]);
    const nameKey =
      keys.find((k) => k.toLowerCase() === "name" || k === "name") ?? keys[0];
    const valueKey =
      keys.find(
        (k) =>
          k !== nameKey &&
          (typeof dashData[0][k] === "number" ||
            k.toLowerCase().includes("value") ||
            k.toLowerCase().includes("count"))
      ) ?? keys[1] ?? "value";
    return { nameKey, valueKey };
  }, [dashData]);

  const dashPieDataKeys = useMemo(() => {
    if (!dashPieData.length || !dashPieData[0]) return { nameKey: "name", valueKey: "value" };
    const keys = Object.keys(dashPieData[0]);
    const nameKey = keys.find((k) => k.toLowerCase() === "name" || k === "name") ?? keys[0];
    const valueKey =
      keys.find(
        (k) =>
          k !== nameKey &&
          (typeof dashPieData[0][k] === "number" || k.toLowerCase().includes("value"))
      ) ?? keys[1] ?? "value";
    return { nameKey, valueKey };
  }, [dashPieData]);

  const dashLineDataKeys = useMemo(() => {
    if (!dashLineData.length || !dashLineData[0]) return { nameKey: "name", lineKeys: [] };
    const keys = Object.keys(dashLineData[0]);
    const nameKey =
      keys.find((k) => k.toLowerCase() === "name" || k === "name") ?? keys[0];
    const lineKeys = keys.filter(
      (k) => k !== nameKey && typeof dashLineData[0][k] === "number"
    );
    return { nameKey, lineKeys };
  }, [dashLineData]);

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1>투자 대시보드</h1>
        <p>Revision 데이터의 투자명· 예산(억원) 기준 차트를 확인합니다.</p>
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
        <button
          type="button"
          className="dashboard-fetch-btn"
          onClick={handleDash}
          disabled={loadingDash}
        >
          {loadingDash ? "대시 로딩 중..." : "대시 차트 조회"}
        </button>
      </section>

      {loadingRevisions && (
        <div className="dashboard-message">Revision 목록을 불러오는 중...</div>
      )}
      {error && <div className="dashboard-error">{error}</div>}
      {loadingDash && (
        <div className="dashboard-message">대시 차트 데이터를 불러오는 중...</div>
      )}

      {!loadingData && rawData.length > 0 && !hasCharts && (
        <div className="dashboard-message dashboard-warning">
          이 데이터에는 투자명 또는 예산(억원) 컬럼이 없습니다.
        </div>
      )}

      {!loadingData && hasCharts && (
        <div className="dashboard-charts">
          {genderChartData.length > 0 && (
            <div className="chart-card">
              <h2>투자명 분포</h2>
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
              <h2> 예산(억원) 분포</h2>
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

      <span>대시 데이터</span>
      {!loadingDash && (dashData.length > 0 || dashPieData.length > 0 || dashLineData.length > 0) && (
        <div className="dashboard-charts">
          {dashData.length > 0 && (
            <div className="chart-card chart-card-wide">
              <h2>SAP 이력 대시 (Bar)</h2>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart
                  data={dashData}
                  margin={{ top: 16, right: 24, left: 16, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey={dashBarDataKeys.nameKey}
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey={dashBarDataKeys.valueKey}
                    name={dashBarDataKeys.valueKey}
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {dashPieData.length > 0 && (
            <div className="chart-card">
              <h2>SAP 이력 대시 (Pie)</h2>
              <ResponsiveContainer width="100%" height={360}>
                <PieChart>
                  <Pie
                    data={dashPieData}
                    dataKey={dashPieDataKeys.valueKey}
                    nameKey={dashPieDataKeys.nameKey}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ [dashPieDataKeys.nameKey]: name, [dashPieDataKeys.valueKey]: value }) => `${name}: ${value}`}
                  >
                    {dashPieData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, dashPieDataKeys.valueKey]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {dashLineData.length > 0 && dashLineDataKeys.lineKeys.length > 0 && (
            <div className="chart-card chart-card-wide">
              <h2>SAP 이력 대시 (다중 Line)</h2>
              <ResponsiveContainer width="100%" height={360}>
                <LineChart
                  data={dashLineData}
                  margin={{ top: 16, right: 24, left: 16, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey={dashLineDataKeys.nameKey}
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  {dashLineDataKeys.lineKeys.map((key, i) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={key}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default InvestDashboard;
