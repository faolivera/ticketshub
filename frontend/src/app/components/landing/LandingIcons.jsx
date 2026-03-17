import { BLUE } from "@/lib/design-tokens";

export function HubSVG({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="2.6" fill="white" />
      <path d="M9 1v3M9 14v3M1 9h3M14 9h3M3.5 3.5l2 2M12.5 12.5l2 2M3.5 14.5l2-2M12.5 5.5l2-2" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function ShieldSVG({ size = 14, color = BLUE }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export function MapSVG({ size = 14, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
