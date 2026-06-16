import '../styles/components/LoadingSpinner.css';

const SIZE_CLASS = {
  sm: 'loading-spinner--sm',
  md: 'loading-spinner--md',
  lg: 'loading-spinner--lg',
};

/**
 * 재사용 가능한 로딩 스피너
 *
 * @example
 * <LoadingSpinner />
 * <LoadingSpinner size="lg" label="불러오는 중..." />
 * <LoadingSpinner overlay label="데이터를 가져오는 중..." />
 */
function LoadingSpinner({
  size = 'md',
  label,
  overlay = false,
  className = '',
  'aria-label': ariaLabel,
}) {
  const sizeClass = SIZE_CLASS[size] ?? SIZE_CLASS.md;
  const accessibleLabel = ariaLabel ?? label ?? '로딩 중';

  const spinner = (
    <div
      className={[
        'loading-spinner',
        sizeClass,
        overlay ? 'loading-spinner--overlay-content' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role='status'
      aria-live='polite'
      aria-label={accessibleLabel}
    >
      <span className='loading-spinner__ring' aria-hidden='true' />
      {label ? <p className='loading-spinner__label'>{label}</p> : null}
    </div>
  );

  if (overlay) {
    return (
      <div className='loading-spinner__overlay' role='presentation'>
        {spinner}
      </div>
    );
  }

  return spinner;
}

export default LoadingSpinner;
