import { create } from 'zustand';

export const DEFAULT_API_URL = 'http://127.0.0.1:8080/pinvest';

interface ApiConfigState {
  apiUrl: string;
  setApiUrl: (apiUrl: string) => void;
}

export const useApiConfigStore = create<ApiConfigState>((set) => ({
  apiUrl: DEFAULT_API_URL,
  setApiUrl: (apiUrl) => set({ apiUrl }),
}));

/** API 베이스 URL 조회 (기존 Context API useApiUrl 호환) */
export function useApiUrl() {
  const apiUrl = useApiConfigStore((state) => state.apiUrl);
  return { API_URL: apiUrl };
}
