import { useState, useEffect } from 'react';
import { fetchTableDataFromMongoDB } from '../services/tableService';

/**
 * 테이블 데이터를 가져오는 커스텀 훅
 * @param {number} tableNumber - 테이블 번호 (1 또는 2)
 * @returns {Object} { data, loading, error, refetch }
 */
export function useTableData(tableNumber) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchTableDataFromMongoDB(tableNumber);
      setData(result);
    } catch (err) {
      setError(err.message);
      console.error('데이터 로드 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tableNumber]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

