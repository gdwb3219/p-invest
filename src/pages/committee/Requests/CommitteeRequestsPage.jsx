import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useApiUrl } from '../../../stores';
import '../../../styles/pages/invest-rev/InvestRevRequest.css';
import CommitteeConfirmModal from './components/CommitteeConfirmModal';
import CommitteePasswordModal from './components/CommitteePasswordModal';
import CommitteeRequestsTable from './components/CommitteeRequestsTable';
import {
  COMMITTEE_CONFIRM_PASSWORD,
  COMMITTEE_LIST_CONFIRM_PATH,
  COMMITTEE_LIST_PATH,
  buildRequestsTableCsv,
  buildRowDataHeaders,
  downloadCsv,
  getDeleteAnchor,
  normalizeCommitteeListPayload,
  sortRowsByCreatedAt,
} from './requestsUtils';

function CommitteeRequestsPage() {
  const { API_URL } = useApiUrl();
  const committeeListUrl = `${API_URL}${COMMITTEE_LIST_PATH}`;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [committeeNameInput, setCommitteeNameInput] = useState('');
  const [approvedByInput, setApprovedByInput] = useState('');
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [confirmModalError, setConfirmModalError] = useState(null);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordModalError, setPasswordModalError] = useState(null);
  const [pendingConfirm, setPendingConfirm] = useState(null);

  const [deletingKey, setDeletingKey] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const selectAllCheckboxRef = useRef(null);

  const committeeConfirmUrl = `${API_URL}${COMMITTEE_LIST_CONFIRM_PATH}`;

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(committeeListUrl);
      const list = normalizeCommitteeListPayload(res.data);
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('투심위 요청 목록 로드 오류:', err);
      setError(
        err.response?.data?.error ??
          err.response?.data?.message ??
          err.message ??
          '투심위 요청 목록을 불러오지 못했습니다.',
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [committeeListUrl]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const sortedRows = useMemo(() => sortRowsByCreatedAt(rows), [rows]);

  const rowDataHeaders = useMemo(() => buildRowDataHeaders(sortedRows), [sortedRows]);

  const selectableTrackKeys = useMemo(
    () =>
      sortedRows
        .map((row) => getDeleteAnchor(row)?.trackKey)
        .filter(Boolean),
    [sortedRows],
  );

  useEffect(() => {
    const valid = new Set(selectableTrackKeys);
    setSelectedKeys((prev) => {
      const next = new Set();
      let changed = false;
      for (const k of prev) {
        if (valid.has(k)) next.add(k);
        else changed = true;
      }
      if (!changed && next.size === prev.size) return prev;
      return next;
    });
  }, [selectableTrackKeys]);

  const allSelectableSelected =
    selectableTrackKeys.length > 0 &&
    selectableTrackKeys.every((k) => selectedKeys.has(k));
  const someSelectableSelected = selectableTrackKeys.some((k) =>
    selectedKeys.has(k),
  );
  const hasBulkSelection =
    selectableTrackKeys.length > 0 &&
    selectableTrackKeys.some((k) => selectedKeys.has(k));

  useEffect(() => {
    const el = selectAllCheckboxRef.current;
    if (!el) return;
    el.indeterminate =
      someSelectableSelected && !allSelectableSelected;
  }, [someSelectableSelected, allSelectableSelected]);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedKeys((prev) => {
      if (selectableTrackKeys.length === 0) return prev;
      const allOn = selectableTrackKeys.every((k) => prev.has(k));
      if (allOn) return new Set();
      return new Set(selectableTrackKeys);
    });
  }, [selectableTrackKeys]);

  const handleToggleRowSelected = useCallback((trackKey) => {
    if (!trackKey) return;
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(trackKey)) next.delete(trackKey);
      else next.add(trackKey);
      return next;
    });
  }, []);

  const handleDownloadCsv = useCallback(() => {
    if (sortedRows.length === 0) return;
    const csv = buildRequestsTableCsv(sortedRows, rowDataHeaders);
    downloadCsv(csv, 'committee_requests');
  }, [sortedRows, rowDataHeaders]);

  const openConfirmModal = useCallback(() => {
    setConfirmModalError(null);
    setCommitteeNameInput('');
    setApprovedByInput('');
    setPasswordModalOpen(false);
    setPasswordInput('');
    setPasswordModalError(null);
    setPendingConfirm(null);
    setConfirmModalOpen(true);
  }, []);

  const closePasswordModal = useCallback(() => {
    if (confirmSubmitting) return;
    setPasswordModalOpen(false);
    setPasswordInput('');
    setPasswordModalError(null);
  }, [confirmSubmitting]);

  const closeConfirmModal = useCallback(() => {
    if (confirmSubmitting) return;
    closePasswordModal();
    setConfirmModalOpen(false);
    setConfirmModalError(null);
    setPendingConfirm(null);
    setCommitteeNameInput('');
    setApprovedByInput('');
  }, [confirmSubmitting, closePasswordModal]);

  useEffect(() => {
    if (!confirmModalOpen && !passwordModalOpen) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (passwordModalOpen) closePasswordModal();
      else closeConfirmModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    confirmModalOpen,
    passwordModalOpen,
    closeConfirmModal,
    closePasswordModal,
  ]);

  const openPasswordStep = useCallback(() => {
    const name = committeeNameInput.trim();
    if (!name) {
      setConfirmModalError(
        "투자심의위원회 예정 날짜를 입력해 주세요. ex) '26년 6월 (예비) 투심위'",
      );
      return;
    }

    const approvedBy = approvedByInput.trim();
    if (!approvedBy) {
      setConfirmModalError('승인자 이름을 입력해 주세요.');
      return;
    }

    setConfirmModalError(null);

    setPendingConfirm({
      new_status: name,
      approved_by: approvedBy,
    });

    setPasswordInput('');
    setPasswordModalError(null);
    setPasswordModalOpen(true);
  }, [committeeNameInput, approvedByInput]);

  const submitAfterPassword = useCallback(async () => {
    if (passwordInput !== COMMITTEE_CONFIRM_PASSWORD) {
      setPasswordModalError('비밀번호가 틀렸습니다.');
      return;
    }
    if (pendingConfirm == null) {
      setPasswordModalError(
        '요청 정보가 없습니다. 처음부터 다시 시도해 주세요.',
      );
      return;
    }
    setPasswordModalError(null);
    setConfirmSubmitting(true);
    try {
      await axios.post(committeeConfirmUrl, pendingConfirm, {
        headers: { 'Content-Type': 'application/json' },
      });
      setPasswordModalOpen(false);
      setPasswordInput('');
      setPendingConfirm(null);
      setConfirmModalOpen(false);
      setCommitteeNameInput('');
      setApprovedByInput('');
      await fetchList();
    } catch (err) {
      console.error('투심위 상태 일괄 변경 오류:', err);
      setPasswordModalError(
        err.response?.data?.error ??
          err.response?.data?.message ??
          err.message ??
          '서버 요청에 실패했습니다.',
      );
    } finally {
      setConfirmSubmitting(false);
    }
  }, [committeeConfirmUrl, fetchList, passwordInput, pendingConfirm]);

  const handleDeleteRow = useCallback(
    async (row) => {
      const anchor = getDeleteAnchor(row);
      if (!anchor) {
        window.alert(
          '문서 _id 또는 prime-key를 찾을 수 없어 삭제할 수 없습니다.',
        );
        return;
      }
      if (
        !window.confirm('이 행을 데이터베이스에서 삭제할까요? 이 작업은 되돌릴 수 없습니다.')
      ) {
        return;
      }
      setDeletingKey(anchor.trackKey);
      try {
        await axios.delete(committeeListUrl, {
          headers: { 'Content-Type': 'application/json' },
          data: anchor.payload,
        });
        await fetchList();
      } catch (err) {
        console.error('투심위 요청 삭제 오류:', err);
        window.alert(
          err.response?.data?.error ??
            err.response?.data?.message ??
            err.message ??
            '삭제 요청에 실패했습니다.',
        );
      } finally {
        setDeletingKey(null);
      }
    },
    [committeeListUrl, fetchList],
  );

  const handleBulkDeleteSelected = useCallback(async () => {
    const targets = sortedRows.filter((row) => {
      const a = getDeleteAnchor(row);
      return a != null && selectedKeys.has(a.trackKey);
    });
    if (targets.length === 0) {
      window.alert('삭제할 행을 선택해 주세요.');
      return;
    }
    if (
      !window.confirm(
        `선택한 ${targets.length}건을 데이터베이스에서 삭제할까요? 이 작업은 되돌릴 수 없습니다.`,
      )
    ) {
      return;
    }

    setBulkDeleting(true);
    const errors = [];
    try {
      for (const row of targets) {
        const anchor = getDeleteAnchor(row);
        if (!anchor) continue;
        try {
          await axios.delete(committeeListUrl, {
            headers: { 'Content-Type': 'application/json' },
            data: anchor.payload,
          });
        } catch (err) {
          errors.push(
            err.response?.data?.error ??
              err.response?.data?.message ??
              err.message ??
              '알 수 없는 오류',
          );
        }
      }
      setSelectedKeys(new Set());
      await fetchList();
      if (errors.length > 0) {
        window.alert(
          `일부 삭제에 실패했습니다. (${errors.length}건)\n${errors
            .slice(0, 3)
            .join('\n')}${errors.length > 3 ? '\n…' : ''}`,
        );
      }
    } finally {
      setBulkDeleting(false);
    }
  }, [committeeListUrl, fetchList, selectedKeys, sortedRows]);

  return (
    <div className='invest-rev-sub-page invest-rev-request'>
      <p className='invest-rev-sub-badge invest-rev-sub-badge--active'>
        현재 탭: 투심위 요청 현황
      </p>
      <p className='invest-rev-sub-desc' style={{ marginBottom: '1rem' }}>
        MongoDB에 저장된 투심위 요청 문서를 조회합니다. 메타 필드와{' '}
        <code>row_data</code> 컬럼을 한 테이블에서 가로 스크롤로 확인할 수
        있습니다.
      </p>

      <div className='invest-rev-request__toolbar'>
        <button
          type='button'
          className='invest-rev-request__btn invest-rev-request__btn--secondary'
          onClick={() => void fetchList()}
          disabled={loading}
        >
          {loading ? '불러오는 중…' : '목록 새로고침'}
        </button>
        <p className='invest-rev-request__hint'>
          GET: <code>{committeeListUrl}</code>
        </p>
      </div>

      {error && (
        <div className='invest-rev-request__error' role='alert'>
          {error}
        </div>
      )}

      <div className='invest-rev-request__panel'>
        <div className='invest-rev-request__modal-header'>
          <h2
            className='invest-rev-request__panel-title'
            style={{ margin: 0 }}
          >
            요청 목록 ({sortedRows.length}건)
            {loading && rows.length === 0 ? (
              <span style={{ fontWeight: 400, marginLeft: '0.35rem' }}>
                · 불러오는 중…
              </span>
            ) : null}
          </h2>
          <button
            type='button'
            className='invest-rev-request__btn invest-rev-request__btn--secondary'
            onClick={handleDownloadCsv}
            disabled={sortedRows.length === 0}
          >
            CSV 다운로드
          </button>
        </div>
        <CommitteeRequestsTable
          sortedRows={sortedRows}
          rowDataHeaders={rowDataHeaders}
          selectedKeys={selectedKeys}
          deletingKey={deletingKey}
          loading={loading}
          bulkDeleting={bulkDeleting}
          allSelectableSelected={allSelectableSelected}
          selectableTrackKeys={selectableTrackKeys}
          selectAllCheckboxRef={selectAllCheckboxRef}
          onToggleSelectAll={handleToggleSelectAll}
          onToggleRowSelected={handleToggleRowSelected}
          onDeleteRow={handleDeleteRow}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginTop: '1rem',
          }}
        >
          <button
            type='button'
            className='invest-rev-request__btn invest-rev-request__btn--secondary invest-rev-request__btn--committee-bulk-delete'
            onClick={() => void handleBulkDeleteSelected()}
            disabled={
              !hasBulkSelection || loading || bulkDeleting || sortedRows.length === 0
            }
          >
            {bulkDeleting ? '선택 삭제 중…' : '선택 삭제'}
          </button>
          <button
            type='button'
            className='invest-rev-request__btn invest-rev-request__btn--primary'
            onClick={openConfirmModal}
            disabled={loading || bulkDeleting}
          >
            투심위 리스트 확정
          </button>
        </div>
      </div>

      <CommitteeConfirmModal
        open={confirmModalOpen}
        confirmModalError={confirmModalError}
        committeeNameInput={committeeNameInput}
        approvedByInput={approvedByInput}
        confirmSubmitting={confirmSubmitting}
        passwordModalOpen={passwordModalOpen}
        onClose={closeConfirmModal}
        onOpenPasswordStep={openPasswordStep}
        onCommitteeNameChange={(value) => {
          setCommitteeNameInput(value);
          if (confirmModalError) setConfirmModalError(null);
        }}
        onApprovedByChange={(value) => {
          setApprovedByInput(value);
          if (confirmModalError) setConfirmModalError(null);
        }}
      />

      <CommitteePasswordModal
        open={passwordModalOpen}
        confirmSubmitting={confirmSubmitting}
        passwordModalError={passwordModalError}
        passwordInput={passwordInput}
        onClose={closePasswordModal}
        onSubmit={submitAfterPassword}
        onPasswordChange={(value) => {
          setPasswordInput(value);
          if (passwordModalError) setPasswordModalError(null);
        }}
      />
    </div>
  );
}

export default CommitteeRequestsPage;
