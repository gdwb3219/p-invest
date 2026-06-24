import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useApiUrl } from '../stores';
import HistoryVirtualTable from './HistoryPage/components/HistoryVirtualTable';
import HistoryDetailDrawer from './HistoryPage/components/HistoryDetailDrawer';
import HistoryRevMetaBar from './HistoryPage/components/HistoryRevMetaBar';
import { CHANGE_REASON_COLUMN, splitHeaders } from './HistoryPage/historyReasonUtils';
import {
  buildRevMeta,
  normalizeRevisionsList,
  resolveCurrentRevision,
} from './HistoryPage/historyRevUtils';
import '../styles/pages/HistoryPage.css';

const SAP_HIS_TEST_PATH = '/sap-his-data/test';
const SAP_HIS_BASE_PATH = '/sap-his-data';
const REVISIONS_LIST_PATH = '/imports/rev-list/';

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

const normalizeSapHisList = (raw) => {
  const list = Array.isArray(raw)
    ? raw
    : (raw?.data ?? raw?.results ?? raw?.sap_his_data ?? [raw].filter(Boolean));
  return Array.isArray(list) ? list : [];
};

const fetchLatestSapHis = async (latestUrl, revisionsUrl) => {
  const [latestResponse, revisionsResponse] = await Promise.all([
    axios.get(latestUrl),
    axios.get(revisionsUrl).catch((err) => {
      console.warn('Revision 목록 조회 실패:', err);
      return { data: [] };
    }),
  ]);

  const rows = normalizeSapHisList(latestResponse.data);
  const revisions = normalizeRevisionsList(revisionsResponse.data);
  const revision = resolveCurrentRevision(revisions, rows);
  const revMeta = buildRevMeta(revision, rows);

  return { rows, revision, revMeta };
};

const fetchSapHisByPrimeKey = async (apiBase, primeKey) => {
  const response = await axios.get(`${apiBase}/by-primekey`, {
    params: { 'prime-key': primeKey },
  });
  return normalizeSapHisList(response.data);
};

const getQueryErrorMessage = (err, fallback) =>
  err?.response?.data?.message ?? err?.message ?? fallback;

const patchRowChangeReason = (row, value) => ({
  ...row,
  [CHANGE_REASON_COLUMN]: value,
});

function HistoryPage() {
  const { API_URL } = useApiUrl();
  const LATEST_API_URL = `${API_URL}${SAP_HIS_TEST_PATH}`;
  const REVISIONS_LIST_URL = `${API_URL}${REVISIONS_LIST_PATH}`;
  const API_BASE = `${API_URL}${SAP_HIS_BASE_PATH}`;
  const queryClient = useQueryClient();

  const [selectedPrimeKey, setSelectedPrimeKey] = useState(null);

  const {
    data: latestData,
    isFetching: loading,
    error: listError,
    refetch: refetchLatestData,
  } = useQuery({
    queryKey: [SAP_HIS_LATEST_QUERY_KEY, LATEST_API_URL, REVISIONS_LIST_URL],
    queryFn: async () => {
      try {
        return await fetchLatestSapHis(LATEST_API_URL, REVISIONS_LIST_URL);
      } catch (err) {
        console.error('이력 데이터 로드 오류:', err);
        throw err;
      }
    },
  });

  const data = latestData?.rows ?? [];
  const revMeta = latestData?.revMeta ?? null;

  const error = listError
    ? getQueryErrorMessage(
        listError,
        '데이터를 불러오는 중 오류가 발생했습니다.',
      )
    : null;

  const {
    data: detailHistoryRows = [],
    isFetching: detailHistoryLoading,
    error: detailHistoryError,
  } = useQuery({
    queryKey: [SAP_HIS_BY_PRIMEKEY_QUERY_KEY, API_BASE, selectedPrimeKey],
    queryFn: async () => {
      try {
        return await fetchSapHisByPrimeKey(API_BASE, selectedPrimeKey);
      } catch (err) {
        console.error('PrimeKey 이력 조회 오류:', err);
        throw err;
      }
    },
    enabled: !!selectedPrimeKey,
  });

  const detailHistoryErrorMessage = detailHistoryError
    ? getQueryErrorMessage(
        detailHistoryError,
        '해당 PrimeKey의 이력을 불러오지 못했습니다.',
      )
    : null;

  const { dataHeaders, hasReasonColumn } = useMemo(() => {
    const allHeaders =
      data.length > 0 ? getOrderedHeaders(Object.keys(data[0])) : [];
    return splitHeaders(allHeaders);
  }, [data]);

  const handleRowClick = useCallback((row, rowIndex) => {
    const primeKey = row[PRIMEKEY_COLUMN] ?? row.prime_key ?? rowIndex;
    const keyStr = String(primeKey);
    setSelectedPrimeKey((prev) => (prev === keyStr ? null : keyStr));
  }, []);

  const closeDrawer = useCallback(() => {
    setSelectedPrimeKey(null);
  }, []);

  const handleMainReasonSaved = useCallback(
    (rowIndex, value) => {
      queryClient.setQueryData(
        [SAP_HIS_LATEST_QUERY_KEY, LATEST_API_URL],
        (prev) => {
          if (!prev?.rows) return prev;
          return {
            ...prev,
            rows: prev.rows.map((row, i) =>
              i === rowIndex ? patchRowChangeReason(row, value) : row,
            ),
          };
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

  return (
    <div className='page-container'>
      <div className='history-page'>
        <h1>이력 페이지</h1>
        <p>행을 클릭하면 해당 PrimeKey의 변경 이력이 오른쪽 패널에 표시됩니다.</p>

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
            <div className='history-table-panel'>
              <HistoryRevMetaBar revMeta={revMeta} />
              <HistoryVirtualTable
                data={data}
                dataHeaders={dataHeaders}
                hasReasonColumn={hasReasonColumn}
                apiBase={API_BASE}
                onReasonSaved={handleMainReasonSaved}
                selectedPrimeKey={selectedPrimeKey}
                onRowClick={handleRowClick}
                showRowOpenIcon
              />
            </div>
          )}

          {!loading && !error && data.length === 0 && (
            <div className='history-empty'>표시할 데이터가 없습니다.</div>
          )}
        </div>

        <HistoryDetailDrawer
          open={!!selectedPrimeKey}
          primeKey={selectedPrimeKey}
          onClose={closeDrawer}
          dataHeaders={dataHeaders}
          hasReasonColumn={hasReasonColumn}
          apiBase={API_BASE}
          historyRows={detailHistoryRows}
          loading={detailHistoryLoading}
          error={detailHistoryErrorMessage}
          onHistoryReasonSaved={handleHistoryReasonSaved}
        />
      </div>
    </div>
  );
}

export default HistoryPage;
