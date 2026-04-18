import { motion } from "framer-motion";

/**
 * HeroVisual — a schematic-style line-art illustration pairing a
 * ringing phone with a rotating brake disc + hex nuts. Thin strokes,
 * teal primary + copper accent. Pure SVG, <5KB, 60fps everywhere.
 */
export function HeroVisual({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <svg
        viewBox="0 0 400 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
        aria-hidden="true"
      >
        {/* Blueprint grid */}
        <defs>
          <pattern
            id="grid"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.06"
              strokeWidth="0.5"
            />
          </pattern>
          <radialGradient id="heroGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="400" height="320" fill="url(#grid)" />

        {/* Glow under brake disc */}
        <circle cx="270" cy="170" r="120" fill="url(#heroGlow)" />

        {/* ─── Brake disc (right side) — rotating ─── */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "270px 170px" }}
        >
          {/* Outer ring */}
          <circle
            cx="270"
            cy="170"
            r="88"
            stroke="var(--primary)"
            strokeWidth="1.5"
            fill="none"
          />
          {/* Inner hub */}
          <circle
            cx="270"
            cy="170"
            r="28"
            stroke="var(--primary)"
            strokeWidth="1.5"
            fill="none"
          />
          {/* Center dot */}
          <circle cx="270" cy="170" r="4" fill="var(--primary)" />

          {/* 5 lug holes */}
          {[0, 72, 144, 216, 288].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const x = 270 + 18 * Math.cos(rad);
            const y = 170 + 18 * Math.sin(rad);
            return (
              <circle
                key={angle}
                cx={x}
                cy={y}
                r="2.5"
                fill="var(--primary)"
                fillOpacity="0.5"
              />
            );
          })}

          {/* 8 ventilation slots */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = i * 45;
            const rad = (angle * Math.PI) / 180;
            const x1 = 270 + 42 * Math.cos(rad);
            const y1 = 170 + 42 * Math.sin(rad);
            const x2 = 270 + 74 * Math.cos(rad);
            const y2 = 170 + 74 * Math.sin(rad);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--primary)"
                strokeWidth="1"
                strokeOpacity="0.5"
              />
            );
          })}

          {/* Outer tick marks */}
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = i * 15;
            const rad = (angle * Math.PI) / 180;
            const x1 = 270 + 84 * Math.cos(rad);
            const y1 = 170 + 84 * Math.sin(rad);
            const x2 = 270 + 88 * Math.cos(rad);
            const y2 = 170 + 88 * Math.sin(rad);
            return (
              <line
                key={`t-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--primary)"
                strokeWidth="0.75"
                strokeOpacity="0.4"
              />
            );
          })}
        </motion.g>

        {/* Brake caliper (copper accent, over disc — stays put) */}
        <g>
          <rect
            x="238"
            y="92"
            width="64"
            height="30"
            rx="4"
            stroke="var(--copper)"
            strokeWidth="1.75"
            fill="var(--background)"
          />
          <line
            x1="250"
            y1="122"
            x2="250"
            y2="140"
            stroke="var(--copper)"
            strokeWidth="1.75"
          />
          <line
            x1="290"
            y1="122"
            x2="290"
            y2="140"
            stroke="var(--copper)"
            strokeWidth="1.75"
          />
          <text
            x="270"
            y="110"
            textAnchor="middle"
            fontSize="8"
            fill="var(--copper)"
            fontFamily="monospace"
            letterSpacing="1"
          >
            BAYLIO
          </text>
        </g>

        {/* ─── Phone (left side) — ringing ─── */}
        <motion.g
          animate={{ rotate: [-6, 6, -6, 6, 0] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            repeatDelay: 2.4,
            ease: "easeInOut",
          }}
          style={{ transformOrigin: "110px 170px" }}
        >
          {/* Phone body (schematic) */}
          <rect
            x="82"
            y="100"
            width="56"
            height="104"
            rx="8"
            stroke="var(--primary)"
            strokeWidth="1.75"
            fill="var(--card)"
          />
          {/* Screen */}
          <rect
            x="88"
            y="110"
            width="44"
            height="78"
            rx="2"
            stroke="var(--primary)"
            strokeWidth="1"
            strokeOpacity="0.4"
            fill="none"
          />
          {/* Speaker grill */}
          <line
            x1="100"
            y1="106"
            x2="120"
            y2="106"
            stroke="var(--primary)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Home indicator */}
          <rect
            x="102"
            y="194"
            width="16"
            height="2"
            rx="1"
            fill="var(--primary)"
            fillOpacity="0.4"
          />
          {/* Screen "incoming call" */}
          <text
            x="110"
            y="140"
            textAnchor="middle"
            fontSize="6"
            fill="var(--primary)"
            fontFamily="monospace"
            letterSpacing="0.5"
          >
            INCOMING
          </text>
          <circle
            cx="110"
            cy="160"
            r="10"
            fill="var(--primary)"
            fillOpacity="0.12"
          />
          <path
            d="M 104 158 Q 110 164, 116 158"
            stroke="var(--primary)"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </motion.g>

        {/* Pulsing ring waves (left of phone) */}
        {[0, 1, 2].map((i) => (
          <motion.circle
            key={`wave-${i}`}
            cx="54"
            cy="152"
            r="10"
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
            style={{ transformOrigin: "54px 152px" }}
          />
        ))}

        {/* ─── Connecting signal line (phone → disc) ─── */}
        <motion.path
          d="M 140 170 L 180 170"
          stroke="var(--copper)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, delay: 0.4, ease: "easeOut" }}
        />

        {/* ─── Hex nuts in corners (decorative) ─── */}
        <HexNut cx={60} cy={60} r={10} />
        <HexNut cx={340} cy={280} r={8} />

        {/* Schematic callouts */}
        <g
          fontFamily="monospace"
          fontSize="7"
          fill="currentColor"
          fillOpacity="0.5"
          letterSpacing="1"
        >
          <text x="82" y="224">
            01 · INBOUND
          </text>
          <text x="218" y="224">
            02 · ANSWERED · BOOKED
          </text>
        </g>
      </svg>
    </div>
  );
}

function HexNut({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const points = Array.from({ length: 6 }).map((_, i) => {
    const angle = (i * 60 - 30) * (Math.PI / 180);
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    return `${x},${y}`;
  });
  return (
    <g>
      <polygon
        points={points.join(" ")}
        stroke="var(--steel)"
        strokeWidth="1.25"
        fill="none"
      />
      <circle
        cx={cx}
        cy={cy}
        r={r * 0.4}
        stroke="var(--steel)"
        strokeWidth="1"
        fill="none"
      />
    </g>
  );
}
