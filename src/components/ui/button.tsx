import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 active:scale-[0.96] active:brightness-95",
  {
    variants: {
      variant: {
        default: "bg-primary text-white shadow-purple hover:shadow-lg hover:brightness-110",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 shadow-sm",
        outline:
          "border-2 border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground hover:border-primary/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gradient: "bg-primary text-white shadow-purple hover:shadow-lg hover:brightness-110",
        success: "bg-success text-white hover:bg-success/90 shadow-sm",
      },
      size: {
        default: "h-12 px-5 py-3",
        sm: "h-10 rounded-xl px-4 text-xs",
        lg: "h-13 rounded-2xl px-8 py-4 text-base",
        xl: "h-14 rounded-2xl px-10 py-5 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const isGradient = variant === "gradient"
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        style={isGradient ? { background: "var(--gradient-primary)", ...style } : style}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
