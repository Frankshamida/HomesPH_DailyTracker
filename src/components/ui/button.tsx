"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-sm hover:brightness-110 hover:shadow-md",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
        outline:
          "border border-input bg-card text-foreground hover:bg-muted hover:text-foreground",
        ghost: "text-foreground hover:bg-muted",
        link: "text-primary underline-offset-4 hover:underline",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:brightness-110 hover:shadow-md",
        success:
          "bg-success text-success-foreground shadow-sm hover:brightness-110 hover:shadow-md",
        warning:
          "bg-warning text-warning-foreground shadow-sm hover:brightness-105 hover:shadow-md",
      },
      size: {
        sm: "h-8 px-3 text-xs [&_svg]:size-4",
        md: "h-10 px-4 [&_svg]:size-4",
        lg: "h-11 px-6 text-base [&_svg]:size-5",
        icon: "h-10 w-10 [&_svg]:size-5",
        "icon-sm": "h-8 w-8 [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
