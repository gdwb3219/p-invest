function NavExamplePlaceholder({ variant }) {
  return (
    <div className="invest-rev-page">
      <header className="invest-rev-header">
        <h1 className="invest-rev-title">예시</h1>
      </header>
      <main className="invest-rev-content">
        <div className="invest-rev-sub-page">
          <p className="invest-rev-sub-badge invest-rev-sub-badge--active">예시 {variant}</p>
          <p className="invest-rev-sub-desc">네비게이션용 예시 페이지입니다.</p>
        </div>
      </main>
    </div>
  );
}

export default NavExamplePlaceholder;
