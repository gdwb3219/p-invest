import { BrowserRouter as Router } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import AppRoutes from './routes/AppRoutes';
import { ApiUrlProvider } from './contexts/ApiUrlContext';
import './styles/App.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const API_URL = 'http://127.0.0.1:8080/pinvest';

// create a query client
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ApiUrlProvider API_URL={API_URL}>
        <Router>
          <MainLayout>
            <AppRoutes />
          </MainLayout>
        </Router>
      </ApiUrlProvider>
    </QueryClientProvider>
  );
}

export default App;
