function CommitteeConfirmModal({
  open,
  confirmModalError,
  committeeNameInput,
  approvedByInput,
  confirmSubmitting,
  passwordModalOpen,
  onClose,
  onOpenPasswordStep,
  onCommitteeNameChange,
  onApprovedByChange,
}) {
  if (!open) return null;

  return (
    <div
      className='invest-rev-request__modal-backdrop invest-rev-request__modal-backdrop--form'
      role='presentation'
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !passwordModalOpen) onClose();
      }}
    >
      <div
        className='invest-rev-request__modal invest-rev-request__modal--form'
        role='dialog'
        aria-modal='true'
        aria-labelledby='committee-list-confirm-title'
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className='invest-rev-request__modal-header'>
          <h3 id='committee-list-confirm-title' className='invest-rev-request__modal-title'>
            투심위 리스트 확정
          </h3>
        </div>

        {confirmModalError && (
          <div className='invest-rev-request__error' role='alert'>
            {confirmModalError}
          </div>
        )}

        <div className='invest-rev-request__form-group'>
          <label className='invest-rev-request__label' htmlFor='committee-list-confirm-name'>
            투심위 이름
          </label>
          <textarea
            id='committee-list-confirm-name'
            className='invest-rev-request__textarea'
            rows={3}
            value={committeeNameInput}
            placeholder="'26년 6월 (예비) 투심위"
            onChange={(e) => onCommitteeNameChange(e.target.value)}
            disabled={confirmSubmitting || passwordModalOpen}
          />
        </div>

        <div className='invest-rev-request__form-group'>
          <label className='invest-rev-request__label' htmlFor='committee-list-approved-by'>
            승인자
          </label>
          <input
            id='committee-list-approved-by'
            type='text'
            className='invest-rev-request__input'
            autoComplete='name'
            value={approvedByInput}
            placeholder='승인자 이름'
            onChange={(e) => onApprovedByChange(e.target.value)}
            disabled={confirmSubmitting || passwordModalOpen}
          />
        </div>

        <div
          className='invest-rev-request__toolbar'
          style={{ justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}
        >
          <button
            type='button'
            className='invest-rev-request__btn invest-rev-request__btn--secondary'
            onClick={onClose}
            disabled={confirmSubmitting || passwordModalOpen}
          >
            취소
          </button>
          <button
            type='button'
            className='invest-rev-request__btn invest-rev-request__btn--primary'
            onClick={onOpenPasswordStep}
            disabled={confirmSubmitting || passwordModalOpen}
          >
            확정
          </button>
        </div>
      </div>
    </div>
  );
}

export default CommitteeConfirmModal;
