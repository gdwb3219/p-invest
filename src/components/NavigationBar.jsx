import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  ROUTES,
  ROUTE_META,
  CHANGE_REQUEST_NAV_GROUP,
  INVEST_CHANGE_REQUEST_NAV_PREFIX,
  isInvestRevLegacySubActive,
  isChangeRequestNavSubActive,
  isCommitteeChangeNavActive,
} from "../constants/routes";
import {
  FaTableColumns,
  FaFlask,
  FaClockRotateLeft,
  FaChartLine,
  FaSliders,
  FaPenToSquare,
  FaChevronDown,
} from "react-icons/fa6";
import "../styles/components/NavigationBar.css";

const ICONS = {
  [ROUTES.COMPARE]: <FaTableColumns />,
  [ROUTES.TEST]: <FaFlask />,
  [ROUTES.HISTORY]: <FaClockRotateLeft />,
  [ROUTES.DASHBOARD]: <FaChartLine />,
  [ROUTES.SETTINGS]: <FaSliders />,
};

function NavigationBar() {
  const location = useLocation();
  const prefix = INVEST_CHANGE_REQUEST_NAV_PREFIX;
  const prevPathRef = useRef(location.pathname);

  const [changeRequestOpen, setChangeRequestOpen] = useState(() =>
    location.pathname.startsWith(prefix)
  );

  useEffect(() => {
    const prev = prevPathRef.current;
    const wasOutside = !prev.startsWith(prefix);
    const nowInside = location.pathname.startsWith(prefix);
    if (wasOutside && nowInside) setChangeRequestOpen(true);
    if (!location.pathname.startsWith(prefix)) setChangeRequestOpen(false);
    prevPathRef.current = location.pathname;
  }, [location.pathname, prefix]);

  const changeRequestMainActive = isChangeRequestNavSubActive(
    location.pathname
  );

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
        <li className="nav-menu__group">
          <button
            type="button"
            className={
              changeRequestMainActive
                ? "nav-group-toggle active"
                : "nav-group-toggle"
            }
            aria-expanded={changeRequestOpen}
            onClick={() => setChangeRequestOpen((open) => !open)}
          >
            <span className="nav-icon">
              <FaPenToSquare />
            </span>
            <span className="nav-label">{CHANGE_REQUEST_NAV_GROUP.label}</span>
            <span
              className={
                changeRequestOpen
                  ? "nav-chevron nav-chevron--open"
                  : "nav-chevron"
              }
              aria-hidden
            >
              <FaChevronDown />
            </span>
          </button>
          {changeRequestOpen ? (
            <ul className="nav-sub-menu">
              {CHANGE_REQUEST_NAV_GROUP.children.map(({ path, label }) => {
                const legacy = path === ROUTES.INVEST_REV;
                const committee = path === ROUTES.INVEST_REV_COMMITTEE_CHANGE;
                return (
                  <li key={path}>
                    <NavLink
                      to={path}
                      end
                      className={({ isActive }) =>
                        (legacy
                          ? isActive ||
                            isInvestRevLegacySubActive(location.pathname)
                          : committee
                            ? isActive ||
                              isCommitteeChangeNavActive(location.pathname)
                            : isActive)
                          ? "nav-sub-link active"
                          : "nav-sub-link"
                      }
                    >
                      {label}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </li>
      </ul>
    </nav>
  );
}

export default NavigationBar;
