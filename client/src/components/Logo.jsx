import React, { useLayoutEffect, useRef, useState } from 'react';

/**
 * Masar brand mark, built from the brief in 05-UI-UX-GUIDE §1:
 * heavy rounded lowercase "masar" wordmark + a dotted amber route that
 * ends in a small truck attached to the "r".
 *
 * To swap in the CEO's official logo file later, replace the <svg> bodies
 * below (or render an <img>) — every screen uses this component.
 *
 * Props:
 *  - tone: 'light' (white wordmark, for navy backgrounds) | 'dark' (navy wordmark)
 *  - size: height in px of the wordmark (default 28)
 *  - lang: 'en' | 'ar'
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

export default function Logo({ tone = 'light', size = 28, lang = 'en', className = '' }) {
  const ink = tone === 'light' ? '#FFFFFF' : '#071E33';
  const truckWheel = tone === 'light' ? '#071E33' : '#FFFFFF';
  const isAr = lang === 'ar';
  const textRef = useRef(null);
  // Measure the real wordmark width so the route + truck hug the last letter
  // regardless of which font actually loaded.
  const [tw, setTw] = useState(isAr ? 58 : 88);
  useLayoutEffect(() => {
    const measure = () => {
      try {
        const w = textRef.current?.getBBox().width;
        if (w) setTw(Math.round(w));
      } catch {
        /* not rendered yet */
      }
    };
    measure();
    document.fonts?.ready?.then(measure);
  }, [isAr]);

  const truckW = 24;
  const gap = 3;
  const width = tw + gap + truckW + 2;
  // LTR: word → route → truck at the end. RTL: mirrored (truck on the left, driving left).
  const textX = isAr ? width : 0;
  const routeFrom = isAr ? width - 2 : 2;
  const routeTo = isAr ? truckW + gap + 2 : tw + gap - 1;
  const truckX = isAr ? truckW : tw + gap;

  return (
    <svg
      role="img"
      aria-label={isAr ? 'مسار' : 'masar'}
      height={size * (42 / 28)}
      width={(size * (42 / 28) * width) / 42}
      viewBox={`0 0 ${width} 42`}
      className={className}
      style={{ overflow: 'visible', direction: 'ltr' }}
    >
      <text
        ref={textRef}
        x={textX}
        y="26"
        textAnchor="start"
        direction={isAr ? 'rtl' : 'ltr'}
        fill={ink}
        style={{
          fontFamily: isAr ? '"IBM Plex Sans Arabic", sans-serif' : '"Plus Jakarta Sans", sans-serif',
          fontWeight: isAr ? 700 : 800,
          fontSize: isAr ? 28 : 31,
          letterSpacing: isAr ? 0 : '-1.3px',
        }}
      >
        {isAr ? 'مسار' : 'masar'}
      </text>
      <line
        x1={routeFrom}
        y1="36.5"
        x2={routeTo}
        y2="36.5"
        stroke="#F5A82A"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeDasharray="0.1 6.2"
      />
      <g transform={isAr ? `translate(${truckX} 0) scale(-1 1)` : `translate(${truckX} 0)`}>
        <LogoTruck x={0} y={24} body={ink} cab={ink} wheel={truckWheel} />
      </g>
    </svg>
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
