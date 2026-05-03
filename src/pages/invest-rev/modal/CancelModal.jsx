import { useEffect } from 'react';

/**
 * 투심위 변경 등 invest-rev 화면과 톤을 맞춘 확인 모달.
 * @param {boolean} open
 * @param {string} title
 * @param {string} message
 * @param {string} [cancelLabel='뒤로가기']
 * @param {string} [confirmLabel='계속']
 * @param {() => void} onCancel
 * @param {() => void} onConfirm
 */
function CancelModal({
  open,
  title,
  message,
  cancelLabel = '뒤로가기',
  confirmLabel = '계속',
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className='icc-modal-backdrop icc-cancel-modal-backdrop'
      role='presentation'
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className='icc-modal icc-cancel-modal'
        role='alertdialog'
        aria-modal='true'
        aria-labelledby='icc-cancel-modal-title'
        aria-describedby='icc-cancel-modal-desc'
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id='icc-cancel-modal-title' className='icc-modal-title'>
          {title}
        </h2>
        <div id='icc-cancel-modal-desc' className='icc-cancel-modal__body'>
          <p className='icc-cancel-modal__warn' role='note'>
            임시 보관된 변경 목록은 브라우저 메모리에만 있으며, 이 페이지를
            벗어나거나 데이터를 다시 불러오면 사라집니다.
          </p>
          <p className='icc-cancel-modal__message'>{message}</p>
        </div>
        <div className='icc-modal-actions'>
          <button
            type='button'
            className='invest-rev-request__btn invest-rev-request__btn--secondary'
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type='button'
            className='invest-rev-request__btn invest-rev-request__btn--primary'
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CancelModal;
