import ConfirmModal from "./ConfirmModal.jsx";

/** 변경 요청(일괄 제출) 전 확인 */
function BulkChangeRequestModal({ open, onCancel, onConfirm }) {
  return (
    <ConfirmModal
      open={open}
      title="변경 요청"
      message="투심위 변경을 요청하시겠습니까?"
      cancelLabel="취소"
      confirmLabel="요청하기"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

export default BulkChangeRequestModal;
