export function GarFitLogo({
  size = 32,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="garfit-logo-gradient"
          x1="0"
          y1="0"
          x2="64"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#7C5CFF" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#garfit-logo-gradient)" />
      <g transform="translate(32 32) scale(0.8) translate(-33 -35.3)">
        <g fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round">
          <path d="M34.5 12.2 L25 9.5" strokeWidth="2" />
          <path
            d="M37 13.8 C29.5 14.5 28.5 20.5 32.5 24.5 C36.5 28.5 36 32.5 31.5 35"
            strokeWidth="3.6"
          />
          <path d="M28.5 45.5 L29.5 61" strokeWidth="2.4" />
          <path d="M32 45 L36 52.5 L30.2 54.5" strokeWidth="2.4" />
        </g>
        <g fill="#fff">
          <path d="M37 11.6 L57 14.6 L37 16 Z" />
          <path d="M30 33.2 C38 33.2 41 41 34.5 44.6 C27.5 48.4 17.5 47.2 9 51 C14.5 43.5 21 33.6 30 33.2 Z" />
        </g>
      </g>
    </svg>
  );
}
