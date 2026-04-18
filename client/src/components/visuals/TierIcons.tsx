import type { ReactElement } from "react";

/**
 * TierIcons — schematic line-art icons for pricing tiers.
 * Each is a 48x48 self-contained SVG, currentColor-driven.
 */

type IconProps = { className?: string; size?: number };

export function OilCanIcon({ className, size = 48 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Can body */}
      <path d="M 10 20 L 10 38 Q 10 40 12 40 L 32 40 Q 34 40 34 38 L 34 20 Z" />
      {/* Cap */}
      <path d="M 14 20 L 14 16 Q 14 14 16 14 L 28 14 Q 30 14 30 16 L 30 20" />
      {/* Spout */}
      <path d="M 34 24 Q 40 20 42 14" strokeWidth="1.75" />
      <circle cx="42" cy="14" r="1.25" fill="currentColor" />
      {/* Oil drop */}
      <path
        d="M 22 28 Q 20 32 22 33.5 Q 24 32 22 28"
        fill="currentColor"
        fillOpacity="0.3"
        strokeWidth="1"
      />
      {/* Label bands */}
      <line x1="10" y1="30" x2="34" y2="30" strokeOpacity="0.3" />
    </svg>
  );
}

export function BrakeDiscIcon({ className, size = 48 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="18" />
      <circle cx="24" cy="24" r="6" />
      <circle cx="24" cy="24" r="1.5" fill="currentColor" />
      {/* 5 lug holes */}
      {[0, 72, 144, 216, 288].map((a) => {
        const rad = (a * Math.PI) / 180;
        return (
          <circle
            key={a}
            cx={24 + 3.8 * Math.cos(rad)}
            cy={24 + 3.8 * Math.sin(rad)}
            r="0.8"
            fill="currentColor"
          />
        );
      })}
      {/* Vent slots */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const rad = (a * Math.PI) / 180;
        return (
          <line
            key={a}
            x1={24 + 9 * Math.cos(rad)}
            y1={24 + 9 * Math.sin(rad)}
            x2={24 + 15 * Math.cos(rad)}
            y2={24 + 15 * Math.sin(rad)}
            strokeWidth="1"
            strokeOpacity="0.5"
          />
        );
      })}
    </svg>
  );
}

export function ToolboxIcon({ className, size = 48 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Handle */}
      <path d="M 16 14 Q 16 10 20 10 L 28 10 Q 32 10 32 14" />
      {/* Top tray */}
      <rect x="8" y="18" width="32" height="6" rx="1" />
      {/* Main body */}
      <rect x="8" y="24" width="32" height="16" rx="1.5" />
      {/* Latch */}
      <rect
        x="21"
        y="21"
        width="6"
        height="4"
        rx="0.5"
        fill="currentColor"
        fillOpacity="0.3"
        strokeWidth="1"
      />
      {/* Drawer lines */}
      <line x1="8" y1="32" x2="40" y2="32" strokeOpacity="0.3" />
      <line
        x1="24"
        y1="32"
        x2="24"
        y2="40"
        strokeOpacity="0.3"
        strokeWidth="1"
      />
      {/* Drawer pulls */}
      <circle cx="15" cy="36" r="1" fill="currentColor" fillOpacity="0.5" />
      <circle cx="33" cy="36" r="1" fill="currentColor" fillOpacity="0.5" />
    </svg>
  );
}

export function SparkPlugIcon({ className, size = 48 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      {/* Ceramic insulator top */}
      <rect x="20" y="6" width="8" height="10" rx="1" />
      <line x1="22" y1="10" x2="26" y2="10" strokeWidth="1" />
      <line x1="22" y1="13" x2="26" y2="13" strokeWidth="1" />
      {/* Hex nut */}
      <polygon points="17,16 31,16 34,20 31,24 17,24 14,20" />
      {/* Threads */}
      <rect x="19" y="24" width="10" height="12" />
      <line x1="19" y1="27" x2="29" y2="27" strokeOpacity="0.4" />
      <line x1="19" y1="30" x2="29" y2="30" strokeOpacity="0.4" />
      <line x1="19" y1="33" x2="29" y2="33" strokeOpacity="0.4" />
      {/* Electrode */}
      <line x1="24" y1="36" x2="24" y2="42" />
      <path d="M 24 42 L 28 42 L 28 38" />
      {/* Spark */}
      <line
        x1="25"
        y1="40"
        x2="27"
        y2="39"
        stroke="var(--copper)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/**
 * Named exports by tier name for easy lookup.
 * Keep names synced with PRICING_TIERS in Landing.tsx.
 */
export const TIER_ICONS: Record<
  string,
  (props: IconProps) => ReactElement
> = {
  Trial: SparkPlugIcon,
  Starter: OilCanIcon,
  Pro: BrakeDiscIcon,
  Elite: ToolboxIcon,
};
