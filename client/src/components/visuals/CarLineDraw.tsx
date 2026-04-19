import { motion, useInView } from "framer-motion";
import { useRef } from "react";

/**
 * CarLineDraw — schematic car outline that draws itself via
 * stroke-dasharray animation when scrolled into view.
 * Used above or beside "How it works" step grid.
 */
export function CarLineDraw({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const draw = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: (i: number) => ({
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: {
          duration: 1.4,
          delay: i * 0.2,
          ease: [0.25, 0.46, 0.45, 0.94] as const,
        },
        opacity: { duration: 0.01, delay: i * 0.2 },
      },
    }),
  };

  return (
    <div ref={ref} className={className}>
      <svg
        viewBox="0 0 520 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto max-h-[180px]"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="carGrid"
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 16 0 L 0 0 0 16"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.05"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="520" height="200" fill="url(#carGrid)" />

        {/* Ground line */}
        <motion.line
          x1="20"
          y1="170"
          x2="500"
          y2="170"
          stroke="var(--steel)"
          strokeWidth="1"
          strokeOpacity="0.5"
          strokeDasharray="6 4"
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : {}}
          transition={{ duration: 1, ease: "easeOut" }}
        />

        {/* Car body — hatchback sedan silhouette */}
        <motion.path
          d="M 80 170
             L 100 130
             Q 120 110 160 108
             L 260 108
             Q 285 108 300 128
             L 350 128
             Q 410 130 430 170"
          stroke="var(--primary)"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={draw}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          custom={0}
        />

        {/* Roof line detail */}
        <motion.line
          x1="128"
          y1="124"
          x2="300"
          y2="124"
          stroke="var(--primary)"
          strokeOpacity="0.4"
          strokeWidth="1"
          variants={draw}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          custom={1.2}
        />

        {/* Windows */}
        <motion.path
          d="M 138 126 L 150 114 L 222 114 L 228 126 Z"
          stroke="var(--primary)"
          strokeOpacity="0.5"
          strokeWidth="1"
          fill="none"
          variants={draw}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          custom={1.4}
        />
        <motion.path
          d="M 234 126 L 240 114 L 288 114 L 298 126 Z"
          stroke="var(--primary)"
          strokeOpacity="0.5"
          strokeWidth="1"
          fill="none"
          variants={draw}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          custom={1.6}
        />

        {/* Door line */}
        <motion.line
          x1="230"
          y1="128"
          x2="230"
          y2="168"
          stroke="var(--primary)"
          strokeOpacity="0.3"
          strokeWidth="1"
          variants={draw}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          custom={1.8}
        />

        {/* Handle */}
        <motion.line
          x1="260"
          y1="144"
          x2="276"
          y2="144"
          stroke="var(--primary)"
          strokeOpacity="0.5"
          strokeWidth="1.5"
          strokeLinecap="round"
          variants={draw}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          custom={2}
        />

        {/* Headlight */}
        <motion.circle
          cx="422"
          cy="152"
          r="4"
          stroke="var(--copper)"
          strokeWidth="1.25"
          fill="none"
          variants={draw}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          custom={2.2}
        />

        {/* Taillight */}
        <motion.circle
          cx="90"
          cy="152"
          r="3"
          stroke="var(--copper)"
          strokeOpacity="0.6"
          strokeWidth="1.25"
          fill="none"
          variants={draw}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          custom={2.2}
        />

        {/* Rear wheel */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.3, delay: 2.4 }}
        >
          <circle
            cx="150"
            cy="170"
            r="22"
            stroke="var(--primary)"
            strokeWidth="1.75"
            fill="var(--background)"
          />
          <motion.g
            animate={inView ? { rotate: 360 } : {}}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear",
              delay: 2.6,
            }}
            style={{ transformOrigin: "150px 170px" }}
          >
            <circle
              cx="150"
              cy="170"
              r="8"
              stroke="var(--primary)"
              strokeWidth="1"
              fill="none"
            />
            {[0, 72, 144, 216, 288].map((a) => {
              const rad = (a * Math.PI) / 180;
              return (
                <line
                  key={a}
                  x1={150 + 4 * Math.cos(rad)}
                  y1={170 + 4 * Math.sin(rad)}
                  x2={150 + 18 * Math.cos(rad)}
                  y2={170 + 18 * Math.sin(rad)}
                  stroke="var(--primary)"
                  strokeOpacity="0.5"
                  strokeWidth="1"
                />
              );
            })}
          </motion.g>
        </motion.g>

        {/* Front wheel */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.3, delay: 2.4 }}
        >
          <circle
            cx="380"
            cy="170"
            r="22"
            stroke="var(--primary)"
            strokeWidth="1.75"
            fill="var(--background)"
          />
          <motion.g
            animate={inView ? { rotate: 360 } : {}}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear",
              delay: 2.6,
            }}
            style={{ transformOrigin: "380px 170px" }}
          >
            <circle
              cx="380"
              cy="170"
              r="8"
              stroke="var(--primary)"
              strokeWidth="1"
              fill="none"
            />
            {[0, 72, 144, 216, 288].map((a) => {
              const rad = (a * Math.PI) / 180;
              return (
                <line
                  key={a}
                  x1={380 + 4 * Math.cos(rad)}
                  y1={170 + 4 * Math.sin(rad)}
                  x2={380 + 18 * Math.cos(rad)}
                  y2={170 + 18 * Math.sin(rad)}
                  stroke="var(--primary)"
                  strokeOpacity="0.5"
                  strokeWidth="1"
                />
              );
            })}
          </motion.g>
        </motion.g>

        {/* Schematic markers */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 0.6 } : {}}
          transition={{ duration: 0.6, delay: 2.8 }}
          fontFamily="monospace"
          fontSize="8"
          fill="currentColor"
          fillOpacity="0.5"
          letterSpacing="1"
        >
          <text x="30" y="40">
            01
          </text>
          <text x="140" y="40">
            02
          </text>
          <text x="260" y="40">
            03
          </text>
          <text x="400" y="40">
            04
          </text>
          <line
            x1="42"
            y1="42"
            x2="140"
            y2="42"
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeWidth="0.5"
          />
          <line
            x1="152"
            y1="42"
            x2="260"
            y2="42"
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeWidth="0.5"
          />
          <line
            x1="272"
            y1="42"
            x2="400"
            y2="42"
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeWidth="0.5"
          />
        </motion.g>
      </svg>
    </div>
  );
}
