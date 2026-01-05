import { NavLink } from 'react-router-dom';
import { ROUTES, ROUTE_META } from '../constants/routes';
import './NavigationBar.css';

function NavigationBar() {
  return (
    <nav className="navigation-bar">
      <div className="nav-header">
        <h2>P-Invest System</h2>
      </div>
      <ul className="nav-menu">
        {Object.entries(ROUTE_META).map(([path, meta]) => (
          <li key={path}>
            <NavLink 
              to={path} 
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              <span className="nav-icon">{meta.icon}</span>
              <span className="nav-label">{meta.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default NavigationBar;
