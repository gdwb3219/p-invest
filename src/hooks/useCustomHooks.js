import { useEffect, useState } from 'react';
import { create } from 'zustand';

// Zustand를 사용하는 커스텀 훅
export const useCountStore = create((set) => ({
  count: 0,

  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));

// Session Storage를 사용하는 커스텀 훅
export function useSessionStorage(key, initialValue) {
  // 1. 초기 상태를 Session Storage에서 읽어오기
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') return initialValue; // SSR(Next.js 등) 방어 코드

    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Session Storage 읽기 오류:', error);
      return initialValue;
    }
  });

  // 2. 상태가 변경될 때마다 Session Storage도 업데이트
  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error('Session Storage 쓰기 오류:', error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
