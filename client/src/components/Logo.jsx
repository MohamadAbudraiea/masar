import React from 'react';
import logoLight from '../assets/brand/masar-logo-light.png';
import logoDark from '../assets/brand/masar-logo-dark.png';

/**
 * Masar brand: the official "masar" wordmark with the dotted amber route ending in a truck.
 *
 * LogoTruck / LogoMark are small SVG helpers drawn in the same style (used by the
 * landing-page animation and the favicon); the wordmark itself is the official image.
 *
 */
export function LogoTruck({ x = 0, y = 0, scale = 1, body = '#FFFFFF', cab = '#FFFFFF', wheel = '#071E33' }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {/* trailer */}
      <rect x="0" y="0" width="15" height="9" rx="1.6" fill={body} />
      {/* cab */}
      <path d="M16 2.2h4.2c.5 0 1 .25 1.3.65l2.3 3.1c.2.27.3.6.3.94V9H16z" fill={cab} />
      <circle cx="4.5" cy="10.4" r="2.1" fill={wheel} stroke={body} strokeWidth="1" />
      <circle cx="19.5" cy="10.4" r="2.1" fill={wheel} stroke={body} strokeWidth="1" />
    </g>
  );
}

/**
 * Official Masar logo (from the CEO's file). Two transparent versions were cut from it:
 *  - light: white wordmark + amber route, for navy backgrounds
 *  - dark:  navy wordmark + amber route, for light backgrounds
 * The original is kept at src/assets/brand/masar-logo-original.jpg.
 * The wordmark is Latin in both languages (it is the brand), so `lang` is accepted but not used.
 *
 * size ≈ the visual cap height you want; the image height is derived from it.
 */
export default function Logo({ tone = 'light', size = 28, className = '' }) {
  const src = tone === 'light' ? logoLight : logoDark;
  const height = Math.round(size * 1.55);
  return (
    <img
      src={src}
      alt="Masar"
      height={height}
      style={{ height, width: 'auto' }}
      className={`block select-none ${className}`}
      draggable="false"
    />
  );
}

/** Square app mark (navy tile, white truck on amber dotted route). Used for favicon-sized spots. */
export function LogoMark({ size = 36, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="#071E33" />
      <line x1="7" y1="34" x2="41" y2="34" stroke="#F5A82A" strokeWidth="3.2" strokeLinecap="round" strokeDasharray="0.1 6" />
      <LogoTruck x="12" y="15" scale="1" body="#FFFFFF" cab="#FFFFFF" wheel="#071E33" />
    </svg>
  );
}
