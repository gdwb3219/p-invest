import { useState, useEffect } from "react";
import axios from "axios";
import "./SettingPage.css";

function SettingPage() {
  const [revisions, setRevisions] = useState([]);
  const [selectedImportId, setSelectedImportId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingRevisions, setLoadingRevisions] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // revision 목록 가져오기
  useEffect(() => {
    fetchRevisions();
  }, []);

  const fetchRevisions = async () => {
    setLoadingRevisions(true);
    setError(null);
    try {
      const response = await axios.get("http://127.0.0.1:8080/api/imports/rev-list/");
      const revisionsData = Array.isArray(response.data)
        ? response.data
        : response.data?.data || response.data?.results || [];
      console.log("Revisions Data:", revisionsData);
      setRevisions(revisionsData);
    } catch (err) {
      console.error("Revision 목록 가져오기 오류:", err);
      setError("Revision 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoadingRevisions(false);
    }
  };

  const handleImportIdChange = (e) => {
    setSelectedImportId(e.target.value);
    setConfirmDelete(false);
    setSuccess(null);
    setError(null);
  };

  const handleDelete = async () => {
    if (!selectedImportId) {
      setError("삭제할 import_id를 선택해주세요.");
      return;
    }

    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // imports 콜렉션과 sap_his_data 콜렉션에서 삭제
      const [importsResponse, sapHisResponse] = await Promise.all([
        axios.delete(`http://127.0.0.1:8080/api/imports/delete/`, {
          params: { import_id: selectedImportId },
        }),
        axios.delete(`http://127.0.0.1:8080/api/sap-his-data/delete/`, {
          params: { import_id: selectedImportId },
        }),
      ]);

      console.log("Imports 삭제 응답:", importsResponse.data);
      console.log("SAP HIS Data 삭제 응답:", sapHisResponse.data);

      setSuccess(
        `import_id: ${selectedImportId}에 해당하는 데이터가 성공적으로 삭제되었습니다.`
      );
      setSelectedImportId("");
      setConfirmDelete(false);
      
      // 목록 새로고침
      fetchRevisions();
    } catch (err) {
      console.error("데이터 삭제 오류:", err);
      const errorMessage = err.response?.data?.message || err.message || "데이터 삭제 중 오류가 발생했습니다.";
      setError(`삭제 실패: ${errorMessage}`);
      setConfirmDelete(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setConfirmDelete(false);
    setError(null);
  };

  // revision의 고유 식별자 추출
  const getRevisionId = (revision) => {
    return revision.id || revision._id || revision.import_id || String(revision);
  };

  // revision의 표시 이름 추출
  const getRevisionDisplayName = (revision) => {
    const name = revision.name || revision.revision_name || revision.revision || `Revision ${getRevisionId(revision)}`;
    const importId = revision.import_id || revision.importId;
    return importId ? `${name} (import_id: ${importId})` : name;
  };

  // 선택된 revision 정보 가져오기
  const selectedRevision = revisions.find(
    (r) => (r.import_id || r.importId) === selectedImportId
  );

  return (
    <div className="page-container">
      <div className="setting-page">
        <h1>설정</h1>
        <p>import_id를 선택하여 해당 revision 데이터를 삭제할 수 있습니다.</p>

        <div className="setting-content">
          <div className="setting-section">
            <h2>데이터 삭제</h2>
            <div className="form-group">
              <label htmlFor="import-id-select">Import ID 선택:</label>
              <select
                id="import-id-select"
                value={selectedImportId}
                onChange={handleImportIdChange}
                className="import-select"
                disabled={loadingRevisions || loading}
              >
                <option value="">-- 선택하세요 --</option>
                {revisions.map((revision) => {
                  const importId = revision.import_id || revision.importId;
                  if (!importId) return null;
                  return (
                    <option key={getRevisionId(revision)} value={importId}>
                      {getRevisionDisplayName(revision)}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedRevision && (
              <div className="selected-info">
                <h3>선택된 Revision 정보</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Import ID:</span>
                    <span className="info-value">{selectedImportId}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Revision Name:</span>
                    <span className="info-value">
                      {selectedRevision.name ||
                        selectedRevision.revision_name ||
                        selectedRevision.revision ||
                        "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {loadingRevisions && (
              <div className="loading-message">Revision 목록을 불러오는 중...</div>
            )}

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            {selectedImportId && (
              <div className="delete-section">
                {!confirmDelete ? (
                  <button
                    onClick={handleDelete}
                    className="delete-btn"
                    disabled={loading || loadingRevisions}
                  >
                    {loading ? "처리 중..." : "삭제"}
                  </button>
                ) : (
                  <div className="confirm-delete">
                    <div className="confirm-message">
                      <p>
                        <strong>경고:</strong> 이 작업은 되돌릴 수 없습니다.
                      </p>
                      <p>
                        import_id <strong>{selectedImportId}</strong>에 해당하는
                        데이터를 imports 콜렉션과 sap_his_data 콜렉션에서
                        삭제하시겠습니까?
                      </p>
                    </div>
                    <div className="confirm-buttons">
                      <button
                        onClick={handleDelete}
                        className="confirm-btn"
                        disabled={loading}
                      >
                        {loading ? "삭제 중..." : "확인"}
                      </button>
                      <button
                        onClick={handleCancel}
                        className="cancel-btn"
                        disabled={loading}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingPage;
