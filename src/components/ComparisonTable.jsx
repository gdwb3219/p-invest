import { useState } from 'react';
import ChangeReasonForm from './ChangeReasonForm';
import '../styles/components/ComparisonTable.css';

function ComparisonTable({ table1, table2, table1Headers, table2Headers, comparisonResult, changeReasons, onChangeReasonSubmit }) {
  const { differentRows, rowDifferences, cellDifferences, allHeaders } = comparisonResult;
  const [selectedCell, setSelectedCell] = useState(null); // { rowIndex, column }

  const getCellClass = (rowIndex, column) => {
    const key = `${rowIndex}_${column}`;
    if (cellDifferences[key]) {
      return 'cell-different';
    }
    return '';
  };

  const getRowClass = (rowIndex) => {
    if (differentRows.includes(rowIndex)) {
      return 'row-different';
    }
    return '';
  };

  const getCellValue = (table, rowIndex, column) => {
    const row = table[rowIndex];
    if (!row) return '';
    return row[column] !== undefined ? String(row[column]) : '';
  };

  const getDiffInfo = (rowIndex, column) => {
    const key = `${rowIndex}_${column}`;
    return cellDifferences[key];
  };

  const handleCellClick = (rowIndex, column) => {
    const key = `${rowIndex}_${column}`;
    if (cellDifferences[key]) {
      setSelectedCell({ rowIndex, column });
    }
  };

  const handleReasonSubmit = (rowIndex, column, reason) => {
    onChangeReasonSubmit(rowIndex, column, reason);
    setSelectedCell(null);
  };

  const getChangeReason = (rowIndex, column) => {
    const key = `${rowIndex}_${column}`;
    return changeReasons[key] || null;
  };

  return (
    <div className="comparison-table-container">
      <div className="tables-wrapper-vertical">
        {/* 테이블 1 */}
        <div className="table-panel">
          <h3>테이블 1 (원본 데이터)</h3>
          <div className="table-scroll">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th className="row-number">#</th>
                  {allHeaders.map(header => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table1.map((row, rowIndex) => (
                  <tr key={rowIndex} className={getRowClass(rowIndex)}>
                    <td className="row-number">{rowIndex + 1}</td>
                    {allHeaders.map(header => {
                      const diffInfo = getDiffInfo(rowIndex, header);
                      const cellClass = getCellClass(rowIndex, header);
                      const hasReason = getChangeReason(rowIndex, header);
                      const cellValue = getCellValue(table1, rowIndex, header);
                      const tooltipText = diffInfo 
                        ? `클릭하여 변경 사유 입력\n변경 전: ${cellValue}\n변경 후: ${getCellValue(table2, rowIndex, header)}`
                        : cellValue;
                      return (
                        <td 
                          key={header} 
                          className={`${cellClass} ${diffInfo ? 'clickable-cell' : ''}`}
                          onClick={() => handleCellClick(rowIndex, header)}
                          title={tooltipText}
                        >
                          {diffInfo ? (
                            <div className="cell-with-diff">
                              <span className="old-value">{cellValue}</span>
                              <span className="diff-indicator">→</span>
                              {hasReason && (
                                <span className="reason-badge" title={hasReason}>💬</span>
                              )}
                            </div>
                          ) : (
                            <span className="cell-text">{cellValue}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 테이블 2 */}
        <div className="table-panel">
          <h3>테이블 2 (변경된 데이터)</h3>
          <div className="table-scroll">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th className="row-number">#</th>
                  {allHeaders.map(header => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table2.map((row, rowIndex) => (
                  <tr key={rowIndex} className={getRowClass(rowIndex)}>
                    <td className="row-number">{rowIndex + 1}</td>
                    {allHeaders.map(header => {
                      const diffInfo = getDiffInfo(rowIndex, header);
                      const cellClass = getCellClass(rowIndex, header);
                      const hasReason = getChangeReason(rowIndex, header);
                      const cellValue = getCellValue(table2, rowIndex, header);
                      const tooltipText = diffInfo 
                        ? `클릭하여 변경 사유 입력\n변경 전: ${getCellValue(table1, rowIndex, header)}\n변경 후: ${cellValue}`
                        : cellValue;
                      return (
                        <td 
                          key={header} 
                          className={`${cellClass} ${diffInfo ? 'clickable-cell' : ''}`}
                          onClick={() => handleCellClick(rowIndex, header)}
                          title={tooltipText}
                        >
                          {diffInfo ? (
                            <div className="cell-with-diff">
                              <span className="diff-indicator">→</span>
                              <span className="new-value">{cellValue}</span>
                              {hasReason && (
                                <span className="reason-badge" title={hasReason}>💬</span>
                              )}
                            </div>
                          ) : (
                            <span className="cell-text">{cellValue}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedCell && (
        <ChangeReasonForm
          rowIndex={selectedCell.rowIndex}
          column={selectedCell.column}
          oldValue={getCellValue(table1, selectedCell.rowIndex, selectedCell.column)}
          newValue={getCellValue(table2, selectedCell.rowIndex, selectedCell.column)}
          existingReason={getChangeReason(selectedCell.rowIndex, selectedCell.column)}
          onSubmit={handleReasonSubmit}
          onCancel={() => setSelectedCell(null)}
        />
      )}

      {/* 차이점 상세 정보 */}
      {differentRows.length > 0 && (
        <div className="diff-details">
          <h3>차이점 상세</h3>
          <div className="diff-list">
            {differentRows.map(rowIndex => (
              <div key={rowIndex} className="diff-item">
                <div className="diff-item-header">
                  <strong>행 {rowIndex + 1}</strong>
                </div>
                <div className="diff-item-content">
                  {allHeaders.map(header => {
                    const diff = rowDifferences[rowIndex]?.[header];
                    if (diff && diff.changed) {
                      const hasReason = getChangeReason(rowIndex, header);
                      return (
                        <div 
                          key={header} 
                          className="diff-field clickable-diff-field"
                          onClick={() => handleCellClick(rowIndex, header)}
                          title="클릭하여 변경 사유 입력"
                        >
                          <span className="diff-field-name">{header}:</span>
                          <span className="diff-old">{diff.oldValue || '(비어있음)'}</span>
                          <span className="diff-arrow">→</span>
                          <span className="diff-new">{diff.newValue || '(비어있음)'}</span>
                          {hasReason && (
                            <span className="reason-badge" title={hasReason}>💬</span>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ComparisonTable;

