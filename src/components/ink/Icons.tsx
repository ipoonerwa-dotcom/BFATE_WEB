/* 线描小图：签筒、时辰 K 线、同心结。墨线为主，朱砂点睛。 */
const INK = "#2b2520";
const RED = "#b02d24";

export function IconQian({ size = 64 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none" aria-hidden="true">
      <path d="M22 9 L 26 33 M30 6 V 33 M38 8 L 35 33" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M44 3 L 39 30" stroke={RED} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M44 3 L 42.6 10" stroke={RED} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M17 30 H 47 L 44 58 Q 32 61 20 58 Z" fill="#f6efe1" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M18.4 36 H 45.6 M19.6 52 H 44.4" stroke={INK} strokeWidth="1" opacity="0.55" />
      <rect x="27" y="39" width="10" height="10" rx="1" fill={RED} />
      <path d="M29.5 44 h5 M32 41.5 v5" stroke="#f6efe1" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function IconKline({ size = 64 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none" aria-hidden="true">
      <circle cx="50" cy="13" r="6" fill={RED} opacity="0.9" />
      <path d="M6 56 Q 32 52 58 56" stroke={INK} strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
      <path d="M14 24 V 50" stroke="#3d6b5c" strokeWidth="1.4" />
      <rect x="10.5" y="31" width="7" height="13" rx="1" fill="#f6efe1" stroke="#3d6b5c" strokeWidth="1.4" />
      <path d="M28 16 V 46" stroke={RED} strokeWidth="1.4" />
      <rect x="24.5" y="22" width="7" height="17" rx="1" fill={RED} />
      <path d="M42 22 V 44" stroke={RED} strokeWidth="1.4" />
      <rect x="38.5" y="26" width="7" height="12" rx="1" fill={RED} />
    </svg>
  );
}

export function IconKnot({ size = 64 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none" aria-hidden="true">
      <circle cx="22" cy="26" r="11" stroke={INK} strokeWidth="1.6" />
      <circle cx="42" cy="26" r="11" stroke={INK} strokeWidth="1.6" />
      <path
        d="M32 18 C 25 10, 14 14, 17 22 C 20 30, 32 34, 32 40 C 32 34, 44 30, 47 22 C 50 14, 39 10, 32 18 Z"
        fill={RED}
        fillOpacity="0.12"
        stroke={RED}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M32 40 C 30 48, 25 52, 20 58 M32 40 C 34 48, 39 52, 44 58" stroke={RED} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
