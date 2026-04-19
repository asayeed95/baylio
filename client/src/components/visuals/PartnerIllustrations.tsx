import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * PartnerIllustrations — schematic line-art illustrations for partner
 * onboarding materials. Each step shows one part of how Baylio works,
 * designed for partners to walk a shop owner through during a pitch.
 *
 * Aesthetic: blueprint / technical schematic. Teal primary + copper accent.
 * Pure SVG, currentColor-aware.
 */

function BlueprintFrame({
  children,
  step,
  label,
}: {
  children: ReactNode;
  step: string;
  label: string;
}) {
  return (
    <div className="relative rounded-sm border border-border bg-card overflow-hidden">
      {/* Corner ticks */}
      <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-primary/40" />
      <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-primary/40" />
      <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-primary/40" />
      <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-primary/40" />

      {/* Step label */}
      <div className="absolute top-3 left-3 z-10">
        <span className="text-[10px] font-mono tracking-widest text-primary/70 uppercase">
          Step {step}
        </span>
      </div>
      <div className="absolute bottom-3 right-3 z-10">
        <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
          {label}
        </span>
      </div>

      <div className="aspect-[4/3] flex items-center justify-center p-6">
        {children}
      </div>
    </div>
  );
}

/**
 * Step 1 — Missed calls happen.
 * A ringing phone with grayed-out, dropped call waves.
 */
export function Step1MissedCall() {
  return (
    <BlueprintFrame step="01" label="The Problem">
      <svg viewBox="0 0 320 240" fill="none" className="w-full h-full" aria-hidden="true">
        {/* Shop outline */}
        <path
          d="M 30 190 L 30 100 L 130 70 L 230 100 L 230 190 Z"
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeWidth="1"
          fill="none"
        />
        <line x1="20" y1="190" x2="240" y2="190" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />

        {/* Mechanic under car silhouette inside shop */}
        <g transform="translate(80 140)" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" fill="none">
          <rect x="0" y="20" width="80" height="16" rx="3" />
          <circle cx="12" cy="40" r="4" />
          <circle cx="68" cy="40" r="4" />
          <line x1="20" y1="36" x2="60" y2="36" strokeOpacity="0.3" />
        </g>

        {/* Phone — larger, right side */}
        <motion.g
          animate={{ rotate: [-8, 8, -8, 8, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 1.2 }}
          style={{ transformOrigin: "260px 100px" }}
        >
          <rect
            x="244"
            y="60"
            width="32"
            height="64"
            rx="5"
            stroke="var(--primary)"
            strokeWidth="1.5"
            fill="var(--card)"
          />
          <rect
            x="248"
            y="70"
            width="24"
            height="40"
            rx="1"
            stroke="var(--primary)"
            strokeOpacity="0.3"
            strokeWidth="0.75"
            fill="none"
          />
          <text
            x="260"
            y="92"
            textAnchor="middle"
            fontSize="5"
            fill="var(--primary)"
            fontFamily="monospace"
            letterSpacing="0.5"
          >
            CALLING
          </text>
        </motion.g>

        {/* Dropped signal — strike-through on waves */}
        {[0, 1, 2].map((i) => (
          <motion.circle
            key={i}
            cx="292"
            cy="92"
            r="8"
            stroke="var(--steel)"
            strokeOpacity="0.5"
            strokeWidth="1"
            fill="none"
            animate={{ scale: [0.6, 1.8], opacity: [0.6, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.7 }}
            style={{ transformOrigin: "292px 92px" }}
          />
        ))}
        <line x1="278" y1="78" x2="306" y2="106" stroke="var(--copper)" strokeWidth="2" />

        {/* Dollar drop — money being lost */}
        <motion.g
          animate={{ y: [0, 12, 0], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        >
          <text
            x="260"
            y="160"
            textAnchor="middle"
            fontSize="14"
            fill="var(--copper)"
            fontWeight="bold"
            fontFamily="monospace"
          >
            $
          </text>
        </motion.g>

        {/* Callout */}
        <text
          x="160"
          y="220"
          textAnchor="middle"
          fontSize="10"
          fill="currentColor"
          opacity="0.6"
          fontFamily="monospace"
          letterSpacing="1"
        >
          SHOP BUSY · CALL MISSED · REVENUE LOST
        </text>
      </svg>
    </BlueprintFrame>
  );
}

/**
 * Step 2 — Baylio answers every call.
 * Phone rings → Baylio AI brain answers instantly.
 */
export function Step2BaylioAnswers() {
  return (
    <BlueprintFrame step="02" label="Baylio Answers">
      <svg viewBox="0 0 320 240" fill="none" className="w-full h-full" aria-hidden="true">
        {/* Incoming call phone left */}
        <motion.g
          animate={{ rotate: [-4, 4, -4, 4, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1.8 }}
          style={{ transformOrigin: "60px 120px" }}
        >
          <rect
            x="44"
            y="80"
            width="32"
            height="64"
            rx="5"
            stroke="var(--primary)"
            strokeWidth="1.5"
            fill="var(--card)"
          />
          <rect
            x="48"
            y="90"
            width="24"
            height="40"
            rx="1"
            stroke="var(--primary)"
            strokeOpacity="0.3"
            strokeWidth="0.75"
            fill="none"
          />
        </motion.g>

        {/* Signal in */}
        <motion.path
          d="M 80 120 L 130 120"
          stroke="var(--primary)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          animate={{ strokeDashoffset: [-7, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        />

        {/* Baylio AI core — hex + pulsing */}
        <g transform="translate(160 120)">
          <motion.polygon
            points="0,-30 26,-15 26,15 0,30 -26,15 -26,-15"
            stroke="var(--primary)"
            strokeWidth="1.5"
            fill="var(--primary)"
            fillOpacity="0.08"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "0 0" }}
          />
          <motion.polygon
            points="0,-18 16,-9 16,9 0,18 -16,9 -16,-9"
            stroke="var(--primary)"
            strokeWidth="1"
            fill="none"
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "0 0" }}
          />
          <circle cx="0" cy="0" r="3" fill="var(--primary)" />
          <text
            x="0"
            y="-40"
            textAnchor="middle"
            fontSize="8"
            fill="var(--primary)"
            fontFamily="monospace"
            letterSpacing="1.5"
          >
            BAYLIO
          </text>
        </g>

        {/* Signal out */}
        <motion.path
          d="M 190 120 L 240 120"
          stroke="var(--copper)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          animate={{ strokeDashoffset: [0, -7] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        />

        {/* Speech bubble */}
        <g transform="translate(260 120)">
          <rect
            x="-4"
            y="-20"
            width="48"
            height="30"
            rx="4"
            stroke="var(--copper)"
            strokeWidth="1.25"
            fill="var(--card)"
          />
          <path d="M -4 0 L -12 6 L -4 6 Z" stroke="var(--copper)" strokeWidth="1.25" fill="var(--card)" />
          <text
            x="20"
            y="-8"
            textAnchor="middle"
            fontSize="5"
            fill="var(--copper)"
            fontFamily="monospace"
            letterSpacing="0.5"
          >
            HELLO
          </text>
          <text
            x="20"
            y="0"
            textAnchor="middle"
            fontSize="5"
            fill="var(--copper)"
            fontFamily="monospace"
            letterSpacing="0.5"
          >
            HOW CAN I HELP
          </text>
        </g>

        {/* Callout */}
        <text
          x="160"
          y="220"
          textAnchor="middle"
          fontSize="10"
          fill="currentColor"
          opacity="0.6"
          fontFamily="monospace"
          letterSpacing="1"
        >
          ANSWERED 24 / 7 · SPEAKS 5 LANGUAGES
        </text>
      </svg>
    </BlueprintFrame>
  );
}

/**
 * Step 3 — Intelligent conversation.
 * Three callout bubbles: booking, upsell, objection handling.
 */
export function Step3SmartConvo() {
  return (
    <BlueprintFrame step="03" label="Smart Conversation">
      <svg viewBox="0 0 320 240" fill="none" className="w-full h-full" aria-hidden="true">
        {/* Central AI node */}
        <g transform="translate(160 120)">
          <motion.polygon
            points="0,-22 19,-11 19,11 0,22 -19,11 -19,-11"
            stroke="var(--primary)"
            strokeWidth="1.5"
            fill="var(--primary)"
            fillOpacity="0.1"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "0 0" }}
          />
          <text
            x="0"
            y="3"
            textAnchor="middle"
            fontSize="8"
            fill="var(--primary)"
            fontFamily="monospace"
            letterSpacing="1"
          >
            AI
          </text>
        </g>

        {/* Three lines radiating out */}
        <line x1="160" y1="95" x2="160" y2="50" stroke="var(--primary)" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 2" />
        <line x1="135" y1="130" x2="70" y2="175" stroke="var(--primary)" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 2" />
        <line x1="185" y1="130" x2="250" y2="175" stroke="var(--primary)" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 2" />

        {/* Capability 1 — Book appointment */}
        <g transform="translate(160 30)">
          <rect x="-50" y="-8" width="100" height="22" rx="3" stroke="var(--primary)" strokeWidth="1" fill="var(--card)" />
          <text x="-40" y="4" fontSize="7" fill="var(--primary)" fontFamily="monospace" letterSpacing="0.5">
            BOOK APPOINTMENT
          </text>
          <g transform="translate(38 3)" stroke="var(--primary)" strokeWidth="0.75" fill="none">
            <rect x="-5" y="-5" width="10" height="10" rx="1" />
            <line x1="-5" y1="-2" x2="5" y2="-2" />
          </g>
        </g>

        {/* Capability 2 — Quote services */}
        <g transform="translate(40 175)">
          <rect x="0" y="-8" width="90" height="22" rx="3" stroke="var(--copper)" strokeWidth="1" fill="var(--card)" />
          <text x="10" y="4" fontSize="7" fill="var(--copper)" fontFamily="monospace" letterSpacing="0.5">
            QUOTE & UPSELL
          </text>
          <text x="78" y="5" fontSize="9" fill="var(--copper)" fontFamily="monospace" fontWeight="bold">
            $
          </text>
        </g>

        {/* Capability 3 — Capture lead */}
        <g transform="translate(190 175)">
          <rect x="0" y="-8" width="90" height="22" rx="3" stroke="var(--primary)" strokeWidth="1" fill="var(--card)" />
          <text x="10" y="4" fontSize="7" fill="var(--primary)" fontFamily="monospace" letterSpacing="0.5">
            CAPTURE LEAD
          </text>
          <g transform="translate(78 3)" stroke="var(--primary)" strokeWidth="0.75" fill="none">
            <circle cx="0" cy="-2" r="2" />
            <path d="M -4 5 Q 0 1 4 5" />
          </g>
        </g>

        {/* Callout */}
        <text
          x="160"
          y="220"
          textAnchor="middle"
          fontSize="10"
          fill="currentColor"
          opacity="0.6"
          fontFamily="monospace"
          letterSpacing="1"
        >
          BOOKS · QUOTES · CAPTURES · NEVER DIAGNOSES
        </text>
      </svg>
    </BlueprintFrame>
  );
}

/**
 * Step 4 — Shop owner gets the summary.
 * Phone with notification cards.
 */
export function Step4OwnerNotified() {
  return (
    <BlueprintFrame step="04" label="Owner Notified">
      <svg viewBox="0 0 320 240" fill="none" className="w-full h-full" aria-hidden="true">
        {/* Owner phone center */}
        <rect
          x="108"
          y="30"
          width="104"
          height="180"
          rx="10"
          stroke="var(--primary)"
          strokeWidth="1.5"
          fill="var(--card)"
        />
        <rect
          x="116"
          y="44"
          width="88"
          height="150"
          rx="2"
          stroke="var(--primary)"
          strokeOpacity="0.15"
          strokeWidth="0.75"
          fill="none"
        />
        <rect x="146" y="36" width="28" height="4" rx="2" fill="var(--primary)" fillOpacity="0.3" />

        {/* Notification 1 — New call */}
        <motion.g
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: [0, 1, 1, 0], x: [-20, 0, 0, 20] }}
          transition={{ duration: 4, repeat: Infinity, times: [0, 0.15, 0.85, 1] }}
        >
          <rect
            x="124"
            y="56"
            width="72"
            height="22"
            rx="3"
            stroke="var(--primary)"
            strokeWidth="0.75"
            fill="var(--primary)"
            fillOpacity="0.08"
          />
          <circle cx="133" cy="67" r="3" fill="var(--primary)" fillOpacity="0.5" />
          <text x="140" y="64" fontSize="5" fill="var(--primary)" fontFamily="monospace" letterSpacing="0.5">
            NEW CALL
          </text>
          <text x="140" y="72" fontSize="4" fill="currentColor" opacity="0.5" fontFamily="monospace">
            BRAKE · APPT BOOKED
          </text>
        </motion.g>

        {/* Notification 2 — Revenue */}
        <motion.g
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: [0, 1, 1, 0], x: [-20, 0, 0, 20] }}
          transition={{ duration: 4, repeat: Infinity, delay: 1.3, times: [0, 0.15, 0.85, 1] }}
        >
          <rect
            x="124"
            y="86"
            width="72"
            height="22"
            rx="3"
            stroke="var(--copper)"
            strokeWidth="0.75"
            fill="var(--copper)"
            fillOpacity="0.08"
          />
          <text x="132" y="95" fontSize="7" fill="var(--copper)" fontFamily="monospace" fontWeight="bold">
            $
          </text>
          <text x="140" y="94" fontSize="5" fill="var(--copper)" fontFamily="monospace" letterSpacing="0.5">
            HIGH-VALUE LEAD
          </text>
          <text x="140" y="102" fontSize="4" fill="currentColor" opacity="0.5" fontFamily="monospace">
            EST $480 · PRIORITY
          </text>
        </motion.g>

        {/* Notification 3 — Summary */}
        <motion.g
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: [0, 1, 1, 0], x: [-20, 0, 0, 20] }}
          transition={{ duration: 4, repeat: Infinity, delay: 2.6, times: [0, 0.15, 0.85, 1] }}
        >
          <rect
            x="124"
            y="116"
            width="72"
            height="22"
            rx="3"
            stroke="var(--primary)"
            strokeWidth="0.75"
            fill="var(--primary)"
            fillOpacity="0.08"
          />
          <circle cx="133" cy="127" r="3" stroke="var(--primary)" strokeWidth="0.75" fill="none" />
          <text x="140" y="124" fontSize="5" fill="var(--primary)" fontFamily="monospace" letterSpacing="0.5">
            DAILY DIGEST
          </text>
          <text x="140" y="132" fontSize="4" fill="currentColor" opacity="0.5" fontFamily="monospace">
            8 CALLS · 5 BOOKED
          </text>
        </motion.g>

        {/* Static — transcript placeholder */}
        <rect x="124" y="146" width="72" height="38" rx="2" stroke="currentColor" strokeOpacity="0.15" strokeWidth="0.5" fill="none" />
        {[154, 162, 170, 178].map((y) => (
          <line key={y} x1="128" y1={y} x2="188" y2={y} stroke="currentColor" strokeOpacity="0.15" strokeWidth="0.5" />
        ))}

        {/* Callout */}
        <text
          x="160"
          y="220"
          textAnchor="middle"
          fontSize="10"
          fill="currentColor"
          opacity="0.6"
          fontFamily="monospace"
          letterSpacing="1"
        >
          SMS · EMAIL · DASHBOARD · ALL IN ONE PLACE
        </text>
      </svg>
    </BlueprintFrame>
  );
}

/**
 * Step 5 — Revenue up, missed calls down.
 * Line chart climbing.
 */
export function Step5RevenueUp() {
  return (
    <BlueprintFrame step="05" label="The Result">
      <svg viewBox="0 0 320 240" fill="none" className="w-full h-full" aria-hidden="true">
        {/* Axes */}
        <line x1="40" y1="180" x2="280" y2="180" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />
        <line x1="40" y1="40" x2="40" y2="180" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />

        {/* Gridlines */}
        {[60, 90, 120, 150].map((y) => (
          <line
            key={y}
            x1="40"
            y1={y}
            x2="280"
            y2={y}
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeWidth="0.5"
            strokeDasharray="2 2"
          />
        ))}

        {/* Missed calls line — declining */}
        <motion.path
          d="M 50 80 L 100 90 L 150 115 L 200 140 L 250 160 L 270 168"
          stroke="var(--steel)"
          strokeOpacity="0.5"
          strokeWidth="1.25"
          fill="none"
          strokeDasharray="4 3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
        />

        {/* Revenue line — climbing */}
        <motion.path
          d="M 50 150 L 100 135 L 150 110 L 200 85 L 250 60 L 270 50"
          stroke="var(--primary)"
          strokeWidth="2"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: "easeOut", delay: 0.3 }}
        />

        {/* Revenue endpoint */}
        <motion.circle
          cx="270"
          cy="50"
          r="4"
          fill="var(--primary)"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2.2, duration: 0.4 }}
        />

        {/* Labels */}
        <text x="50" y="55" fontSize="7" fill="var(--primary)" fontFamily="monospace" letterSpacing="1">
          REVENUE ↑
        </text>
        <text x="50" y="175" fontSize="7" fill="var(--steel)" fontFamily="monospace" letterSpacing="1" opacity="0.7">
          MISSED ↓
        </text>

        {/* Big number callout */}
        <motion.g
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.5 }}
        >
          <text
            x="165"
            y="205"
            textAnchor="middle"
            fontSize="16"
            fill="var(--copper)"
            fontFamily="monospace"
            fontWeight="bold"
            letterSpacing="1"
          >
            +27% BOOKINGS
          </text>
        </motion.g>

        {/* Callout */}
        <text
          x="160"
          y="225"
          textAnchor="middle"
          fontSize="9"
          fill="currentColor"
          opacity="0.6"
          fontFamily="monospace"
          letterSpacing="1"
        >
          AVG SHOP · FIRST 90 DAYS
        </text>
      </svg>
    </BlueprintFrame>
  );
}
