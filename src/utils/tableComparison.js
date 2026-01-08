/**
 * 두 테이블을 비교하여 차이점을 찾는 함수
 */
export function compareTables(table1, table2, headers1, headers2) {
  // 모든 고유한 헤더 수집
  const allHeaders = [...new Set([...headers1, ...headers2])];
  
  // 차이가 있는 행들의 인덱스
  const differentRows = [];
  // 각 행의 차이점 상세 정보
  const rowDifferences = {};
  // 각 셀의 차이점 정보 (rowIndex_columnName)
  const cellDifferences = {};
  
  let totalDifferences = 0;

  // 두 테이블의 최대 길이
  const maxLength = Math.max(table1.length, table2.length);

  for (let i = 0; i < maxLength; i++) {
    const row1 = table1[i] || {};
    const row2 = table2[i] || {};
    const rowDiff = {};

    // 각 헤더에 대해 비교
    allHeaders.forEach(header => {
      const value1 = row1[header] !== undefined ? String(row1[header]) : '';
      const value2 = row2[header] !== undefined ? String(row2[header]) : '';

      if (value1 !== value2) {
        rowDiff[header] = {
          oldValue: value1,
          newValue: value2,
          changed: true
        };
        cellDifferences[`${i}_${header}`] = {
          rowIndex: i,
          column: header,
          oldValue: value1,
          newValue: value2
        };
        totalDifferences++;
      } else {
        rowDiff[header] = {
          oldValue: value1,
          newValue: value2,
          changed: false
        };
      }
    });

    // 행에 차이가 있는지 확인
    const hasDifference = Object.values(rowDiff).some(diff => diff.changed);
    if (hasDifference) {
      differentRows.push(i);
      rowDifferences[i] = rowDiff;
    }
  }

  return {
    differentRows,
    rowDifferences,
    cellDifferences,
    totalDifferences,
    allHeaders
  };
}

