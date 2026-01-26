import "./RevSelector.css";

function RevSelector({
  label,
  id,
  value,
  onChange,
  revisions,
  disabled = false,
  placeholder = "-- 선택하세요 --",
}) {
  const handleChange = (e) => {
    const selectedValue = e.target.value;
    console.log(`${label} 선택됨:`, selectedValue);
    onChange(selectedValue);
  };

  // revision의 고유 식별자 추출 (id, _id 등 다양한 형태 지원)
  const getRevisionId = (revision) => {
    return revision.id || revision._id || revision.import_id || String(revision);
  };

  // revision의 표시 이름 추출
  const getRevisionDisplayName = (revision) => {
    const name = revision.name || revision.revision_name || revision.revision || `Revision ${getRevisionId(revision)}`;
    const importId = revision.import_id || revision.importId;
    return importId ? `${name} (import_id: ${importId})` : name;
  };

  return (
    <div className="selector-group">
      <label htmlFor={id}>{label}:</label>
      <select
        id={id}
        value={value || ""}
        onChange={handleChange}
        className="revision-select"
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {revisions.map((revision, index) => {
          const revisionId = getRevisionId(revision);
          return (
            <option key={revisionId || index} value={revisionId}>
              {getRevisionDisplayName(revision)}
            </option>
          );
        })}
      </select>
    </div>
  );
}

export default RevSelector;
