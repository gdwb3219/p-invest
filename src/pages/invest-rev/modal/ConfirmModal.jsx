import { useEffect } from "react";

/**
 * invest-rev 공통 확인 모달 (경고/질문용, CancelModal과 동일 톤·레이아웃).
 */
function ConfirmModal({
  open,
  title,
  message,
  cancelLabel = "취소",
  confirmLabel = "확인",
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="icc-modal-backdrop icc-confirm-modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="icc-modal icc-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="icc-confirm-modal-title"
        aria-describedby={message ? "icc-confirm-modal-desc" : undefined}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="icc-confirm-modal-title" className="icc-modal-title">
          {title}
        </h2>
        {message ? (
          <p id="icc-confirm-modal-desc" className="icc-confirm-modal__message">
            {message}
          </p>
        ) : null}
        <div className="icc-modal-actions">
          <button
            type="button"
            className="invest-rev-request__btn invest-rev-request__btn--secondary"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="invest-rev-request__btn invest-rev-request__btn--primary"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
