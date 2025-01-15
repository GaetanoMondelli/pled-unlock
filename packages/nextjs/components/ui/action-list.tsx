"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import pledData from "@/public/pled.json"
import { replaceTemplateVariables } from "@/lib/utils"
import { TemplateVariable } from "@/components/ui/template-variable"

interface ActionListProps {
  procedureId: string
}

interface ActionTemplate {
  type: string;
  template: {
    [key: string]: string | string[] | undefined;
    from?: string;
    to?: string;
    subject?: string;
    body?: string;
    title?: string;
    description?: string;
    attendees?: string[];
  };
}

interface Actions {
  [state: string]: ActionTemplate[];
}

function formatTemplateContent(template: any, variables: any) {
  const regex = /\{\{([^}]+)\}\}/g
  let formattedContent: (string | JSX.Element)[] = []
  let lastIndex = 0
  let match

  const content = JSON.stringify(template, null, 2)

  while ((match = regex.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      formattedContent.push(content.slice(lastIndex, match.index))
    }

    // Add the template variable component
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

  // Add remaining text
  if (lastIndex < content.length) {
    formattedContent.push(content.slice(lastIndex))
  }

  return formattedContent
}

export default function ActionList({ procedureId }: ActionListProps) {
  const instance = pledData.procedureInstances.find(
    p => p.instanceId === procedureId
  )
  
  if (!instance) return null

  const template = pledData.procedureTemplates.find(
    t => t.templateId === instance.templateId
  )

  if (!template) return null

  // Get available actions for current state
  const availableActions = (template.actions as Actions)[instance.currentState] || []

  return (
    <div className="space-y-8">
      {/* Available Actions */}
      <div>
        <h3 className="font-semibold mb-4">Available Actions</h3>
        <div className="space-y-2">
          {availableActions.map((action) => (
            <Card key={action.type} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium">{action.type}</h4>
                <Button size="sm">Execute</Button>
              </div>
              <pre className="text-sm bg-muted p-2 rounded-md overflow-auto">
                {formatTemplateContent(action.template, instance.variables)}
              </pre>
            </Card>
          ))}
        </div>
      </div>

      {/* Completed Actions */}
      <div>
        <h3 className="font-semibold mb-4">Completed Actions</h3>
        <div className="space-y-2">
          {instance.completedActions.map((action) => (
            <Card key={action.id} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium">{action.type}</h4>
                <span className="text-xs text-muted-foreground">
                  {new Date(action.timestamp).toLocaleString()}
                </span>
              </div>
              <pre className="text-sm bg-muted p-2 rounded-md overflow-auto">
                {JSON.stringify(action.result, null, 2)}
              </pre>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

