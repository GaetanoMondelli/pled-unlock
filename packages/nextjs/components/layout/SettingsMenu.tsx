"use client"

import { useState, useEffect } from "react"
import { Settings } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"

export function SettingsMenu() {
  const [debugMode, setDebugMode] = useState(false)

  useEffect(() => {
    // Load debug mode preference from localStorage
    const savedDebugMode = localStorage.getItem("debugMode")
    setDebugMode(savedDebugMode === "true")

    // Update CSS variable based on saved preference
    document.documentElement.style.setProperty(
      "--debug-visibility", 
      savedDebugMode === "true" ? "visible" : "hidden"
    )
  }, [])

  const handleDebugModeChange = (enabled: boolean) => {
    setDebugMode(enabled)
    localStorage.setItem("debugMode", String(enabled))
    document.documentElement.style.setProperty(
      "--debug-visibility", 
      enabled ? "visible" : "hidden"
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Settings</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex items-center justify-between cursor-pointer">
          Debug Mode
          <Switch
            checked={debugMode}
            onCheckedChange={handleDebugModeChange}
            className="ml-2"
          />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 