function CommitteeSourceTablePanel({
  headers,
  visibleRows,
  sourceUnfilteredCount,
  sourceInvestNameFilter,
  setSourceInvestNameFilter,
  investProjectNameColumn,
  hasInvestProjectColumn,
  sourceSelectedKeys,
  sourceTableWrapRef,
  handleSourceTableScroll,
  beginDragSelection,
  updateDragSelection,
  endDragSelection,
  displayCell,
}) {
  const filterTrimmed = sourceInvestNameFilter.trim();
  const emptyBecauseFilter =
    visibleRows.length === 0 &&
    sourceUnfilteredCount > 0 &&
    filterTrimmed.length > 0 &&
    hasInvestProjectColumn;

  return (
    <div className='invest-rev-request__panel'>
      <h2 className='invest-rev-request__panel-title'>
        투심위 대상 목록 (CTRL + 클릭 다중 선택)
      </h2>
      {hasInvestProjectColumn ? (
        <div className='invest-rev-request__source-filter'>
          <label className='invest-rev-request__label' htmlFor='committee-source-invest-filter'>
            {investProjectNameColumn} 필터
          </label>
          <input
            id='committee-source-invest-filter'
            type='search'
            className='invest-rev-request__input invest-rev-request__input--source-filter'
            value={sourceInvestNameFilter}
            onChange={(e) => setSourceInvestNameFilter(e.target.value)}
            placeholder={`${investProjectNameColumn}으로 검색`}
            autoComplete='off'
          />
        </div>
      ) : (
        <p className='invest-rev-request__hint' style={{ marginBottom: '0.65rem' }}>
          대상 데이터에 「{investProjectNameColumn}」 컬럼이 없어 필터를 사용할 수 없습니다.
        </p>
      )}
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
                  <p className='invest-rev-request__empty-row'>
                    {emptyBecauseFilter
                      ? '필터 조건에 맞는 항목이 없습니다.'
                      : '투심위 항목이 없습니다.'}
                  </p>
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
