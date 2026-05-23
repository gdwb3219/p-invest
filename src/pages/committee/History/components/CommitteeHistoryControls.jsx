function CommitteeHistoryControls({
  loading,
  historyListUrl,
  filteredRowsLength,
  sortedRowsLength,
  committeeStatusFilter,
  committeeStatusOptions,
  onRefresh,
  onDownloadCsv,
  onStatusFilterChange,
}) {
  return (
    <>
      <div className='invest-rev-request__toolbar'>
        <button
          type='button'
          className='invest-rev-request__btn invest-rev-request__btn--secondary'
          onClick={() => void onRefresh()}
          disabled={loading}
        >
          {loading ? '불러오는 중…' : '목록 새로고침'}
        </button>
        <p className='invest-rev-request__hint'>
          GET: <code>{historyListUrl}</code>
        </p>
      </div>

      <div
        className='invest-rev-request__modal-header'
        style={{ flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}
      >
        <h2 className='invest-rev-request__panel-title' style={{ margin: 0, flex: '1 1 auto' }}>
          투심위 리스트 ({filteredRowsLength}
          {committeeStatusFilter ? ` / 전체 ${sortedRowsLength}` : ''}건)
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '0.75rem' }}>
          <div style={{ minWidth: '12rem', maxWidth: '22rem' }}>
            <label className='invest-rev-request__label' htmlFor='committee-history-status-filter'>
              투심위 상태 필터
            </label>
            <select
              id='committee-history-status-filter'
              className='invest-rev-request__select'
              value={committeeStatusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              disabled={loading}
            >
              <option value=''>전체</option>
              {committeeStatusOptions.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <button
            type='button'
            className='invest-rev-request__btn invest-rev-request__btn--secondary'
            onClick={onDownloadCsv}
            disabled={filteredRowsLength === 0}
          >
            CSV 다운로드
          </button>
        </div>
      </div>
    </>
  );
}

export default CommitteeHistoryControls;
