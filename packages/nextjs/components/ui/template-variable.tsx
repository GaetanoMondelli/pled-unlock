"use client"

import React from "react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface TemplateVariableProps {
  path: string
  value: string
  className?: string
}

export function TemplateVariable({ path, value, className }: TemplateVariableProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            "px-1 rounded bg-primary/10 text-primary border-b border-dashed border-primary/50 cursor-help",
            className
          )}>
            {value}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Template Variable: {path}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 