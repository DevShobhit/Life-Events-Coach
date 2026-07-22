import { cn } from "@/lib/utils";

function FoldedRouteMark() {
  return (
    <svg
      aria-label="Folded Route logo mark"
      className="size-9"
      fill="none"
      role="img"
      viewBox="0 0 32 32"
    >
      <path
        d="M6 22.8h7.2l5.4-5.4-3.8-3.8 4.2-4.2H26"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M18.6 17.4h5.2"
        opacity="0.38"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
      <circle cx="26" cy="9.4" fill="currentColor" r="1.5" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 text-primary", className)}>
      <FoldedRouteMark />
      <span className="text-[11px] font-medium tracking-[0.28em] text-primary/55">
        LIVECOACH
      </span>
    </div>
  );
}
