import React, { useId } from 'react';
import '../styles/components/OrbitalSpinner.css';

/**
 * OrbitalSpinner
 *
 * Dots travel true elliptical paths via SVG <animateMotion> + <mpath>,
 * so motion perfectly follows the visible orbit tracks.
 *
 * Props:
 *   size      — "sm" | "md" | "lg"          (default: "md")
 *   label     — string                       (default: "Loading…")
 *   showLabel — boolean                      (default: true)
 *   color     — CSS color string             (default: uses --spinner-color)
 */

const SIZES = {
  sm: { box: 32, rx: 13, ry1: 9.5, ry2: 4.5, dot: 2.2, core: 2.8 },
  md: { box: 56, rx: 23, ry1: 17, ry2: 8, dot: 3.1, core: 4.8 },
  lg: { box: 88, rx: 36, ry1: 26, ry2: 12, dot: 4.8, core: 7.5 },
};

/**
 * Build an SVG ellipse arc path string (full closed loop).
 * We draw two 180° arcs to make a complete ellipse.
 * cx, cy = center; rx, ry = radii
 * The path starts at the rightmost point (cx+rx, cy).
 */
function ellipsePath(cx, cy, rx, ry) {
  return [
    `M ${cx + rx} ${cy}`,
    `A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy}`,
    `A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy}`,
    'Z',
  ].join(' ');
}

export default function OrbitalSpinner({
  size = 'md',
  label = 'Loading…',
  showLabel = true,
  color,
}) {
  const uid = useId().replace(/:/g, ''); // safe for SVG IDs
  const cfg = SIZES[size] ?? SIZES.md;
  const cx = cfg.box / 2;
  const cy = cfg.box / 2;

  // Path IDs for mpath references
  const outerPathId = `op-outer-${uid}`;
  const innerPathId = `op-inner-${uid}`;

  // SVG path strings for each orbit
  const outerPath = ellipsePath(cx, cy, cfg.rx, cfg.ry1);
  // Inner orbit uses a smaller ry to look tilted / nested
  const innerPath = ellipsePath(cx, cy, cfg.rx, cfg.ry2);

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
        width={cfg.box}
        height={cfg.box}
        viewBox={`0 0 ${cfg.box} ${cfg.box}`}
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        aria-hidden='true'
      >
        <defs>
          {/* Invisible paths that dots follow via animateMotion */}
          <path id={outerPathId} d={outerPath} />
          <path id={innerPathId} d={innerPath} />
        </defs>

        {/* ── Outer orbit track (visible ellipse) ── */}
        <ellipse
          className='orbital-spinner__track'
          cx={cx}
          cy={cy}
          rx={cfg.rx}
          ry={cfg.ry1}
        />

        {/* ── Inner orbit track ── */}
        <ellipse
          className='orbital-spinner__track orbital-spinner__track--inner'
          cx={cx}
          cy={cy}
          rx={cfg.rx}
          ry={cfg.ry2}
        />

        {/* ── Outer dot: follows outerPath ── */}
        <circle
          className='orbital-spinner__dot orbital-spinner__dot--outer'
          r={cfg.dot}
          cx={0}
          cy={0} /* positioned by animateMotion */
        >
          <animateMotion dur='1.8s' repeatCount='indefinite' rotate='none'>
            <mpath href={`#${outerPathId}`} />
          </animateMotion>
        </circle>

        {/* ── Inner dot: follows innerPath in reverse ── */}
        <circle
          className='orbital-spinner__dot orbital-spinner__dot--inner'
          r={cfg.dot * 0.78}
          cx={0}
          cy={0}
        >
          <animateMotion
            dur='1.1s'
            repeatCount='indefinite'
            rotate='none'
            keyPoints='1;0' /* travel path backwards */
            keyTimes='0;1'
            calcMode='linear'
          >
            <mpath href={`#${innerPathId}`} />
          </animateMotion>
        </circle>

        {/* ── Core pulse ── */}
        <circle
          className='orbital-spinner__core'
          cx={cx}
          cy={cy}
          r={cfg.core}
        />
      </svg>

      {showLabel && <span className='orbital-spinner__label'>{label}</span>}
    </div>
  );
}
