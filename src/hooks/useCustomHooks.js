import { useEffect, useState } from 'react';

export { useCountStore } from '../stores/countStore';

/** sessionStorage와 동기화되는 로컬 상태 (페이지·폼 단위 persist용) */
export function useSessionStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') return initialValue;

    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Session Storage 읽기 오류:', error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error('Session Storage 쓰기 오류:', error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
