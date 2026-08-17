import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Separation is a 1px line, never a shadow — no variant here casts one.
 * Every size clears the 44px minimum touch target.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-field text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-accent text-surface hover:bg-accent/90",
        outline: "border border-line bg-surface text-ink hover:bg-paper",
        ghost: "text-ink hover:bg-paper",
        danger: "bg-danger text-surface hover:bg-danger/90",
      },
      size: {
        default: "h-11 px-4",
        block: "h-11 w-full px-4",
        pill: "h-11 rounded-full px-5",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}

export { Button, buttonVariants };
