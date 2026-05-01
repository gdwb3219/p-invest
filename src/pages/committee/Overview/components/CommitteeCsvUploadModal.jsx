function CommitteeCsvUploadModal({
  open,
  csvFileName,
  csvUploadReadyCount,
  csvDragOver,
  setCsvDragOver,
  onClose,
  onPickFile,
  onDropFile,
  onUpload,
}) {
  if (!open) return null;

  return (
    <div
      className='invest-rev-request__modal-backdrop invest-rev-request__modal-backdrop--form'
      role='presentation'
    >
      <div
        className='invest-rev-request__modal invest-rev-request__modal--form'
        role='dialog'
        aria-modal='true'
        aria-label='양식 업로드'
      >
        <div className='invest-rev-request__modal-header'>
          <h3 className='invest-rev-request__modal-title'>양식 업로드</h3>
        </div>
        <p className='invest-rev-request__modal-desc'>
          양식에 맞는 CSV 파일을 드래그 앤 드롭하거나 파일을 선택하세요.
        </p>

        <div
          className={`invest-rev-request__dropzone${csvDragOver ? ' invest-rev-request__dropzone--active' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setCsvDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setCsvDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setCsvDragOver(false);
            const file = e.dataTransfer?.files?.[0];
            if (file) void onDropFile(file);
          }}
        >
          <p className='invest-rev-request__dropzone-text'>CSV 파일을 여기에 놓으세요</p>
          <button
            type='button'
            className='invest-rev-request__btn invest-rev-request__btn--secondary'
            onClick={onPickFile}
          >
            파일 선택
          </button>
          {csvFileName ? (
            <p className='invest-rev-request__dropzone-file'>
              선택 파일: {csvFileName}
            </p>
          ) : null}
        </div>

        <div className='invest-rev-request__toolbar' style={{ marginTop: '1rem' }}>
          <button
            type='button'
            className='invest-rev-request__btn invest-rev-request__btn--secondary'
            onClick={onClose}
          >
            취소
          </button>
          <button
            type='button'
            className='invest-rev-request__btn invest-rev-request__btn--primary'
            onClick={onUpload}
            disabled={csvUploadReadyCount === 0}
          >
            업로드
          </button>
        </div>
      </div>
    </div>
  );
}

export default CommitteeCsvUploadModal;
