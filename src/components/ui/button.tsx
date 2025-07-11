import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm",
        ghost: "hover:bg-accent hover:text-accent-foreground text-sm",
        link: "text-primary underline-offset-4 hover:underline text-sm",
        hero: "bg-gradient-motivation text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 font-semibold text-sm",
        challenge: "bg-card border-2 border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary text-sm"
      },
      size: {
        default: "h-9 md:h-10 px-3 md:px-4 py-1.5 md:py-2",
        sm: "h-8 md:h-9 rounded-md px-2 md:px-3",
        lg: "h-10 md:h-11 rounded-md px-6 md:px-8",
        xl: "h-12 md:h-14 rounded-lg px-8 md:px-10 text-base md:text-lg",
        icon: "h-8 w-8 md:h-10 md:w-10",
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
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
