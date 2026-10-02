import * as React from "react";
import { useRender } from "@base-ui/react/use-render";
import { cva  } from "class-variance-authority";
import type {VariantProps} from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-transparent text-foreground hover:bg-secondary",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-foreground hover:bg-secondary",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3.5 [&_svg]:size-4",
        sm: "h-8 px-3 text-xs has-[>svg]:px-2.5 [&_svg]:size-3.5",
        lg: "h-11 px-6 has-[>svg]:px-5 [&_svg]:size-4.5",
        icon: "size-10 [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  render?: React.ReactElement;
}

function Button({
  className,
  variant,
  size,
  type = "button",
  render = <button />,
  ...props
}: ButtonProps) {
  const isNativeButton = render.type === "button";
  return useRender({
    render,
    props: {
      "data-slot": "button",
      className: cn(buttonVariants({ variant, size, className })),
      ...(isNativeButton ? { type } : {}),
      ...props,
    },
  });
}

export { Button, buttonVariants };