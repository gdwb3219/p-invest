import {
  useState,
  useLayoutEffect,
  useCallback,
  Fragment,
  useRef,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useApiUrl } from '../stores';
import HistoryChangeReasonCell from './HistoryPage/components/HistoryChangeReasonCell';
import {
  CHANGE_REASON_COLUMN,
  getRowImportId,
  getRowPrimeKey,
  splitHeaders,
} from './HistoryPage/historyReasonUtils';
import '../styles/pages/HistoryPage.css';
import LoadingSpinner from '../components/LoadingSpinner';
import OrbitalSpinner from '../components/OrbitalSpinner';
import FancySpinner from '../components/FancySpinner';

const SAP_HIS_TEST_PATH = '/sap-his-data/test';
const SAP_HIS_BASE_PATH = '/sap-his-data';

const KEY_FIRST = ['구분0 (사업명)', '구분0 순번'];
const getOrderedHeaders = (headers) => {
  if (!headers || headers.length === 0) return headers || [];
  const first = KEY_FIRST.filter((k) => headers.includes(k));
  const rest = headers.filter((k) => !KEY_FIRST.includes(k));
  return [...first, ...rest];
};

const PRIMEKEY_COLUMN = 'prime-key';
const SAP_HIS_LATEST_QUERY_KEY = 'sap_his_latest';
const SAP_HIS_BY_PRIMEKEY_QUERY_KEY = 'sap_his_by_primekey';

// axios.get 해온 데이터를 정규화하는 함수
const normalizeSapHisList = (raw) => {
  const list = Array.isArray(raw)
    ? raw
    : (raw?.data ?? raw?.results ?? raw?.sap_his_data ?? [raw].filter(Boolean));
  return Array.isArray(list) ? list : [];
};

// latest sap his data 를 가져오는 함수 QueryFn 사용
const fetchLatestSapHis = async (url) => {
  const response = await axios.get(url);
  return normalizeSapHisList(response.data);
};

// prime key 에 해당하는 sap his data 를 가져오는 함수 QueryFn
const fetchSapHisByPrimeKey = async (apiBase, primeKey) => {
  const response = await axios.get(`${apiBase}/by-primekey`, {
    params: { 'prime-key': primeKey },
  });
  return normalizeSapHisList(response.data);
};

// 오류 메시지를 반환하는 함수
const getQueryErrorMessage = (err, fallback) =>
  err?.response?.data?.message ?? err?.message ?? fallback;

// 변경사유를 저장하는 함수
const patchRowChangeReason = (row, value) => ({
  ...row,
  [CHANGE_REASON_COLUMN]: value,
});

// Main Page Component
// 히스토리 페이지 컴포넌트
function HistoryPage() {
  const { API_URL } = useApiUrl();
  const LATEST_API_URL = `${API_URL}${SAP_HIS_TEST_PATH}`;
  const API_BASE = `${API_URL}${SAP_HIS_BASE_PATH}`;

  // mutate 시 활용하는 queryClient
  const queryClient = useQueryClient();

  // 기본적인 useQuery 사용
  const {
    data = [],
    isFetching: loading,
    error: listError,
    refetch: refetchLatestData,
  } = useQuery({
    queryKey: [SAP_HIS_LATEST_QUERY_KEY, LATEST_API_URL],
    queryFn: async () => {
      try {
        return await fetchLatestSapHis(LATEST_API_URL);
      } catch (err) {
        console.error('이력 데이터 로드 오류:', err);
        throw err;
      }
    },
  });

  const error = listError
    ? getQueryErrorMessage(
        listError,
        '데이터를 불러오는 중 오류가 발생했습니다.',
      )
    : null;

  const [expandedPrimeKey, setExpandedPrimeKey] = useState(null);
  const [columnWidths, setColumnWidths] = useState([]);
  const tableRef = useRef(null);

  // prime key 에 해당하는 sap his data 를 가져오는 tan stack react query 함수
  const {
    data: expandedHistoryRows,
    isFetching: expandedHistoryLoading,
    error: expandedHistoryError,
  } = useQuery({
    queryKey: [SAP_HIS_BY_PRIMEKEY_QUERY_KEY, API_BASE, expandedPrimeKey],
    queryFn: async () => {
      try {
        return await fetchSapHisByPrimeKey(API_BASE, expandedPrimeKey);
      } catch (err) {
        console.error('PrimeKey 이력 조회 오류:', err);
        throw err;
      }
    },
    enabled: !!expandedPrimeKey,
  });

  const getHistoryState = useCallback(
    (keyStr) => {
      if (expandedPrimeKey === keyStr) {
        return {
          rows: expandedHistoryRows ?? [],
          loading: expandedHistoryLoading,
          error: expandedHistoryError
            ? getQueryErrorMessage(
                expandedHistoryError,
                '해당 PrimeKey의 이력을 불러오지 못했습니다.',
              )
            : null,
        };
      }

      const cached = queryClient.getQueryData([
        SAP_HIS_BY_PRIMEKEY_QUERY_KEY,
        API_BASE,
        keyStr,
      ]);
      if (cached) {
        return { rows: cached, loading: false, error: null };
      }

      return undefined;
    },
    [
      API_BASE,
      expandedHistoryError,
      expandedHistoryLoading,
      expandedHistoryRows,
      expandedPrimeKey,
      queryClient,
    ],
  );

  const toggleExpand = useCallback((primeKey) => {
    const key = String(primeKey);
    setExpandedPrimeKey((prev) => (prev === key ? null : key));
  }, []);

  const handleMainReasonSaved = useCallback(
    (rowIndex, value) => {
      queryClient.setQueryData(
        [SAP_HIS_LATEST_QUERY_KEY, LATEST_API_URL],
        (prev) => {
          if (!Array.isArray(prev)) return prev;
          return prev.map((row, i) =>
            i === rowIndex ? patchRowChangeReason(row, value) : row,
          );
        },
      );
    },
    [queryClient, LATEST_API_URL],
  );

  const handleHistoryReasonSaved = useCallback(
    (primeKeyStr, historyIndex, value) => {
      queryClient.setQueryData(
        [SAP_HIS_BY_PRIMEKEY_QUERY_KEY, API_BASE, primeKeyStr],
        (prev) => {
          if (!Array.isArray(prev)) return prev;
          return prev.map((row, i) =>
            i === historyIndex ? patchRowChangeReason(row, value) : row,
          );
        },
      );
    },
    [queryClient, API_BASE],
  );

  const allHeaders =
    data.length > 0 ? getOrderedHeaders(Object.keys(data[0])) : [];
  const { dataHeaders, hasReasonColumn } = splitHeaders(allHeaders);
  const colSpan = dataHeaders.length + 1 + (hasReasonColumn ? 1 : 0);

  useLayoutEffect(() => {
    if (!tableRef.current || data.length === 0 || expandedPrimeKey !== null)
      return;
    const ths = tableRef.current.querySelectorAll('thead th');
    if (ths.length) {
      setColumnWidths(Array.from(ths).map((th) => th.offsetWidth));
    }
  }, [data.length, expandedPrimeKey, hasReasonColumn]);

  const renderReasonHeader = () =>
    hasReasonColumn ? (
      <th className='history-col-reason'>{CHANGE_REASON_COLUMN}</th>
    ) : null;

  const renderReasonCell = (row, onSaved, primeKeyFallback) =>
    hasReasonColumn ? (
      <td className='history-col-reason'>
        <HistoryChangeReasonCell
          key={`${getRowImportId(row)}-${getRowPrimeKey(row, primeKeyFallback)}`}
          row={row}
          apiBase={API_BASE}
          primeKeyFallback={primeKeyFallback}
          onSaved={onSaved}
        />
      </td>
    ) : null;

  return (
    <div className='page-container'>
      <div className='history-page'>
        <h1>이력 페이지</h1>
        <p>행을 클릭하면 해당 PrimeKey의 변경 이력이 바로 아래에 펼쳐집니다.</p>
        <div className='history-content'>
          <div className='history-toolbar'>
            <button
              type='button'
              className='history-refresh-btn'
              onClick={() => void refetchLatestData()}
              disabled={loading}
            >
              {loading ? '로딩 중...' : '새로고침'}
            </button>
          </div>

          {error && <div className='history-error'>{error}</div>}
          {loading && data.length === 0 && (
            <div className='history-loading'>데이터를 불러오는 중...</div>
          )}

          {!loading && data.length > 0 && (
            <div className='history-table-wrapper'>
              <table
                ref={tableRef}
                className={`history-table ${columnWidths.length === colSpan ? 'history-table--fixed' : ''}`}
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
                    <th className='history-row-num history-th-expand'>#</th>
                    {dataHeaders.map((h, i) => (
                      <th key={i}>{h}</th>
                    ))}
                    {renderReasonHeader()}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, rowIndex) => {
                    const primeKey =
                      row[PRIMEKEY_COLUMN] ?? row['prime_key'] ?? rowIndex;
                    const keyStr = String(primeKey);
                    const isExpanded = expandedPrimeKey === keyStr;
                    const history = getHistoryState(keyStr);

                    return (
                      <Fragment key={`row-${rowIndex}`}>
                        <tr
                          onClick={() => toggleExpand(primeKey)}
                          className={isExpanded ? 'history-row-selected' : ''}
                          role='button'
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleExpand(primeKey);
                            }
                          }}
                          aria-expanded={isExpanded}
                        >
                          <td className='history-row-num history-td-expand'>
                            <span
                              className={`history-expand-icon ${isExpanded ? 'history-expand-icon--open' : ''}`}
                              aria-hidden
                            >
                              ▶
                            </span>
                            {rowIndex + 1}
                          </td>
                          {dataHeaders.map((header, colIndex) => (
                            <td key={colIndex}>{row[header] ?? ''}</td>
                          ))}
                          {renderReasonCell(row, (value) =>
                            handleMainReasonSaved(rowIndex, value),
                          )}
                        </tr>
                        <tr
                          className={`history-accordion-row ${isExpanded ? 'history-accordion-row--open' : ''}`}
                          aria-hidden={!isExpanded}
                        >
                          <td
                            className='history-accordion-td'
                            colSpan={colSpan}
                          >
                            <div
                              className={`history-accordion-cell ${isExpanded ? 'history-accordion-cell--open' : ''}`}
                            >
                              <div className='history-accordion-inner'>
                                {(isExpanded || history) && (
                                  <>
                                    {history?.loading && (
                                      <div className='history-accordion-message history-accordion-message--loading'>
                                        <OrbitalSpinner
                                          size='md'
                                          label='LOADING...'
                                        />
                                      </div>
                                    )}
                                    {history?.error && !history?.loading && (
                                      <div className='history-accordion-message history-accordion-message--error'>
                                        {history.error}
                                      </div>
                                    )}
                                    {!history?.loading &&
                                      !history?.error &&
                                      history?.rows?.length === 0 && (
                                        <div className='history-accordion-message history-accordion-message--empty'>
                                          해당 PrimeKey로 저장된 이력이
                                          없습니다.
                                        </div>
                                      )}
                                    {!history?.loading &&
                                      !history?.error &&
                                      history?.rows?.length > 0 && (
                                        <table className='history-accordion-table'>
                                          {columnWidths.length === colSpan && (
                                            <colgroup>
                                              {columnWidths.map((w, i) => (
                                                <col
                                                  key={i}
                                                  style={{ width: w }}
                                                />
                                              ))}
                                            </colgroup>
                                          )}
                                          <tbody>
                                            {history.rows.map((hisRow, i) => (
                                              <tr key={`his-${keyStr}-${i}`}>
                                                <td className='history-accordion-td-num'>
                                                  {i + 1}
                                                </td>
                                                {dataHeaders.map((header) => (
                                                  <td key={header}>
                                                    {hisRow[header] ?? ''}
                                                  </td>
                                                ))}
                                                {renderReasonCell(
                                                  hisRow,
                                                  (value) =>
                                                    handleHistoryReasonSaved(
                                                      keyStr,
                                                      i,
                                                      value,
                                                    ),
                                                  keyStr,
                                                )}
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
            <div className='history-empty'>표시할 데이터가 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HistoryPage;
