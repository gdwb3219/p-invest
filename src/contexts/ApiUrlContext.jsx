import { createContext, useContext } from 'react';

const ApiUrlContext = createContext({ API_URL: '' });

export function ApiUrlProvider({ API_URL, children }) {
  return (
    <ApiUrlContext.Provider value={{ API_URL }}>{children}</ApiUrlContext.Provider>
  );
}

export function useApiUrl() {
  return useContext(ApiUrlContext);
}
