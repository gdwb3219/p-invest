import { NavLink, Outlet } from "react-router-dom";
import "./InvestRevPage.css";

const TAB_ROUTES = [
  { path: "list", label: "요청 목록" },
  { path: "request", label: "변경 요청" },
  { path: "history", label: "처리 이력" },
];

function InvestRevPage() {
  return (
    <div className="invest-rev-page">
      <header className="invest-rev-header">
        <h1 className="invest-rev-title">투자 변경 요청</h1>
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

export default InvestRevPage;
