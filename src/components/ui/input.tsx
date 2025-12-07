import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground",
        "placeholder:text-muted-foreground",
        "focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        // Fix browser autofill - force dark background and visible text
        "[&:-webkit-autofill]:!bg-background",
        "[&:-webkit-autofill]:!text-foreground", 
        "[&:-webkit-autofill]:[-webkit-box-shadow:0_0_0_1000px_hsl(240_10%_4%)_inset]",
        "[&:-webkit-autofill]:[-webkit-text-fill-color:hsl(0_0%_98%)]",
        "[&:-webkit-autofill]:border-border",
        "[&:-webkit-autofill]:caret-white",
        "[&:-webkit-autofill:focus]:[-webkit-box-shadow:0_0_0_1000px_hsl(240_10%_4%)_inset]",
        "[&:-webkit-autofill:hover]:[-webkit-box-shadow:0_0_0_1000px_hsl(240_10%_4%)_inset]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
