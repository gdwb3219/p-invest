import ConfirmModal from "./ConfirmModal.jsx";

/** 임시 보관 비우기 전 확인 */
function ClearStagingModal({ open, onCancel, onConfirm }) {
  return (
    <ConfirmModal
      open={open}
      title="임시 보관 비우기"
      message="임시 보관 리스트를 비우시겠습니까?"
      cancelLabel="취소"
      confirmLabel="비우기"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

export default ClearStagingModal;
