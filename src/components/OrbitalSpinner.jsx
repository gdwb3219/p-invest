import React from 'react';
import '../styles/components/OrbitalSpinner.css';

/**
 * OrbitalSpinner
 *
 * Props:
 *   size      — "sm" | "md" | "lg"  (default: "md")
 *   label     — string              (default: "Loading…")
 *   showLabel — boolean             (default: true)
 *   color     — CSS color string    (default: uses CSS var --spinner-color)
 */
const SIZE_MAP = {
  sm: 32,
  md: 56,
  lg: 88,
};

export default function OrbitalSpinner({
  size = 'md',
  label = 'Loading…',
  showLabel = true,
  color,
}) {
  const px = SIZE_MAP[size] ?? SIZE_MAP.md;
  const cx = px / 2;
  const ry1 = cx * 0.72; // outer orbit vertical radius
  const ry2 = cx * 0.46; // inner orbit vertical radius
  const rx = cx * 0.9; // shared horizontal radius
  const dot = Math.max(2.5, px * 0.055);
  const core = Math.max(3, px * 0.09);

  const style = color ? { '--spinner-color': color } : {};

  return (
    <div
      className={`orbital-spinner orbital-spinner--${size}`}
      role='status'
      aria-label={label}
      style={style}
    >
      <svg
        className='orbital-spinner__svg'
        width={px}
        height={px}
        viewBox={`0 0 ${px} ${px}`}
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        aria-hidden='true'
      >
        {/* ── Outer orbit track ── */}
        <ellipse
          className='orbital-spinner__track orbital-spinner__track--outer'
          cx={cx}
          cy={cx}
          rx={rx}
          ry={ry1}
        />

        {/* ── Inner orbit track (tilted via CSS transform) ── */}
        <ellipse
          className='orbital-spinner__track orbital-spinner__track--inner'
          cx={cx}
          cy={cx}
          rx={rx}
          ry={ry2}
        />

        {/* ── Outer orbiting dot ── */}
        <circle
          className='orbital-spinner__dot orbital-spinner__dot--outer'
          r={dot}
          cx={
            cx + rx
          } /* start at rightmost point; CSS animates via offset-path */
          cy={cx}
        />

        {/* ── Inner orbiting dot ── */}
        <circle
          className='orbital-spinner__dot orbital-spinner__dot--inner'
          r={dot * 0.8}
          cx={cx - rx}
          cy={cx}
        />

        {/* ── Core pulse ── */}
        <circle className='orbital-spinner__core' cx={cx} cy={cx} r={core} />
      </svg>

      {showLabel && <span className='orbital-spinner__label'>{label}</span>}
    </div>
  );
}
