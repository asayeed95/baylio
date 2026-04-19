import { motion } from "framer-motion";

/**
 * GarageDoorVisual — animated garage door opening, used on empty
 * "welcome" states (e.g. Dashboard with 0 shops).
 */
export function GarageDoorVisual({ className = "" }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <svg
        viewBox="0 0 160 140"
        fill="none"
        className="w-full h-auto max-w-[180px] mx-auto"
      >
        <defs>
          <pattern
            id="ggrid"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 8 0 L 0 0 0 8"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.06"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="160" height="140" fill="url(#ggrid)" />

        {/* Garage structure */}
        <g stroke="var(--steel)" strokeWidth="1.5" fill="none">
          {/* Roof / frame */}
          <path d="M 20 50 L 80 20 L 140 50 L 140 120 L 20 120 Z" />
          {/* Roof highlight */}
          <path d="M 20 50 L 140 50" strokeOpacity="0.4" />
        </g>

        {/* Garage door opening (animated — panels raise) */}
        <motion.g
          initial={{ y: 0 }}
          animate={{ y: -34 }}
          transition={{
            duration: 1.6,
            delay: 0.3,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        >
          <g transform="translate(36 54)">
            <rect
              x="0"
              y="0"
              width="88"
              height="68"
              stroke="var(--primary)"
              strokeWidth="1.5"
              fill="var(--card)"
            />
            {/* Door panels */}
            {[14, 28, 42, 56].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="88"
                y2={y}
                stroke="var(--primary)"
                strokeOpacity="0.35"
                strokeWidth="1"
              />
            ))}
            {/* Handle */}
            <rect
              x="40"
              y="55"
              width="8"
              height="4"
              stroke="var(--primary)"
              strokeWidth="1"
              fill="var(--primary)"
              fillOpacity="0.2"
            />
          </g>
        </motion.g>

        {/* Reveal: lift + tool shadow inside */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.5 }}
        >
          <rect
            x="36"
            y="88"
            width="88"
            height="34"
            fill="var(--primary)"
            fillOpacity="0.04"
          />
          {/* Tiny wrench silhouette hinting "ready inside" */}
          <g
            stroke="var(--primary)"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity="0.6"
            transform="translate(70 96) rotate(-20)"
          >
            <path d="M 3 3 a 5 5 0 0 0 5 8 l 8 8 a 2 2 0 0 0 3 -3 l -8 -8 a 5 5 0 0 0 -8 -5 z" />
          </g>
        </motion.g>

        {/* Ground */}
        <line
          x1="10"
          y1="123"
          x2="150"
          y2="123"
          stroke="var(--steel)"
          strokeOpacity="0.4"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
      </svg>
    </div>
  );
}

/**
 * IncomingCallVisual — phone + soundwaves for "no calls yet" empty states.
 */
export function IncomingCallVisual({ className = "" }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <svg
        viewBox="0 0 160 140"
        fill="none"
        className="w-full h-auto max-w-[180px] mx-auto"
      >
        <defs>
          <pattern
            id="pgrid"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 8 0 L 0 0 0 8"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.06"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="160" height="140" fill="url(#pgrid)" />

        {/* Phone (center) */}
        <motion.g
          animate={{ rotate: [-3, 3, -3, 3, 0] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            repeatDelay: 2.8,
            ease: "easeInOut",
          }}
          style={{ transformOrigin: "80px 70px" }}
        >
          <rect
            x="62"
            y="34"
            width="36"
            height="68"
            rx="6"
            stroke="var(--primary)"
            strokeWidth="1.5"
            fill="var(--card)"
          />
          <rect
            x="66"
            y="40"
            width="28"
            height="50"
            rx="1.5"
            stroke="var(--primary)"
            strokeOpacity="0.4"
            strokeWidth="1"
            fill="none"
          />
          <line
            x1="74"
            y1="37"
            x2="86"
            y2="37"
            stroke="var(--primary)"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
          <text
            x="80"
            y="60"
            textAnchor="middle"
            fontSize="5"
            fill="var(--primary)"
            fontFamily="monospace"
            letterSpacing="0.5"
          >
            RING
          </text>
          <circle
            cx="80"
            cy="74"
            r="7"
            fill="var(--primary)"
            fillOpacity="0.12"
          />
          <path
            d="M 75 72 Q 80 77, 85 72"
            stroke="var(--primary)"
            strokeWidth="1.25"
            fill="none"
            strokeLinecap="round"
          />
          <rect
            x="72"
            y="96"
            width="16"
            height="1.5"
            rx="0.75"
            fill="var(--primary)"
            fillOpacity="0.4"
          />
        </motion.g>

        {/* Signal waves (left + right) */}
        {[0, 1, 2].map((i) => (
          <motion.g key={`l-${i}`}>
            <motion.circle
              cx="38"
              cy="68"
              r="6"
              stroke="var(--primary)"
              strokeWidth="1.5"
              fill="none"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: [0.6, 2.2], opacity: [0.8, 0] }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                delay: i * 0.8,
                ease: "easeOut",
              }}
              style={{ transformOrigin: "38px 68px" }}
            />
          </motion.g>
        ))}
        {[0, 1, 2].map((i) => (
          <motion.g key={`r-${i}`}>
            <motion.circle
              cx="122"
              cy="68"
              r="6"
              stroke="var(--primary)"
              strokeWidth="1.5"
              fill="none"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: [0.6, 2.2], opacity: [0.8, 0] }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                delay: i * 0.8 + 0.4,
                ease: "easeOut",
              }}
              style={{ transformOrigin: "122px 68px" }}
            />
          </motion.g>
        ))}

        {/* Ground line */}
        <line
          x1="20"
          y1="118"
          x2="140"
          y2="118"
          stroke="var(--steel)"
          strokeOpacity="0.4"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
      </svg>
    </div>
  );
}

/**
 * GearRestVisual — slowly rotating gear, for generic empty states.
 */
export function GearRestVisual({ className = "" }: { className?: string }) {
  const teeth = Array.from({ length: 12 });
  return (
    <div className={className} aria-hidden="true">
      <svg
        viewBox="0 0 120 120"
        fill="none"
        className="w-full h-auto max-w-[140px] mx-auto"
      >
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "60px 60px" }}
        >
          <circle
            cx="60"
            cy="60"
            r="38"
            stroke="var(--primary)"
            strokeWidth="1.5"
            fill="none"
          />
          <circle
            cx="60"
            cy="60"
            r="14"
            stroke="var(--primary)"
            strokeWidth="1.5"
            fill="none"
          />
          <circle cx="60" cy="60" r="2" fill="var(--primary)" />
          {teeth.map((_, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            const x1 = 60 + 38 * Math.cos(angle);
            const y1 = 60 + 38 * Math.sin(angle);
            const x2 = 60 + 48 * Math.cos(angle);
            const y2 = 60 + 48 * Math.sin(angle);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--primary)"
                strokeWidth="4"
                strokeLinecap="round"
              />
            );
          })}
        </motion.g>
      </svg>
    </div>
  );
}
