function CommitteeSourceTablePanel({
  headers,
  visibleRows,
  sourceSelectedKeys,
  sourceTableWrapRef,
  handleSourceTableScroll,
  beginDragSelection,
  updateDragSelection,
  endDragSelection,
  displayCell,
}) {
  return (
    <div className='invest-rev-request__panel'>
      <h2 className='invest-rev-request__panel-title'>
        투심위 대상 목록 (CTRL + 클릭 다중 선택)
      </h2>
      <div
        className='invest-rev-request__table-wrap'
        ref={sourceTableWrapRef}
        onScroll={handleSourceTableScroll}
      >
        <table className='invest-rev-request__table'>
          <thead>
            <tr>
              <th>#</th>
              {headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={Math.max(headers.length + 1, 1)}>
                  <p className='invest-rev-request__empty-row'>투심위 항목이 없습니다.</p>
                </td>
              </tr>
            ) : (
              visibleRows.map(({ row, rowKey }, idx) => {
                const selected = sourceSelectedKeys.has(rowKey);
                return (
                  <tr
                    key={rowKey}
                    className={selected ? 'invest-rev-request__row--selected' : ''}
                    onMouseDown={(e) => beginDragSelection(e, rowKey, idx, 'source')}
                    onMouseEnter={(e) => updateDragSelection(e, idx)}
                    onMouseUp={endDragSelection}
                    title='CTRL + 클릭으로 다중 선택'
                  >
                    <td>{idx + 1}</td>
                    {headers.map((h) => (
                      <td key={h}>{displayCell(row[h])}</td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CommitteeSourceTablePanel;
