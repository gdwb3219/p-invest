import { useState, useCallback } from 'react';
import { saveChangeReason, getChangeReason } from '../services/tableService';

/**
 * 변경 사유를 관리하는 커스텀 훅
 * @returns {Object} { changeReasons, saveReason, getReason }
 */
export function useChangeReasons() {
  const [changeReasons, setChangeReasons] = useState({});

  /**
   * 변경 사유를 저장하는 함수
   * @param {number} rowIndex - 행 인덱스
   * @param {string} column - 열 이름
   * @param {string} reason - 변경 사유
   */
  const saveReason = useCallback(async (rowIndex, column, reason) => {
    try {
      await saveChangeReason(rowIndex, column, reason);
      const key = `${rowIndex}_${column}`;
      setChangeReasons(prev => ({
        ...prev,
        [key]: reason,
      }));
    } catch (error) {
      console.error('변경 사유 저장 오류:', error);
      throw error;
    }
  }, []);

  /**
   * 저장된 변경 사유를 가져오는 함수
   * @param {number} rowIndex - 행 인덱스
   * @param {string} column - 열 이름
   * @returns {string|null} 변경 사유 또는 null
   */
  const getReason = useCallback((rowIndex, column) => {
    const key = `${rowIndex}_${column}`;
    return changeReasons[key] || null;
  }, [changeReasons]);

  return {
    changeReasons,
    saveReason,
    getReason,
  };
}
