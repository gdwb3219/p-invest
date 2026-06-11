import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useApiUrl } from '../../../stores';
import '../../../styles/pages/invest-rev/InvestRevRequest.css';
import CommitteeHistoryControls from './components/CommitteeHistoryControls';
import CommitteeHistoryTable from './components/CommitteeHistoryTable';
import {
  COMMITTEE_HISTORY_LIST_PATH,
  buildHistoryTableCsv,
  buildRowDataHeaders,
  committeeStatusFilterKey,
  committeeStatusFilterLabel,
  deduplicateCommitteeHistoryRows,
  downloadCsv,
  filterCommitteeHistoryByStatus,
  normalizeCommitteeListPayload,
  sortRowsByCreatedAt,
} from './historyUtils';

function CommitteeHistoryListPage() {
  // 기본 URL 설정
  const { API_URL } = useApiUrl();
  const historyListUrl = `${API_URL}${COMMITTEE_HISTORY_LIST_PATH}`;

  // 상태 관리
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [committeeStatusFilter, setCommitteeStatusFilter] = useState('');

  // 목록 데이터 가져오기
  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(historyListUrl);
      const list = normalizeCommitteeListPayload(res.data);
      setRows(
        deduplicateCommitteeHistoryRows(Array.isArray(list) ? list : []),
      );
    } catch (err) {
      console.error('투심위 리스트 로드 오류:', err);
      setError(
        err.response?.data?.error ??
          err.response?.data?.message ??
          err.message ??
          '투심위 리스트를 불러오지 못했습니다.',
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [historyListUrl]);

  // 목록 데이터 가져오기 실행
  useEffect(() => {
    // void는 비동기 함수를 동기적으로 실행하는 키워드
    void fetchList();
  }, [fetchList]);

  // 생성일시 기준 정렬 (원본 rows는 변경하지 않음)
  const sortedRows = useMemo(() => sortRowsByCreatedAt(rows), [rows]);

  // 투심위 상태 옵션 생성
  const committeeStatusOptions = useMemo(() => {
    const keys = new Set();
    for (const row of sortedRows) {
      keys.add(committeeStatusFilterKey(row));
    }
    const ordered = [...keys].sort((a, b) => {
      if (a === '__EMPTY__') return -1;
      if (b === '__EMPTY__') return 1;
      return a.localeCompare(b, 'ko');
    });
    return ordered.map((key) => ({
      value: key,
      label: committeeStatusFilterLabel(key),
    }));
  }, [sortedRows]);

  const filteredRows = useMemo(
    () => filterCommitteeHistoryByStatus(sortedRows, committeeStatusFilter),
    [sortedRows, committeeStatusFilter],
  );

  const handleStatusFilterChange = useCallback((value) => {
    setCommitteeStatusFilter(value);
  }, []);

  const rowDataHeaders = useMemo(
    () => buildRowDataHeaders(sortedRows),
    [sortedRows],
  );

  const handleDownloadCsv = useCallback(() => {
    if (filteredRows.length === 0) return;
    const csv = buildHistoryTableCsv(filteredRows, rowDataHeaders);
    downloadCsv(csv, 'committee_history_list');
  }, [filteredRows, rowDataHeaders]);

  return (
    <div className='invest-rev-sub-page invest-rev-request'>
      <p className='invest-rev-sub-badge invest-rev-sub-badge--active'>
        현재 탭: 투심위 리스트
      </p>
      <p className='invest-rev-sub-desc' style={{ marginBottom: '1rem' }}>
        투심위 생성 현황에서 확정된 투심위 이력을 조회합니다. 메타 필드와{' '}
        <code>row_data</code> 컬럼을 한 테이블에서 가로 스크롤로 확인할 수
        있습니다.
      </p>

      {error && (
        <div className='invest-rev-request__error' role='alert'>
          {error}
        </div>
      )}

      {loading && rows.length === 0 && !error ? (
        <p className='invest-rev-request__loading'>목록을 불러오는 중입니다…</p>
      ) : sortedRows.length === 0 ? (
        <p className='invest-rev-request__empty'>
          표시할 데이터가 없습니다. API 응답이 배열(또는 <code>data</code> /{' '}
          <code>items</code> 배열)인지 확인하세요.
        </p>
      ) : (
        <div className='invest-rev-request__panel'>
          <CommitteeHistoryControls
            loading={loading}
            historyListUrl={historyListUrl}
            filteredRowsLength={filteredRows.length}
            sortedRowsLength={sortedRows.length}
            committeeStatusFilter={committeeStatusFilter}
            committeeStatusOptions={committeeStatusOptions}
            onRefresh={fetchList}
            onDownloadCsv={handleDownloadCsv}
            onStatusFilterChange={handleStatusFilterChange}
          />
          <CommitteeHistoryTable
            filteredRows={filteredRows}
            rowDataHeaders={rowDataHeaders}
          />
        </div>
      )}
    </div>
  );
}

export default CommitteeHistoryListPage;
