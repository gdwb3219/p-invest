import {
  EMPTY_TABLE_PLACEHOLDER_ROWS,
  META_COLUMNS,
  formatCellValue,
  getDeleteAnchor,
  getRowReactKey,
} from '../requestsUtils';

function CommitteeRequestsTable({
  sortedRows,
  rowDataHeaders,
  selectedKeys,
  deletingKey,
  loading,
  bulkDeleting,
  allSelectableSelected,
  selectableTrackKeys,
  selectAllCheckboxRef,
  onToggleSelectAll,
  onToggleRowSelected,
  onDeleteRow,
}) {
  return (
    <div className='invest-rev-request__table-wrap'>
      <table className='invest-rev-request__table invest-rev-request__table--committee-requests'>
        <thead>
          <tr>
            <th className='invest-rev-request__th--committee-select' scope='col'>
              <input
                ref={selectAllCheckboxRef}
                type='checkbox'
                className='invest-rev-request__row-radio'
                checked={allSelectableSelected}
                onChange={onToggleSelectAll}
                disabled={selectableTrackKeys.length === 0 || loading || bulkDeleting}
                aria-label='전체 선택'
              />
            </th>
            <th>#</th>
            {META_COLUMNS.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            {rowDataHeaders.map((h) => (
              <th key={`rd-${h}`} title={h}>
                {h}
              </th>
            ))}
            <th className='invest-rev-request__th--committee-actions' scope='col'>
              삭제
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.length > 0
            ? sortedRows.map((row, idx) => {
                const rd =
                  row?.row_data && typeof row.row_data === 'object' ? row.row_data : {};
                const deleteAnchor = getDeleteAnchor(row);
                const deleteTrackKey = deleteAnchor?.trackKey ?? null;
                const isDeleting =
                  deleteTrackKey != null && deletingKey === deleteTrackKey;
                const isRowSelected =
                  deleteTrackKey != null && selectedKeys.has(deleteTrackKey);
                return (
                  <tr
                    key={getRowReactKey(row, idx)}
                    className={isRowSelected ? 'invest-rev-request__row--selected' : undefined}
                  >
                    <td className='invest-rev-request__td--committee-select'>
                      <input
                        type='checkbox'
                        className='invest-rev-request__row-radio'
                        checked={Boolean(deleteTrackKey && selectedKeys.has(deleteTrackKey))}
                        onChange={() => onToggleRowSelected(deleteTrackKey)}
                        disabled={!deleteTrackKey || loading || bulkDeleting || isDeleting}
                        aria-label={`행 ${idx + 1} 선택`}
                      />
                    </td>
                    <td>{idx + 1}</td>
                    {META_COLUMNS.map((col) => (
                      <td key={col.key}>{formatCellValue(row?.[col.key])}</td>
                    ))}
                    {rowDataHeaders.map((h) => (
                      <td key={h} title={formatCellValue(rd[h])}>
                        {formatCellValue(rd[h])}
                      </td>
                    ))}
                    <td className='invest-rev-request__td--committee-actions'>
                      <button
                        type='button'
                        className='invest-rev-request__btn invest-rev-request__btn--remove invest-rev-request__btn--committee-delete'
                        aria-label='행 삭제'
                        disabled={!deleteTrackKey || loading || bulkDeleting || isDeleting}
                        onClick={() => void onDeleteRow(row)}
                      >
                        {isDeleting ? '삭제 중…' : '삭제'}
                      </button>
                    </td>
                  </tr>
                );
              })
            : Array.from({ length: EMPTY_TABLE_PLACEHOLDER_ROWS }, (_, i) => (
                <tr
                  key={`committee-req-placeholder-${i}`}
                  className='invest-rev-request__tr--committee-placeholder'
                >
                  <td className='invest-rev-request__td--committee-select'>&#160;</td>
                  <td>&#160;</td>
                  {META_COLUMNS.map((col) => (
                    <td key={col.key}>&#160;</td>
                  ))}
                  {rowDataHeaders.map((h) => (
                    <td key={h}>&#160;</td>
                  ))}
                  <td className='invest-rev-request__td--committee-actions'>&#160;</td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}

export default CommitteeRequestsTable;
