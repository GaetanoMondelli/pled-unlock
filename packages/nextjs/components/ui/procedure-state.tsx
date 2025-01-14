"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import Mermaid from "@/components/ui/mermaid"

const initialState = {
  currentState: "B",
  diagram: `
graph TD
  A[Application Received] -->|Application_Received| B{Document Verification}
  B -->|Documents_Approved| C[Interview Scheduled]
  B -->|Documents_Rejected| D[Application Rejected]
  C -->|Interview_Scheduled| E{Interview}
  E -->|Interview_Passed| F[Offer Extended]
  E -->|Interview_Failed| D
  F -->|Offer_Accepted| G[Onboarding]
  style B fill:#ff9999
`,
  textRepresentation: `
graph TD
  A[Application Received] -->|Application_Received| B{Document Verification}
  B -->|Documents_Approved| C[Interview Scheduled]
  B -->|Documents_Rejected| D[Application Rejected]
  C -->|Interview_Scheduled| E{Interview}
  E -->|Interview_Passed| F[Offer Extended]
  E -->|Interview_Failed| D
  F -->|Offer_Accepted| G[Onboarding]
  style B fill:#ff9999
`,
  messages: [
    { id: 1, content: "Application received", timestamp: "2023-05-01 10:00:00" },
    { id: 2, content: "Documents under verification", timestamp: "2023-05-02 11:30:00" },
    { id: 3, content: "Document verification in progress", timestamp: "2023-05-03 14:15:00" },
  ],
}

export default function ProcedureState({ procedureId }: { procedureId: string }) {
  const [state, setState] = useState(initialState)
  const [showPDF, setShowPDF] = useState(false)
  const [editableText, setEditableText] = useState(state.textRepresentation)
  const [error, setError] = useState(null)

  useEffect(() => {
    try {
      const lines = editableText.split('\n');
      const styledLines = lines.map(line => {
        if (line.startsWith(`  style ${state.currentState} `)) {
          return `  style ${state.currentState} fill:#ff9999`;
        }
        return line;
      });
      const updatedDiagram = styledLines.join('\n');
      setState(prevState => ({
        ...prevState,
        diagram: updatedDiagram
      }));
      setError(null);
    } catch (err) {
      setError("Invalid Mermaid syntax. Please check your diagram code." as any);
    }
  }, [editableText, state.currentState]);

  const updateCurrentState = (newState: string) => {
    setState(prevState => ({
      ...prevState,
      currentState: newState
    }));
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Current State: {state.currentState}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-md font-semibold mb-2">Visual Representation</h4>
          {error ? (
            <div className="text-red-500">{error}</div>
          ) : (
            <Mermaid chart={state.diagram} />
          )}
        </div>
        <div>
          <h4 className="text-md font-semibold mb-2">Text Representation</h4>
          <Textarea
            value={editableText}
            onChange={(e) => setEditableText(e.target.value)}
            className="font-mono"
            rows={10}
          />
        </div>
      </div>
      <div className="mt-4">
        <h4 className="text-md font-semibold mb-2">Change Current State:</h4>
        <div className="flex space-x-2">
          <Button onClick={() => updateCurrentState('A')}>A</Button>
          <Button onClick={() => updateCurrentState('B')}>B</Button>
          <Button onClick={() => updateCurrentState('C')}>C</Button>
          <Button onClick={() => updateCurrentState('D')}>D</Button>
          <Button onClick={() => updateCurrentState('E')}>E</Button>
          <Button onClick={() => updateCurrentState('F')}>F</Button>
          <Button onClick={() => updateCurrentState('G')}>G</Button>
        </div>
      </div>
      <div>
        <h4 className="text-md font-semibold mb-2">Executed Messages</h4>
        <ul className="space-y-2">
          {state.messages.map((message) => (
            <li key={message.id} className="bg-card p-2 rounded-lg">
              <span>{message.content}</span>
              <span className="text-sm text-muted-foreground ml-2">{message.timestamp}</span>
            </li>
          ))}
        </ul>
      </div>
      <Button onClick={() => setShowPDF(!showPDF)}>
        {showPDF ? "Hide" : "Show"} PDF Contract
      </Button>
      {showPDF && (
        <div className="mt-4 p-4 border rounded-lg">
          <p>PDF Contract Viewer Placeholder</p>
          <p>In a real implementation, you would integrate a PDF viewer component here.</p>
        </div>
      )}
    </div>
  )
}

