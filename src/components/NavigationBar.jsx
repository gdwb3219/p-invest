import { NavLink } from "react-router-dom";
import { ROUTES, ROUTE_META } from "../constants/routes";
import { FaTableColumns, FaFlask, FaSliders } from "react-icons/fa6";
import "./NavigationBar.css";

function NavigationBar() {
  const ICONS = {
    [ROUTES.COMPARE]: <FaTableColumns />,
    [ROUTES.TEST]: <FaFlask />,
    [ROUTES.SETTINGS]: <FaSliders />,
  };

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
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              <span className="nav-icon">{ICONS[path]}</span>
              <span className="nav-label">{meta.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default NavigationBar;

