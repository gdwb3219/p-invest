/**
 * 테이블 데이터 관련 API 서비스
 * MongoDB 또는 다른 백엔드 서버와의 통신을 담당
 */

// Mock 데이터 (실제로는 서버에서 가져옴)
import { mockTable1Data, mockTable2Data } from "../data/mockData";

/**
 * 테이블 데이터를 MongoDB에서 가져오는 함수
 * @param {number} tableNumber - 테이블 번호 (1 또는 2)
 * @returns {Promise<Array>} 테이블 데이터 배열
 */
export const fetchTableDataFromMongoDB = async (tableNumber) => {
  // 실제로는 서버 API 호출
  // const response = await fetch(`/api/tables/${tableNumber}`);
  // if (!response.ok) {
  //   throw new Error('데이터를 불러오는데 실패했습니다.');
  // }
  // return await response.json();

  // Mock 데이터 반환 (네트워크 지연 시뮬레이션)
  return new Promise((resolve) => {
    setTimeout(() => {
      if (tableNumber === 1) {
        resolve(mockTable1Data);
      } else {
        resolve(mockTable2Data);
      }
    }, 500);
  });
};

/**
 * 변경 사유를 서버에 저장하는 함수
 * @param {number} rowIndex - 행 인덱스
 * @param {string} column - 열 이름
 * @param {string} reason - 변경 사유
 * @returns {Promise<void>}
 */
export const saveChangeReason = async (rowIndex, column, reason) => {
  // 실제로는 서버 API 호출
  // const response = await fetch('/api/change-reasons', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({ rowIndex, column, reason }),
  // });
  // if (!response.ok) {
  //   throw new Error('변경 사유 저장에 실패했습니다.');
  // }

  // Mock: 로컬 스토리지에 저장
  const key = `change_reason_${rowIndex}_${column}`;
  localStorage.setItem(key, reason);

  return Promise.resolve();
};

/**
 * 저장된 변경 사유를 가져오는 함수
 * @param {number} rowIndex - 행 인덱스
 * @param {string} column - 열 이름
 * @returns {Promise<string|null>} 변경 사유 또는 null
 */
export const getChangeReason = async (rowIndex, column) => {
  // 실제로는 서버 API 호출
  // const response = await fetch(`/api/change-reasons/${rowIndex}/${column}`);
  // if (!response.ok) {
  //   return null;
  // }
  // const data = await response.json();
  // return data.reason;

  // Mock: 로컬 스토리지에서 가져오기
  const key = `change_reason_${rowIndex}_${column}`;
  return Promise.resolve(localStorage.getItem(key));
};
