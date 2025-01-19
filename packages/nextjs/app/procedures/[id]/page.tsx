"use client";

import { useEffect, useState } from "react";
import { VariablesSection } from "~~/components/variables/VariablesSection";
import { fetchFromDb } from "~~/utils/api";

interface Template {
  // Add your template type definition here
  variables: Record<string, Record<string, any>>;
  messageRules: any[];
  // ... other template properties
}

interface Instance {
  // Add your instance type definition here
  variables: Record<string, Record<string, any>>;
  events: any[];
  messages: any[];
  // ... other instance properties
}

export default function ProcedurePage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<{ template: any; instance: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const fullData = await fetchFromDb();
        const instance = fullData.procedureInstances?.find(
          (p: any) => p.instanceId === params.id
        );
        const template = fullData.procedureTemplates?.find(
          (t: any) => t.templateId === instance?.templateId
        );

        if (!instance || !template) {
          throw new Error('Procedure not found');
        }

        setData({ template, instance });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load procedure data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.id]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!data) {
    return <div>No data found</div>;
  }

  const { template, instance } = data;

  return (
    <div>
      <VariablesSection 
        procedureId={params.id}
        template={template}
        instance={instance}
      />
      {/* Other components */}
    </div>
  );
} 