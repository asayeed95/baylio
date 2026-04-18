/**
 * TreadDivider — thin tire-tread style separator. Pure SVG pattern,
 * ~0.5KB, used in place of <hr> to break sections with auto-repair feel.
 */
export function TreadDivider({ className = "" }: { className?: string }) {
  return (
    <div
      className={`w-full flex items-center justify-center py-6 ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 400 14"
        preserveAspectRatio="xMidYMid meet"
        className="w-full max-w-4xl h-3.5 text-muted-foreground"
      >
        <defs>
          <pattern
            id="tread"
            x="0"
            y="0"
            width="20"
            height="14"
            patternUnits="userSpaceOnUse"
          >
            <rect
              x="3"
              y="2"
              width="6"
              height="10"
              rx="1"
              fill="currentColor"
              fillOpacity="0.35"
            />
            <rect
              x="12"
              y="4"
              width="4"
              height="6"
              rx="1"
              fill="currentColor"
              fillOpacity="0.18"
            />
          </pattern>
          <linearGradient id="treadFade" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="15%" stopColor="white" stopOpacity="1" />
            <stop offset="85%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id="treadFadeMask">
            <rect width="400" height="14" fill="url(#treadFade)" />
          </mask>
        </defs>
        <rect
          width="400"
          height="14"
          fill="url(#tread)"
          mask="url(#treadFadeMask)"
        />
      </svg>
    </div>
  );
}

/**
 * WrenchDivider — horizontal line with a small wrench icon centered.
 * Alternative separator for hero→section transitions.
 */
export function WrenchDivider({ className = "" }: { className?: string }) {
  return (
    <div
      className={`w-full flex items-center justify-center gap-3 py-6 text-muted-foreground ${className}`}
      aria-hidden="true"
    >
      <div className="h-px flex-1 max-w-[120px] bg-border" />
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-60 -rotate-45"
      >
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
      <div className="h-px flex-1 max-w-[120px] bg-border" />
    </div>
  );
}
