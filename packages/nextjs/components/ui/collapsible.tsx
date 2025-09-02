"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CollapsibleProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Collapsible: React.FC<CollapsibleProps> = ({ children, open, onOpenChange }) => {
  const [isOpen, setIsOpen] = React.useState(open ?? false);
  
  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  return (
    <div data-state={isOpen ? "open" : "closed"}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          if (child.type === CollapsibleTrigger) {
            return React.cloneElement(child, {
              onClick: () => handleOpenChange(!isOpen),
              'data-state': isOpen ? "open" : "closed",
            });
          }
          if (child.type === CollapsibleContent) {
            return React.cloneElement(child, {
              'data-state': isOpen ? "open" : "closed",
              style: { display: isOpen ? 'block' : 'none' },
            });
          }
        }
        return child;
      })}
    </div>
  );
};

const CollapsibleTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "flex w-full items-center justify-between rounded-lg px-4 py-2 text-left text-sm font-medium hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  >
    {children}
  </button>
));
CollapsibleTrigger.displayName = "CollapsibleTrigger";

const CollapsibleContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "overflow-hidden text-sm transition-all duration-200",
      className,
    )}
    {...props}
  >
    <div className="pb-4 pt-0">{children}</div>
  </div>
));
CollapsibleContent.displayName = "CollapsibleContent";

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
