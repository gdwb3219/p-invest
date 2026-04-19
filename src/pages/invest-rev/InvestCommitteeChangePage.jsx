import { NavLink, Outlet } from "react-router-dom";
import "../../styles/pages/InvestRevPage.css";

const TAB_ROUTES = [
  { path: "main", label: "투심위 변경" },
  { path: "requests", label: "투심위 변경요청 내역" },
  { path: "history", label: "투심위 변경 이력" },
];

function InvestCommitteeChangePage() {
  return (
    <div className="invest-rev-page">
      <header className="invest-rev-header">
        <h1 className="invest-rev-title">투심위 변경</h1>
        <nav className="invest-rev-tabs">
          {TAB_ROUTES.map(({ path, label }) => (
            <NavLink
              key={path}
              to={path}
              end
              className={({ isActive }) =>
                `invest-rev-tab ${isActive ? "invest-rev-tab--active" : "invest-rev-tab--inactive"}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="invest-rev-content">
        <Outlet />
      </main>
    </div>
  );
}

export default InvestCommitteeChangePage;
