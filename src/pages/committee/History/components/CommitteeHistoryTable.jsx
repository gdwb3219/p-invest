import { META_COLUMNS, formatCellValue, getRowReactKey } from '../historyUtils';

function CommitteeHistoryTable({ filteredRows, rowDataHeaders }) {
  return (
    <div className='invest-rev-request__table-wrap'>
      <table className='invest-rev-request__table'>
        <thead>
          <tr>
            <th>#</th>
            {META_COLUMNS.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            {rowDataHeaders.map((h) => (
              <th key={`rd-${h}`} title={h}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((row, idx) => {
            const rd = row?.row_data && typeof row.row_data === 'object' ? row.row_data : {};
            return (
              <tr key={getRowReactKey(row, idx)}>
                <td>{idx + 1}</td>
                {META_COLUMNS.map((col) => (
                  <td key={col.key}>{formatCellValue(row?.[col.key])}</td>
                ))}
                {rowDataHeaders.map((h) => (
                  <td key={h} title={formatCellValue(rd[h])}>
                    {formatCellValue(rd[h])}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default CommitteeHistoryTable;
