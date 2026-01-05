import { useState } from 'react';
import './ChangeReasonForm.css';

function ChangeReasonForm({ rowIndex, column, oldValue, newValue, existingReason, onSubmit, onCancel }) {
  const [reason, setReason] = useState(existingReason || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (reason.trim()) {
      onSubmit(rowIndex, column, reason.trim());
      onCancel();
    }
  };

  return (
    <div className="change-reason-form-overlay" onClick={onCancel}>
      <div className="change-reason-form" onClick={(e) => e.stopPropagation()}>
        <div className="form-header">
          <h3>변경 사유 입력</h3>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>
        <div className="form-content">
          <div className="change-info">
            <div className="info-row">
              <span className="info-label">행:</span>
              <span className="info-value">{rowIndex + 1}</span>
            </div>
            <div className="info-row">
              <span className="info-label">열:</span>
              <span className="info-value">{column}</span>
            </div>
            <div className="info-row">
              <span className="info-label">변경 전:</span>
              <span className="info-value old">{oldValue || '(비어있음)'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">변경 후:</span>
              <span className="info-value new">{newValue || '(비어있음)'}</span>
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <label className="form-label">
              변경 사유
            </label>
            <textarea
              className="reason-textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="변경 사유를 입력해주세요..."
              rows={4}
              autoFocus
            />
            <div className="form-actions">
              <button type="button" onClick={onCancel} className="cancel-btn">
                취소
              </button>
              <button type="submit" className="submit-btn" disabled={!reason.trim()}>
                저장
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ChangeReasonForm;
