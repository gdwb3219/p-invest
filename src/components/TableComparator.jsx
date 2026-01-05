import { useState, useEffect } from 'react';
import ComparisonTable from './ComparisonTable';
import { compareTables } from '../utils/tableComparison';
import { fetchTableDataFromMongoDB } from '../services/tableService';
import { useChangeReasons } from '../hooks/useChangeReasons';
import './TableComparator.css';

function TableComparator() {
  const [table1, setTable1] = useState([]);
  const [table2, setTable2] = useState([]);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [table1Headers, setTable1Headers] = useState([]);
  const [table2Headers, setTable2Headers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { changeReasons, saveReason } = useChangeReasons();

  // 컴포넌트 마운트 시 MongoDB에서 데이터 로드
  useEffect(() => {
    loadTableData();
  }, []);

  const loadTableData = async () => {
    setLoading(true);
    try {
      // MongoDB에서 데이터 가져오기 시뮬레이션
      const [data1, data2] = await Promise.all([
        fetchTableDataFromMongoDB(1),
        fetchTableDataFromMongoDB(2)
      ]);

      setTable1(data1);
      setTable2(data2);
      
      // 헤더 추출
      if (data1.length > 0) {
        setTable1Headers(Object.keys(data1[0]));
      }
      if (data2.length > 0) {
        setTable2Headers(Object.keys(data2[0]));
      }

      // 자동으로 비교 실행
      if (data1.length > 0 && data2.length > 0) {
        const result = compareTables(data1, data2, Object.keys(data1[0]), Object.keys(data2[0]));
        setComparisonResult(result);
      }
    } catch (error) {
      console.error('데이터 로드 오류:', error);
      alert('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = () => {
    if (table1.length === 0 || table2.length === 0) {
      alert('두 테이블 모두 데이터를 입력해주세요.');
      return;
    }

    const result = compareTables(table1, table2, table1Headers, table2Headers);
    setComparisonResult(result);
  };

  const handleClear = () => {
    setTable1([]);
    setTable2([]);
    setTable1Headers([]);
    setTable2Headers([]);
    setComparisonResult(null);
  };

  const handleChangeReasonSubmit = async (rowIndex, column, reason) => {
    await saveReason(rowIndex, column, reason);
  };

  return (
    <div className="table-comparator">
      <h1>테이블 비교 도구</h1>
      <p className="subtitle">MongoDB에서 가져온 데이터를 비교하여 차이점을 찾아냅니다.</p>
      
      <div className="action-buttons">
        <button onClick={loadTableData} className="load-btn" disabled={loading}>
          {loading ? '로딩 중...' : '데이터 다시 불러오기'}
        </button>
        <button onClick={handleCompare} className="compare-btn">
          비교하기
        </button>
        <button onClick={handleClear} className="clear-btn">
          초기화
        </button>
      </div>

      {loading && (
        <div className="loading-message">
          MongoDB에서 데이터를 불러오는 중...
        </div>
      )}

      {comparisonResult && !loading && (
        <div className="result-section">
          <h2>비교 결과</h2>
          <div className="result-summary">
            <div className="summary-item">
              <span className="summary-label">총 차이 행:</span>
              <span className="summary-value">{comparisonResult.differentRows.length}개</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">총 차이 셀:</span>
              <span className="summary-value">{comparisonResult.totalDifferences}개</span>
            </div>
          </div>
          <ComparisonTable
            table1={table1}
            table2={table2}
            table1Headers={table1Headers}
            table2Headers={table2Headers}
            comparisonResult={comparisonResult}
            changeReasons={changeReasons}
            onChangeReasonSubmit={handleChangeReasonSubmit}
          />
        </div>
      )}
    </div>
  );
}

export default TableComparator;
