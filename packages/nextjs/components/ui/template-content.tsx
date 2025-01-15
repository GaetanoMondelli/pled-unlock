"use client"

import { TemplateVariable } from "@/components/ui/template-variable"

export function formatTemplateContent(content: string, variables: any) {
  const regex = /\{\{([^}]+)\}\}/g
  let formattedContent: (string | JSX.Element)[] = []
  let lastIndex = 0
  let match

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      formattedContent.push(content.slice(lastIndex, match.index))
    }

    const path = match[1].trim()
    const value = path.split('.').reduce((obj: any, key: string) => obj?.[key], variables) || path
    
    formattedContent.push(
      <TemplateVariable 
        key={match.index} 
        path={path} 
        value={value} 
      />
    )

    lastIndex = regex.lastIndex
  }

  if (lastIndex < content.length) {
    formattedContent.push(content.slice(lastIndex))
  }

  return formattedContent
} 