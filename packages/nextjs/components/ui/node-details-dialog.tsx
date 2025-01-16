import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { FileText, Play } from "lucide-react";
import { getActionIcon } from "@/utils/action-icons";
import { useRouter } from 'next/navigation';

interface NodeDetailsDialogProps {
  node: {
    id: string;
    metadata?: {
      description?: string;
      actions?: string[];
    };
  } | null;
  isOpen: boolean;
  onClose: () => void;
  documents?: {
    contracts?: Array<{
      id: string;
      name: string;
      linkedStates?: string[];
    }>;
  };
  procedureId: string;
}

export const NodeDetailsDialog: React.FC<NodeDetailsDialogProps> = ({
  node,
  isOpen,
  onClose,
  documents,
  procedureId
}) => {
  const router = useRouter();
  
  if (!node) return null;

  const linkedDocuments = documents?.contracts?.filter(
    doc => doc.linkedStates?.includes(node.id)
  ) || [];

  const handleDocumentClick = (docId: string) => {
    router.push(`/procedures/${procedureId}/envelope?doc=${docId}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">State: {node.id}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {node.metadata?.description && (
            <div>
              <h3 className="text-base font-medium mb-2">Description</h3>
              <p className="text-sm text-muted-foreground">{node.metadata.description}</p>
            </div>
          )}

          {node.metadata?.actions?.length > 0 && (
            <div>
              <h3 className="text-base font-medium mb-2 flex items-center gap-2">
                <Play className="h-4 w-4 stroke-current fill-none" />
                Actions
              </h3>
              <ul className="space-y-2">
                {node.metadata.actions.map((action, i) => {
                  const ActionIcon = getActionIcon(action);
                  return (
                    <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                      <ActionIcon className="h-4 w-4 stroke-current fill-none" />
                      {action}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {linkedDocuments.length > 0 && (
            <div>
              <h3 className="text-base font-medium mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 stroke-current fill-none" />
                Linked Documents
              </h3>
              <div className="grid gap-2">
                {linkedDocuments.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => handleDocumentClick(doc.id)}
                    className="text-left p-3 border rounded-lg hover:bg-accent flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4 stroke-current fill-none" />
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-sm text-muted-foreground">Click to view details</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 