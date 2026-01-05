import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import NavigationBar from './components/NavigationBar';
import ComparePage from './pages/ComparePage';
import TestPage from './pages/TestPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <NavigationBar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/compare" replace />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/test" element={<TestPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
