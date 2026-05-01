function CommitteeManualEntryModal({
  manualItemModalOpen,
  manualFormError,
  headers,
  manualDraftRows,
  manualFieldErrors,
  handleManualDraftChange,
  handleManualCellKeyDown,
  addManualDraftRow,
  closeManualItemModal,
  saveManualItemToStaging,
}) {
  if (!manualItemModalOpen) return null;

  return (
    <div
      className='invest-rev-request__modal-backdrop invest-rev-request__modal-backdrop--form'
      role='presentation'
    >
      <div
        className='invest-rev-request__modal invest-rev-request__modal--form'
        role='dialog'
        aria-modal='true'
        aria-label='투심위 신규 항목 입력'
      >
        <div className='invest-rev-request__modal-header'>
          <h3 className='invest-rev-request__modal-title'>투심위 신규 항목</h3>
        </div>
        <p className='invest-rev-request__modal-desc'>
          엑셀처럼 좌에서 우로 입력하세요. 마지막 컬럼에서 Enter/Tab을 누르면
          다음 행의 2번째 칸이 자동 생성/이동됩니다.
        </p>

        {manualFormError && (
          <div className='invest-rev-request__error' role='alert'>
            {manualFormError}
          </div>
        )}

        <div className='invest-rev-request__modal-form-scroll'>
          <table className='invest-rev-request__table invest-rev-request__table--manual-grid'>
            <thead>
              <tr>
                <th>#</th>
                {headers.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {manualDraftRows.map((draftRow, rowIndex) => (
                <tr key={`manual-draft-${rowIndex}`}>
                  <td>{rowIndex + 1}</td>
                  {headers.map((h, colIndex) => {
                    const fieldKey = `${rowIndex}:${h}`;
                    const hasFieldError = Boolean(manualFieldErrors[fieldKey]);
                    return (
                      <td
                        key={`${h}-${rowIndex}`}
                        className={
                          hasFieldError ? 'invest-rev-request__manual-cell--error' : ''
                        }
                      >
                        <input
                          id={`committee-manual-cell-${rowIndex}-${colIndex}`}
                          type='text'
                          className='invest-rev-request__manual-grid-input'
                          value={draftRow[h] ?? ''}
                          onChange={(e) =>
                            handleManualDraftChange(rowIndex, h, e.target.value)
                          }
                          onKeyDown={(e) =>
                            handleManualCellKeyDown(e, rowIndex, colIndex)
                          }
                          autoComplete='off'
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className='invest-rev-request__toolbar' style={{ marginTop: '1rem' }}>
          <button
            type='button'
            className='invest-rev-request__btn invest-rev-request__btn--secondary'
            onClick={addManualDraftRow}
          >
            행 추가
          </button>
          <button
            type='button'
            className='invest-rev-request__btn invest-rev-request__btn--secondary'
            onClick={closeManualItemModal}
          >
            취소
          </button>
          <button
            type='button'
            className='invest-rev-request__btn invest-rev-request__btn--primary'
            onClick={saveManualItemToStaging}
          >
            임시 저장
          </button>
        </div>
      </div>
    </div>
  );
}

export default CommitteeManualEntryModal;
