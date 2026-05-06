import { NavLink, Outlet } from 'react-router-dom';
import '../styles/pages/CommitteePage.css';

const TAB_ROUTES = [
  { path: 'overview', label: '투심위 생성' },
  { path: 'requests', label: '투심위 생성 현황' },
  { path: 'history-list', label: '투심위 리스트' },
];

function CommitteePage() {
  return (
    <div className='invest-rev-page'>
      <header className='invest-rev-header'>
        <h1 className='invest-rev-title'>투자 심의 위원회 관리</h1>
        <nav className='invest-rev-tabs'>
          {TAB_ROUTES.map(({ path, label }) => (
            <NavLink
              key={path}
              to={path}
              end
              className={({ isActive }) =>
                `invest-rev-tab ${isActive ? 'invest-rev-tab--active' : 'invest-rev-tab--inactive'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className='invest-rev-content'>
        <Outlet />
      </main>
    </div>
  );
}

export default CommitteePage;
