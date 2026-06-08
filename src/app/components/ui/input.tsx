import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
        "flex h-9 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-1",
        "text-base text-gray-900 transition-colors outline-none",
        "focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "aria-invalid:border-red-400 aria-invalid:ring-2 aria-invalid:ring-red-100",
        "md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
