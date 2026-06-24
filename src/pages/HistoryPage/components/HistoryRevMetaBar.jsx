function HistoryRevMetaBar({ revMeta }) {
  if (!revMeta) return null;

  const { revId, versionName, importId, importedAtLabel, rowCount } = revMeta;

  const metaItems = [
    versionName ? { label: 'Version', value: versionName } : null,
    importId ? { label: 'Import ID', value: importId } : null,
    importedAtLabel ? { label: 'Import 시간', value: importedAtLabel } : null,
    rowCount != null ? { label: '행 수', value: `${rowCount.toLocaleString('ko-KR')}행` } : null,
  ].filter(Boolean);

  return (
    <div className='history-rev-meta-bar' aria-label='현재 Revision 정보'>
      <div className='history-rev-meta-bar__left'>
        <span className='history-rev-meta-bar__label'>Rev</span>
        <span className='history-rev-meta-bar__rev'>{revId ?? '알 수 없음'}</span>
      </div>
      {metaItems.length > 0 && (
        <div className='history-rev-meta-bar__right'>
          {metaItems.map((item) => (
            <span key={item.label} className='history-rev-meta-bar__item'>
              <span className='history-rev-meta-bar__item-label'>{item.label}</span>
              <span className='history-rev-meta-bar__item-value'>{item.value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default HistoryRevMetaBar;
