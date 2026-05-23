import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  CHANGE_REASON_COLUMN,
  CHANGE_REASON_EMPTY_VALUE,
  CHANGE_REASON_MAX_LENGTH,
  getChangeReasonValue,
  getRowImportId,
  getRowPrimeKey,
} from '../historyReasonUtils';

const CHANGE_REASON_PATH = '/change-reason/';

function HistoryChangeReasonCell({ row, apiBase, primeKeyFallback, onSaved }) {
  const importId = getRowImportId(row);
  const primeKey = getRowPrimeKey(row, primeKeyFallback);
  const serverValue = getChangeReasonValue(row);

  const [text, setText] = useState(serverValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setText(serverValue);
    setError(null);
  }, [serverValue, importId, primeKey]);

  const persist = useCallback(
    async (nextValue) => {
      if (!importId) {
        setError('import_id가 없어 저장할 수 없습니다.');
        return;
      }
      if (!primeKey) {
        setError('prime-key가 없어 저장할 수 없습니다.');
        return;
      }

      setSaving(true);
      setError(null);
      try {
        await axios.patch(`${apiBase}${CHANGE_REASON_PATH}`, {
          import_id: importId,
          'prime-key': primeKey,
          [CHANGE_REASON_COLUMN]: nextValue,
        });
        onSaved?.(nextValue);
        setText(nextValue);
      } catch (err) {
        console.error('변경사유 저장 오류:', err);
        setError(
          err.response?.data?.message ??
            err.response?.data?.error ??
            err.message ??
            '변경사유 저장에 실패했습니다.',
        );
      } finally {
        setSaving(false);
      }
    },
    [apiBase, importId, primeKey, onSaved],
  );

  const handleUpdate = (e) => {
    e.stopPropagation();
    const trimmed = text.trim();
    if (!trimmed) {
      setError('변경사유를 입력해 주세요.');
      return;
    }
    if (trimmed.length > CHANGE_REASON_MAX_LENGTH) {
      setError(`변경사유는 ${CHANGE_REASON_MAX_LENGTH}자 이내입니다.`);
      return;
    }
    void persist(trimmed);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    void persist(CHANGE_REASON_EMPTY_VALUE);
  };

  return (
    <div
      className='history-reason-cell'
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      role='presentation'
    >
      <textarea
        className={`history-reason-textarea${error ? ' history-reason-textarea--error' : ''}`}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setError(null);
        }}
        maxLength={CHANGE_REASON_MAX_LENGTH}
        rows={1}
        placeholder='변경 사유 (30자 이내)'
        disabled={saving}
        aria-label={CHANGE_REASON_COLUMN}
        title={error ?? undefined}
      />
      <div className='history-reason-actions'>
        <button
          type='button'
          className='history-reason-btn history-reason-btn--save'
          onClick={handleUpdate}
          disabled={saving}
        >
          {saving ? '…' : '수정'}
        </button>
        <button
          type='button'
          className='history-reason-btn history-reason-btn--delete'
          onClick={handleDelete}
          disabled={saving}
        >
          삭제
        </button>
      </div>
    </div>
  );
}

export default HistoryChangeReasonCell;
