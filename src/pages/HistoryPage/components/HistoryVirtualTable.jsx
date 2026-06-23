import { useMemo, useRef } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import HistoryChangeReasonCell from './HistoryChangeReasonCell';
import {
  CHANGE_REASON_COLUMN,
  getRowImportId,
  getRowPrimeKey,
} from '../historyReasonUtils';

const ROW_HEIGHT = 30;

function HistoryVirtualTable({
  data,
  dataHeaders,
  hasReasonColumn,
  apiBase,
  onReasonSaved,
  primeKeyFallback,
  selectedPrimeKey = null,
  onRowClick = null,
  showRowOpenIcon = false,
  tableClassName = 'history-table',
  wrapperClassName = 'history-table-wrapper',
  rowNumClassName = 'history-row-num',
}) {
  const parentRef = useRef(null);

  const columns = useMemo(() => {
    const cols = [
      {
        id: 'rowNum',
        header: '#',
        size: 48,
        cell: ({ row }) => (
          <>
            {showRowOpenIcon && (
              <span
                className={`history-open-icon ${
                  selectedPrimeKey ===
                  String(
                    row.original['prime-key'] ??
                      row.original.prime_key ??
                      row.index,
                  )
                    ? 'history-open-icon--active'
                    : ''
                }`}
                aria-hidden
              >
                ›
              </span>
            )}
            {row.index + 1}
          </>
        ),
      },
      ...dataHeaders.map((header) => ({
        id: header,
        accessorFn: (row) => row[header] ?? '',
        header,
        cell: (info) => info.getValue(),
      })),
    ];

    if (hasReasonColumn) {
      cols.push({
        id: 'reason',
        header: CHANGE_REASON_COLUMN,
        size: 240,
        cell: ({ row }) => (
          <HistoryChangeReasonCell
            key={`${getRowImportId(row.original)}-${getRowPrimeKey(row.original, primeKeyFallback)}`}
            row={row.original}
            apiBase={apiBase}
            primeKeyFallback={primeKeyFallback}
            onSaved={(value) => onReasonSaved?.(row.index, value)}
          />
        ),
      });
    }

    return cols;
  }, [
    apiBase,
    dataHeaders,
    hasReasonColumn,
    onReasonSaved,
    primeKeyFallback,
    selectedPrimeKey,
    showRowOpenIcon,
  ]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows } = table.getRowModel();
  const colSpan = columns.length;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
      : 0;

  const getRowPrimeKeyValue = (row) =>
    String(row.original['prime-key'] ?? row.original.prime_key ?? row.index);

  return (
    <div ref={parentRef} className={wrapperClassName}>
      <table className={tableClassName}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={
                    header.id === 'rowNum'
                      ? `${rowNumClassName} history-th-open`
                      : header.id === 'reason'
                        ? 'history-col-reason'
                        : undefined
                  }
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {paddingTop > 0 && (
            <tr aria-hidden='true'>
              <td
                colSpan={colSpan}
                style={{ height: paddingTop, padding: 0, border: 0 }}
              />
            </tr>
          )}
          {virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index];
            const keyStr = getRowPrimeKeyValue(row);
            const isSelected = selectedPrimeKey === keyStr;
            const isClickable = Boolean(onRowClick);

            return (
              <tr
                key={row.id}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                className={
                  [
                    isSelected ? 'history-row-selected' : '',
                    isClickable ? 'history-row-clickable' : '',
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined
                }
                style={{ height: `${virtualRow.size}px` }}
                onClick={
                  isClickable
                    ? () => onRowClick(row.original, virtualRow.index)
                    : undefined
                }
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onKeyDown={
                  isClickable
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onRowClick(row.original, virtualRow.index);
                        }
                      }
                    : undefined
                }
                aria-selected={isClickable ? isSelected : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={
                      cell.column.id === 'rowNum'
                        ? `${rowNumClassName} history-td-open`
                        : cell.column.id === 'reason'
                          ? 'history-col-reason'
                          : undefined
                    }
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
          {paddingBottom > 0 && (
            <tr aria-hidden='true'>
              <td
                colSpan={colSpan}
                style={{ height: paddingBottom, padding: 0, border: 0 }}
              />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default HistoryVirtualTable;
