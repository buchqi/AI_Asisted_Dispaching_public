import { cn } from "@/components/ui/utils";

// Generic panel surface for future dashboard widgets.
// Kept minimal so it can be reused without forcing one visual layout.
export function Panel({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border border-white/[0.08] bg-terminal-900/80 shadow-2xl shadow-black/20", className)}>
      {children}
    </section>
  );
}
