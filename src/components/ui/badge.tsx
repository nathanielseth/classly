import * as React from "react";
import { useRender } from "@base-ui/react/use-render";
import { cva  } from "class-variance-authority";
import type {VariantProps} from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap w-fit [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        success: "border-transparent bg-success/10 text-success",
        warning: "border-transparent bg-warning/10 text-warning",
        destructive: "border-transparent bg-destructive/10 text-destructive",
        accent: "border-transparent bg-accent/10 text-accent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  render?: React.ReactElement;
}

function Badge({ className, variant, render = <span />, ...props }: BadgeProps) {
  return useRender({
    render,
    props: {
      "data-slot": "badge",
      className: cn(badgeVariants({ variant, className })),
      ...props,
    },
  });
}

export { Badge, badgeVariants };