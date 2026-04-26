import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import '../../styles/pages/invest-rev/InvestRevRequest.css';
import '../../styles/pages/invest-rev/CommitteeChangeRequest.css';

/**
 * 투심위 일괄 변경 요청 목록 API — 백엔드 모델에 맞게 URL·필드명을 조정하세요.
 * 기대: GET 시 변경 요청 문서 배열(또는 { results: [] }), 항목에 승인 플래그·승인자 필드.
 */
const CHANGE_REQUESTS_LIST_URL =
  'http://127.0.0.1:8080/pinvest/invest-change/requests-list/';

function approveRequestUrl(requestId) {
  const id = encodeURIComponent(String(requestId));
  return `http://127.0.0.1:8080/pinvest/invest-change/requests/${id}/approve/`;
}

function normalizeListPayload(data) {
  if (Array.isArray(data)) return data;
  if (data?.data != null && Array.isArray(data.data)) return data.data;
  return (
    data?.results ??
    data?.items ??
    data?.requests ??
    data?.change_requests ??
    []
  );
}

function getRequestRowId(row) {
  if (row == null) return '';
  return row._id ?? row.id ?? row.request_id ?? row.uuid ?? '';
}

function isRowApproved(row) {
  if (row == null) return false;
  if (row.approved === true || row.승인 === true || row.is_approved === true) {
    return true;
  }
  const st = row.approval_status ?? row.status;
  if (typeof st === 'string') {
    const s = st.toLowerCase();
    if (s === 'approved' || s === '승인' || st === '승인') return true;
  }
  return false;
}

function getApprovedBy(row) {
  return (
    row?.approved_by ?? row?.approver ?? row?.승인자 ?? row?.approvedBy ?? ''
  );
}

function getApprovedAt(row) {
  return row?.approved_at ?? row?.approvedAt ?? row?.승인일시 ?? '';
}

function firstChangedColumn(before, after) {
  const b = before && typeof before === 'object' ? before : {};
  const a = after && typeof after === 'object' ? after : {};
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  for (const k of keys) {
    if (JSON.stringify(b[k]) !== JSON.stringify(a[k])) return k;
  }
  return '';
}

function displayCell(v) {
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  const s = String(v);
  return s.length > 80 ? `${s.slice(0, 80)}…` : s;
}

function CommitteeChangeRequest() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [approver, setApprover] = useState('승인자');
  const [approvingId, setApprovingId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [actionError, setActionError] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(CHANGE_REQUESTS_LIST_URL);
      const list = normalizeListPayload(res.data);
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('변경 요청 목록 로드 오류:', err);
      setError(
        err.response?.data?.error ??
          err.response?.data?.message ??
          err.message ??
          '변경 요청 목록을 불러오지 못했습니다.',
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const ca = String(
        a.created_at ?? a.createdAt ?? getRequestRowId(a) ?? '',
      );
      const cb = String(
        b.created_at ?? b.createdAt ?? getRequestRowId(b) ?? '',
      );
      return cb.localeCompare(ca);
    });
  }, [rows]);

  const handleApprove = useCallback(
    async (row) => {
      const id = getRequestRowId(row);
      if (!id || isRowApproved(row)) return;
      const name = approver.trim();
      if (!name) {
        setActionError('승인자 이름(또는 계정)을 입력해 주세요.');
        setActionMessage(null);
        return;
      }
      setActionError(null);
      setActionMessage(null);
      setApprovingId(id);
      try {
        /**
         * 승인 API — 서버에서 변경 list DB에 승인 플래그(예: approved)·승인자(approved_by)·승인일시를 저장하세요.
         * Mongo 등에서 한글 필드만 쓰는 경우 본문을 { 승인: true, 승인자: name } 형태로 바꾸면 됩니다.
         */
        await axios.post(
          approveRequestUrl(id),
          { approved: true, approved_by: name },
          { headers: { 'Content-Type': 'application/json' } },
        );
        setActionMessage('승인이 반영되었습니다.');
        await fetchRequests();
      } catch (err) {
        console.error('승인 요청 오류:', err);
        setActionError(
          err.response?.data?.error ??
            err.response?.data?.message ??
            err.message ??
            '승인 API 호출에 실패했습니다.',
        );
      } finally {
        setApprovingId(null);
      }
    },
    [approver, fetchRequests],
  );

  return (
    <div className='invest-rev-sub-page invest-rev-request'>
      <p className='invest-rev-sub-badge invest-rev-sub-badge--active'>
        현재 탭: 투심위 변경요청 내역
      </p>
      <p className='invest-rev-sub-desc' style={{ marginBottom: '1rem' }}>
        일괄 제출된 투심위 변경 요청을 조회하고, 승인자로 승인 처리합니다. 승인
        시 서버 DB에 승인 플래그와 승인자 정보가 저장됩니다.
      </p>

      <div className='invest-rev-request__toolbar'>
        <button
          type='button'
          className='invest-rev-request__btn invest-rev-request__btn--secondary'
          onClick={() => void fetchRequests()}
          disabled={loading}
        >
          {loading ? '불러오는 중…' : '목록 새로고침'}
        </button>
        <p className='invest-rev-request__hint'>
          GET: <code>{CHANGE_REQUESTS_LIST_URL}</code>
          {' · '}POST: <code>…/requests/&lt;id&gt;/approve/</code>
        </p>
      </div>

      <div className='ccr-approver-bar'>
        <div className='ccr-approver-bar__field'>
          <label className='invest-rev-request__label' htmlFor='ccr-approver'>
            승인자
          </label>
          <input
            id='ccr-approver'
            type='text'
            className='invest-rev-request__input'
            value={approver}
            onChange={(e) => {
              setApprover(e.target.value);
              setActionError(null);
            }}
            placeholder='본인 계정 또는 이름'
            autoComplete='username'
          />
        </div>
      </div>

      {error && (
        <div className='invest-rev-request__error' role='alert'>
          {error}
        </div>
      )}
      {actionError && (
        <div className='invest-rev-request__error' role='alert'>
          {actionError}
        </div>
      )}
      {actionMessage && (
        <div className='invest-rev-request__success' role='status'>
          {actionMessage}
        </div>
      )}

      {loading && rows.length === 0 && !error ? (
        <p className='invest-rev-request__loading'>목록을 불러오는 중입니다…</p>
      ) : sortedRows.length === 0 ? (
        <p className='invest-rev-request__empty'>
          표시할 변경 요청이 없습니다. 일괄 제출 후 목록 API 응답 형식을
          확인하세요.
        </p>
      ) : (
        <div className='ccr-table-wrap'>
          <table className='invest-rev-request__table'>
            <thead>
              <tr>
                <th>요청 ID</th>
                <th>대상 테이블</th>
                <th>대상 키</th>
                <th>컬럼</th>
                <th>변경 전</th>
                <th>변경 후</th>
                <th>사유</th>
                <th>승인</th>
                <th>승인자</th>
                <th>승인일시</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => {
                const id = getRequestRowId(row);
                const before = row.before_data ?? row.before ?? {};
                const after = row.after_data ?? row.after ?? {};
                const col =
                  row.edit_column ??
                  row.column_key ??
                  firstChangedColumn(before, after);
                const approved = isRowApproved(row);
                const approvedBy = getApprovedBy(row);
                const approvedAt = getApprovedAt(row);
                const targetTable = row.target_table ?? row.targetTable ?? '—';
                const targetId =
                  row.target_id ?? row.targetId ?? row.target_key ?? '—';
                const reason = row.reason ?? row.comment ?? '—';
                return (
                  <tr key={id || JSON.stringify(row).slice(0, 40)}>
                    <td className='ccr-cell-muted'>{displayCell(id) || '—'}</td>
                    <td>{displayCell(targetTable)}</td>
                    <td>{displayCell(targetId)}</td>
                    <td>{displayCell(col)}</td>
                    <td>{displayCell(col ? before[col] : '')}</td>
                    <td>{displayCell(col ? after[col] : '')}</td>
                    <td style={{ whiteSpace: 'normal', maxWidth: '200px' }}>
                      {displayCell(reason)}
                    </td>
                    <td>
                      {approved ? (
                        <span className='ccr-badge ccr-badge--done'>승인</span>
                      ) : (
                        <span className='ccr-badge ccr-badge--pending'>
                          대기
                        </span>
                      )}
                    </td>
                    <td>{displayCell(approvedBy) || '—'}</td>
                    <td className='ccr-cell-muted'>
                      {displayCell(approvedAt) || '—'}
                    </td>
                    <td>
                      <button
                        type='button'
                        className='ccr-approve-btn'
                        disabled={
                          !id ||
                          approved ||
                          approvingId === id ||
                          !approver.trim()
                        }
                        onClick={() => void handleApprove(row)}
                      >
                        {approvingId === id ? '처리 중…' : '승인'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default CommitteeChangeRequest;
