import { motion } from "framer-motion";

/**
 * ShopCardVisual — schematic line-art header for a ShopCard.
 * Renders a garage bay silhouette with a tiny ringing phone when the shop
 * has an active Baylio number, or a "closed door" silhouette when setup
 * is still pending. Pure SVG, currentColor-driven.
 */
export function ShopCardVisual({
  active,
  className = "",
}: {
  active: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative w-full h-16 overflow-hidden rounded-t-sm ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 320 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern
            id={`shop-grid-${active ? "a" : "i"}`}
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 16 0 L 0 0 0 16"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeWidth="0.5"
            />
          </pattern>
          <linearGradient
            id={`shop-fade-${active ? "a" : "i"}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="var(--primary)"
              stopOpacity={active ? "0.08" : "0.03"}
            />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid */}
        <rect width="320" height="64" fill={`url(#shop-grid-${active ? "a" : "i"})`} />
        <rect width="320" height="64" fill={`url(#shop-fade-${active ? "a" : "i"})`} />

        {/* Garage bay outline */}
        <path
          d="M 20 54 L 20 22 Q 20 16 26 16 L 140 16 Q 146 16 146 22 L 146 54"
          stroke="currentColor"
          strokeOpacity="0.35"
          strokeWidth="1.25"
          fill="none"
        />
        {/* Garage door panels */}
        <line
          x1="22"
          y1="26"
          x2="144"
          y2="26"
          stroke="currentColor"
          strokeOpacity="0.2"
          strokeWidth="0.75"
        />
        <line
          x1="22"
          y1="34"
          x2="144"
          y2="34"
          stroke="currentColor"
          strokeOpacity="0.2"
          strokeWidth="0.75"
        />
        <line
          x1="22"
          y1="42"
          x2="144"
          y2="42"
          stroke="currentColor"
          strokeOpacity="0.2"
          strokeWidth="0.75"
        />
        {/* Bay floor line */}
        <line
          x1="14"
          y1="54"
          x2="306"
          y2="54"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="0.75"
        />

        {/* Tiny brake disc (right side) */}
        <motion.g
          animate={active ? { rotate: 360 } : {}}
          transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "250px 34px" }}
        >
          <circle
            cx="250"
            cy="34"
            r="18"
            stroke="var(--primary)"
            strokeOpacity={active ? "0.7" : "0.25"}
            strokeWidth="1"
            fill="none"
          />
          <circle
            cx="250"
            cy="34"
            r="6"
            stroke="var(--primary)"
            strokeOpacity={active ? "0.7" : "0.25"}
            strokeWidth="1"
            fill="none"
          />
          <circle
            cx="250"
            cy="34"
            r="1"
            fill="var(--primary)"
            fillOpacity={active ? "0.8" : "0.3"}
          />
          {/* vent slots */}
          {[0, 60, 120, 180, 240, 300].map((a) => {
            const rad = (a * Math.PI) / 180;
            return (
              <line
                key={a}
                x1={250 + 9 * Math.cos(rad)}
                y1={34 + 9 * Math.sin(rad)}
                x2={250 + 15 * Math.cos(rad)}
                y2={34 + 15 * Math.sin(rad)}
                stroke="var(--primary)"
                strokeOpacity={active ? "0.45" : "0.15"}
                strokeWidth="0.75"
              />
            );
          })}
        </motion.g>

        {/* Signal waves from disc — only when active */}
        {active &&
          [0, 1, 2].map((i) => (
            <motion.circle
              key={`wave-${i}`}
              cx="250"
              cy="34"
              r="20"
              stroke="var(--primary)"
              strokeOpacity="0.5"
              strokeWidth="0.75"
              fill="none"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: [0.9, 1.6], opacity: [0.45, 0] }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                delay: i * 0.95,
                ease: "easeOut",
              }}
              style={{ transformOrigin: "250px 34px" }}
            />
          ))}

        {/* Hex nut decoration top-right */}
        <g transform="translate(180 14)" stroke="var(--steel)" strokeOpacity="0.35" strokeWidth="0.9" fill="none">
          <polygon points="0,-5 4.3,-2.5 4.3,2.5 0,5 -4.3,2.5 -4.3,-2.5" />
          <circle cx="0" cy="0" r="1.8" />
        </g>

        {/* Status strip accent — left edge */}
        <rect
          x="0"
          y="0"
          width="3"
          height="64"
          fill={active ? "var(--primary)" : "var(--steel)"}
          fillOpacity={active ? "0.7" : "0.3"}
        />
      </svg>
    </div>
  );
}
