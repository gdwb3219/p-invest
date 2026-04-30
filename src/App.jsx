import { BrowserRouter as Router } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import AppRoutes from './routes/AppRoutes';
import { ApiUrlProvider } from './contexts/ApiUrlContext';
import './styles/App.css';

const API_URL = 'http://127.0.0.1:8080/pinvest';

function App() {
  return (
    <ApiUrlProvider API_URL={API_URL}>
      <Router>
        <MainLayout>
          <AppRoutes />
        </MainLayout>
      </Router>
    </ApiUrlProvider>
  );
}

export default App;
