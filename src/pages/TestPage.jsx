import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './TestPage.css';

function TestPage() {
  const [data1, setData1] = useState([]);
  const [data2, setData2] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const table1Ref = useRef(null);
  const table2Ref = useRef(null);
  const isScrollingRef = useRef(false);

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

    table1.addEventListener('scroll', handleScroll1);
    table2.addEventListener('scroll', handleScroll2);

    return () => {
      table1.removeEventListener('scroll', handleScroll1);
      table2.removeEventListener('scroll', handleScroll2);
    };
  }, [data1, data2]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('http://127.0.0.1:8080/api/mongo-data/');
      const data = response.data;
      
      // 동일한 데이터를 data1, data2로 사용
      setData1(data);
      setData2(data);
    } catch (err) {
      console.error('데이터 가져오기 오류:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 테이블 헤더 추출
  const getHeaders = (data) => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  };

  const headers1 = getHeaders(data1);
  const headers2 = getHeaders(data2);

  return (
    <div className="page-container">
      <div className="test-page">
        <h1>MongoDB 데이터 테이블</h1>
        <p>MongoDB에서 가져온 데이터를 테이블로 표시합니다.</p>
        
        <div className="test-content">
          <button onClick={fetchData} className="refresh-btn" disabled={loading}>
            {loading ? '로딩 중...' : '데이터 새로고침'}
          </button>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {loading && (
            <div className="loading-message">
              데이터를 불러오는 중...
            </div>
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
                              <td key={colIndex}>{row[header]}</td>
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
                              <td key={colIndex}>{row[header]}</td>
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
        </div>
      </div>
    </div>
  );
}

export default TestPage;

