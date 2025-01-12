'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import PDFViewer from './components/pdf-viewer'
import StateMachineEditor from './components/state-machine-editor'
import StateMachineDiagram from './components/state-machine-diagram'

export default function ContractStateMachine() {
  const [stateDefinition, setStateDefinition] = useState(`
    import { createMachine } from 'xstate';

    const contractMachine = createMachine({
      id: 'contract',
      initial: 'draft',
      states: {
        draft: {
          on: { SUBMIT: 'review' }
        },
        review: {
          on: { 
            APPROVE: 'approved',
            REJECT: 'draft'
          }
        },
        approved: {
          type: 'final'
        }
      }
    });
  `)

  // const pdfUrl = "https://quantmondelli.vercel.app/firstpatent.pdf"

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Contract State Machine</h1>
      <Tabs defaultValue="pdf" className="w-full">
        <TabsList>
          <TabsTrigger value="pdf">PDF Template</TabsTrigger>
          <TabsTrigger value="state-machine">State Machine</TabsTrigger>
        </TabsList>
        {/* <TabsContent value="pdf">
          <PDFViewer pdfUrl={pdfUrl} />
        </TabsContent> */}
        <TabsContent value="state-machine">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StateMachineEditor 
              stateDefinition={stateDefinition} 
              setStateDefinition={setStateDefinition} 
            />
            <StateMachineDiagram stateDefinition={stateDefinition} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

