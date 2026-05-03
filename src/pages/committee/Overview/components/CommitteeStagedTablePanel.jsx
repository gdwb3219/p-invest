import { FaPlus, FaMinus } from 'react-icons/fa';

function CommitteeStagedTablePanel({
  headers,
  stagedRows,
  stagedSelectedKeys,
  stagedColCount,
  stagedTableWrapRef,
  handleStagedTableScroll,
  beginDragSelection,
  updateDragSelection,
  endDragSelection,
  removeStagedRow,
  openManualItemModal,
  displayCell,
}) {
  return (
    <div className='invest-rev-request__panel'>
      <h2 className='invest-rev-request__panel-title'>투심위 생성 리스트</h2>
      <div
        className='invest-rev-request__table-wrap'
        ref={stagedTableWrapRef}
        onScroll={handleStagedTableScroll}
      >
        <table className='invest-rev-request__table invest-rev-request__table--staged'>
          <thead>
            <tr>
              <th
                className='invest-rev-request__th--staged-remove'
                aria-label='제거'
              />
              <th>#</th>
              {headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stagedRows.length === 0 ? (
              <tr>
                <td colSpan={Math.max(stagedColCount, 1)}>
                  <div className='invest-rev-request__empty-staged'>
                    <p className='invest-rev-request__empty-row invest-rev-request__empty-row--staged'>
                      투심위 항목이 없습니다.
                    </p>
                    {headers.length > 0 ? (
                      <button
                        type='button'
                        className='invest-rev-request__btn invest-rev-request__btn--plus'
                        onClick={() => openManualItemModal(-1)}
                      >
                        +
                      </button>
                    ) : (
                      <p className='invest-rev-request__empty-hint'>
                        대상 목록을 불러오면 신규 항목을 추가할 수 있습니다.
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {stagedRows.map((entry, idx) => {
                  const rowKey = String(entry?.rowKey ?? idx);
                  const row = entry?.row ?? {};
                  const selected = stagedSelectedKeys.has(rowKey);
                  const isManual = Boolean(entry?.isManual);
                  return (
                    <tr
                      key={rowKey}
                      className={
                        selected ? 'invest-rev-request__row--selected' : ''
                      }
                      onMouseDown={(e) =>
                        beginDragSelection(e, rowKey, idx, 'staged')
                      }
                      onMouseEnter={(e) => updateDragSelection(e, idx)}
                      onMouseUp={endDragSelection}
                      title='CTRL + 클릭으로 다중 선택'
                    >
                      <td
                        className='invest-rev-request__td--staged-remove'
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        {isManual ? (
                          <button
                            type='button'
                            className='invest-rev-request__btn invest-rev-request__btn--secondary invest-rev-request__btn--remove'
                            onClick={() => removeStagedRow(rowKey)}
                          >
                            <FaMinus />
                          </button>
                        ) : null}
                      </td>
                      <td>{idx + 1}</td>
                      {headers.map((h) => (
                        <td key={h}>{displayCell(row[h])}</td>
                      ))}
                    </tr>
                  );
                })}
                {headers.length > 0 ? (
                  <tr className='invest-rev-request__plus-row'>
                    <td
                      colSpan={stagedColCount}
                      className='invest-rev-request__plus-cell'
                    >
                      <button
                        type='button'
                        className='invest-rev-request__btn invest-rev-request__btn--plus'
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={() =>
                          openManualItemModal(stagedRows.length - 1)
                        }
                        title='마지막 항목 아래에 신규 항목을 추가합니다'
                      >
                        <FaPlus />
                      </button>
                    </td>
                  </tr>
                ) : null}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CommitteeStagedTablePanel;
