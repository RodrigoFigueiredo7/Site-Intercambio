import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The native select, wearing the visual system. Native is the right call on a
 * phone and a tablet: the platform picker beats anything drawn in a div, and
 * this app is used on both as much as on a desktop.
 */
function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-11 w-full appearance-none rounded-field border border-line bg-surface pl-3 pr-8",
          "text-base text-ink focus-visible:border-accent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted"
      />
    </div>
  );
}

export { Select };
