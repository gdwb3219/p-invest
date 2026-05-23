function CommitteePasswordModal({
  open,
  confirmSubmitting,
  passwordModalError,
  passwordInput,
  onClose,
  onSubmit,
  onPasswordChange,
}) {
  if (!open) return null;

  return (
    <div
      className='invest-rev-request__modal-backdrop invest-rev-request__modal-backdrop--form'
      style={{ zIndex: 1025 }}
      role='presentation'
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className='invest-rev-request__modal invest-rev-request__modal--form'
        role='dialog'
        aria-modal='true'
        aria-labelledby='committee-list-password-title'
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className='invest-rev-request__modal-header'>
          <h3 id='committee-list-password-title' className='invest-rev-request__modal-title'>
            비밀번호 확인
          </h3>
        </div>

        <p className='invest-rev-request__modal-desc'>
          투심위 리스트 확정을 진행하려면 비밀번호를 입력하세요.
        </p>

        {passwordModalError && (
          <div className='invest-rev-request__error' role='alert'>
            {passwordModalError}
          </div>
        )}

        <div className='invest-rev-request__form-group'>
          <label className='invest-rev-request__label' htmlFor='committee-list-confirm-password'>
            비밀번호
          </label>
          <input
            id='committee-list-confirm-password'
            type='password'
            className='invest-rev-request__input'
            autoComplete='off'
            value={passwordInput}
            onChange={(e) => onPasswordChange(e.target.value)}
            disabled={confirmSubmitting}
          />
        </div>

        <div
          className='invest-rev-request__toolbar'
          style={{
            justifyContent: 'flex-end',
            gap: '0.5rem',
            marginTop: '0.75rem',
            marginBottom: 0,
          }}
        >
          <button
            type='button'
            className='invest-rev-request__btn invest-rev-request__btn--secondary'
            onClick={onClose}
            disabled={confirmSubmitting}
          >
            취소
          </button>
          <button
            type='button'
            className='invest-rev-request__btn invest-rev-request__btn--primary'
            onClick={() => void onSubmit()}
            disabled={confirmSubmitting}
          >
            {confirmSubmitting ? '처리 중…' : '확정'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CommitteePasswordModal;
