'use client';
import React from 'react';
import { useSimulationStore } from '@/stores/simulationStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const TokenInspectorModal: React.FC = () => {
  const selectedToken = useSimulationStore(state => state.selectedToken);
  const setSelectedToken = useSimulationStore(state => state.setSelectedToken);

  const isOpen = !!selectedToken;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedToken(null);
    }
  };

  if (!selectedToken) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col"> 
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="font-headline">Token Inspector: {selectedToken.id}</DialogTitle>
          <DialogDescription>
            Token details and history will be displayed here.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 overflow-y-auto py-4">
          <div className="px-1">
            <h3 className="font-semibold text-primary mb-2 px-2">Token Information</h3>
            <div className="p-3 border rounded-md">
              <pre className="text-sm whitespace-pre-wrap">
                {JSON.stringify(selectedToken, null, 2)}
              </pre>
            </div>
          </div>
        </div>
        
        <div className="pt-4 mt-auto border-t border-border flex-shrink-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TokenInspectorModal;