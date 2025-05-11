import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const textVariants = cva("", {
  variants: {
    variant: {
      default: "text-sm font-body",
      heading: "text-xl lg:text-3xl",
      subheading: "text-md lg:text-xl text-text-accent",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

function Text({
  className,
  variant,
  ...props
}: React.ComponentProps<"p"> &
  VariantProps<typeof textVariants> & {
    asChild?: boolean;
  }) {
  return <p className={cn(textVariants({ variant, className }))} {...props} />;
}

export { Text, textVariants };
