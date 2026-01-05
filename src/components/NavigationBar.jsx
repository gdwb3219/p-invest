import { NavLink } from 'react-router-dom';
import './NavigationBar.css';

function NavigationBar() {
  return (
    <nav className="navigation-bar">
      <div className="nav-header">
        <h2>P-Invest System</h2>
      </div>
      <ul className="nav-menu">
        <li>
          <NavLink 
            to="/compare" 
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
          >
            비교 페이지
          </NavLink>
        </li>
        <li>
          <NavLink 
            to="/test" 
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
          >
            테스트 탭
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

export default NavigationBar;
