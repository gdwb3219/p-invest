import { useEffect, useState } from 'react';
import OrbitalSpinner from '../../../components/OrbitalSpinner';
import HistoryVirtualTable from './HistoryVirtualTable';

const DRAWER_ANIM_MS = 240;

function HistoryDetailDrawer({
  open,
  primeKey,
  onClose,
  dataHeaders,
  hasReasonColumn,
  apiBase,
  historyRows,
  loading,
  error,
  onHistoryReasonSaved,
}) {
  const [isRendered, setIsRendered] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [activePrimeKey, setActivePrimeKey] = useState(null);

  useEffect(() => {
    if (open && primeKey) {
      setActivePrimeKey(primeKey);
      setIsClosing(false);
      setIsRendered(true);
      return undefined;
    }

    if (!open && isRendered) {
      setIsClosing(true);
      const timer = window.setTimeout(() => {
        setIsRendered(false);
        setIsClosing(false);
        setActivePrimeKey(null);
      }, DRAWER_ANIM_MS);
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [open, primeKey, isRendered]);

  useEffect(() => {
    if (!isRendered || isClosing) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isRendered, isClosing, onClose]);

  if (!isRendered || !activePrimeKey) return null;

  return (
    <div
      className={`history-drawer-root ${isClosing ? 'history-drawer-root--closing' : ''}`}
      role='presentation'
    >
      <button
        type='button'
        className='history-drawer-backdrop'
        aria-label='이력 패널 닫기'
        onClick={onClose}
        disabled={isClosing}
      />
      <aside
        className={`history-drawer ${isClosing ? 'history-drawer--closing' : ''}`}
        role='dialog'
        aria-modal='true'
        aria-labelledby='history-drawer-title'
      >
        <header className='history-drawer-header'>
          <div>
            <h2 id='history-drawer-title' className='history-drawer-title'>
              PrimeKey 이력
            </h2>
            <p className='history-drawer-subtitle'>{activePrimeKey}</p>
          </div>
          <button
            type='button'
            className='history-drawer-close'
            onClick={onClose}
            aria-label='닫기'
            disabled={isClosing}
          >
            ×
          </button>
        </header>

        <div className='history-drawer-body'>
          {loading && (
            <div className='history-drawer-message history-drawer-message--loading'>
              <OrbitalSpinner size='md' label='이력 불러오는 중...' />
            </div>
          )}

          {!loading && error && (
            <div className='history-drawer-message history-drawer-message--error'>
              {error}
            </div>
          )}

          {!loading && !error && historyRows.length === 0 && (
            <div className='history-drawer-message history-drawer-message--empty'>
              해당 PrimeKey로 저장된 이력이 없습니다.
            </div>
          )}

          {!loading && !error && historyRows.length > 0 && (
            <HistoryVirtualTable
              data={historyRows}
              dataHeaders={dataHeaders}
              hasReasonColumn={hasReasonColumn}
              apiBase={apiBase}
              primeKeyFallback={activePrimeKey}
              onReasonSaved={(historyIndex, value) =>
                onHistoryReasonSaved(activePrimeKey, historyIndex, value)
              }
              tableClassName='history-table history-drawer-table'
              wrapperClassName='history-drawer-table-wrapper'
              rowNumClassName='history-accordion-td-num'
            />
          )}
        </div>
      </aside>
    </div>
  );
}

export default HistoryDetailDrawer;
