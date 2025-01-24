const getBaseUrl = () => {
  if (typeof window === 'undefined') {
    // Server-side
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }
  // Client-side
  return '';  // Use relative URLs on client
};

export async function fetchFromDb() {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/api/db`, {
    // Add cache: 'no-store' to prevent caching
    cache: 'no-store'
  });
  if (!response.ok) {
    throw new Error('Failed to fetch data');
  }
  return response.json();
}

export async function updateDb(data: any) {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/api/db`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'update',
      data: data
    }),
  });
  if (!response.ok) {
    throw new Error('Failed to update data');
  }
  return response.json();
}

// Helper function to get procedure data from the main DB
export async function getProcedureData(id: string) {
  const data = await fetchFromDb();
  
  const instance = data.procedureInstances?.find((p: any) => p.instanceId === id);
  if (!instance) {
    throw new Error('Instance not found');
  }

  const template = data.procedureTemplates?.find((t: any) => t.templateId === instance.templateId);
  if (!template) {
    throw new Error('Template not found');
  }

  return { instance, template };
} 