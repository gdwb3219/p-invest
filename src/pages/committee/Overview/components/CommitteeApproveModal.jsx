import { APPROVE_REASON_COLUMNS } from '../overviewUtils';

function CommitteeApproveModal({
  approveModalOpen,
  submitting,
  approveValidationMessage,
  missingApproveReasonKeys,
  closeApproveModal,
  stagedRows,
  approveReasons,
  handleApproveReasonChange,
  canSubmitApprove,
  setApproveValidationMessage,
  handleApproveRequest,
  displayCell,
}) {
  if (!approveModalOpen) return null;

  return (
    <div className='invest-rev-request__modal-backdrop' role='presentation'>
      <div
        className='invest-rev-request__modal'
        role='dialog'
        aria-modal='true'
        aria-label='승인 요청 사유 입력'
      >
        <div className='invest-rev-request__modal-header'>
          <h3 className='invest-rev-request__modal-title'>승인 요청</h3>
          <button
            type='button'
            className='invest-rev-request__btn invest-rev-request__btn--secondary'
            onClick={closeApproveModal}
            disabled={submitting}
          >
            닫기
          </button>
        </div>

        {(approveValidationMessage || missingApproveReasonKeys.length > 0) && (
          <div className='invest-rev-request__error' role='alert'>
            {approveValidationMessage ?? '요청 사유를 입력해주세요.'}
          </div>
        )}

        <div className='invest-rev-request__table-wrap invest-rev-request__modal-table-wrap'>
          <table className='invest-rev-request__table'>
            <thead>
              <tr>
                <th>#</th>
                {APPROVE_REASON_COLUMNS.map((col) => (
                  <th key={col}>{col}</th>
                ))}
                <th>요청 사유</th>
              </tr>
            </thead>
            <tbody>
              {stagedRows.map((entry, idx) => {
                const row = entry?.row ?? {};
                const rowKey = String(entry?.rowKey ?? idx);
                const reason = approveReasons[rowKey] ?? '';
                const hasReason = reason.trim().length > 0;
                return (
                  <tr key={rowKey}>
                    <td>{idx + 1}</td>
                    {APPROVE_REASON_COLUMNS.map((col) => (
                      <td key={col}>{displayCell(row[col])}</td>
                    ))}
                    <td className='invest-rev-request__reason-cell'>
                      <textarea
                        className='invest-rev-request__textarea'
                        value={reason}
                        onChange={(e) => handleApproveReasonChange(rowKey, e.target.value)}
                        placeholder='요청 사유를 입력해주세요.'
                      />
                      {!hasReason && (
                        <p className='invest-rev-request__reason-error'>
                          요청 사유를 입력해주세요.
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className='invest-rev-request__toolbar' style={{ marginTop: '1rem' }}>
          <button
            type='button'
            className='invest-rev-request__btn invest-rev-request__btn--primary'
            onClick={() => {
              if (missingApproveReasonKeys.length > 0) {
                setApproveValidationMessage('요청 사유를 입력해주세요.');
                return;
              }
              void handleApproveRequest();
            }}
            disabled={!canSubmitApprove}
          >
            {submitting ? '요청 전송 중…' : '승인 요청'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CommitteeApproveModal;
