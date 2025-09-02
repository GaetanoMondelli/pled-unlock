import { Bell, Calendar, FileSignature, LucideIcon, Mail, Play, Send } from "lucide-react";

// Map specific actions to their icons
export const actionIcons: Record<string, LucideIcon> = {
  docusign_send: FileSignature,
  send_email: Mail,
  create_calendar_event: Calendar,
  send_reminder: Bell,
  // Add more action mappings as needed
};

// Default icon for actions without specific mapping
export const defaultActionIcon = Play;

// Helper function to get the icon for an action
export const getActionIcon = (actionType: string): LucideIcon => {
  return actionIcons[actionType.toLowerCase()] || defaultActionIcon;
};
