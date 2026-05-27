import { cn } from "@/shared/lib/utils";

// Reusable icon-only button.
// The label is required for accessibility and also appears as a tooltip.
export function IconButton({
  children,
  label,
  active,
  className,
  ...props
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      aria-label={label}
      title={label}
      type="button"
      className={cn(
        "grid h-10 w-10 place-items-center rounded-md border border-white/5 bg-white/[0.03] text-slate-400 transition hover:border-cyan-300/25 hover:bg-cyan-300/10 hover:text-cyan-100",
        active && "border-violet-300/30 bg-violet-400/15 text-violet-100 shadow-glow",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
