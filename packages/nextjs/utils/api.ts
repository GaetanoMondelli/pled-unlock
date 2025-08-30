
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

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export async function updateDb(data: any, retryCount = 0) {
  try {
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
      // If we get a 429 (rate limit), wait and retry
      if (response.status === 429 && retryCount < MAX_RETRIES) {
        console.log(`Rate limited, retrying in ${RETRY_DELAY}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await sleep(RETRY_DELAY * (retryCount + 1)); // Exponential backoff
        return updateDb(data, retryCount + 1);
      }
      throw new Error('Failed to update data');
    }

    return response.json();
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`Error updating DB, retrying in ${RETRY_DELAY}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await sleep(RETRY_DELAY * (retryCount + 1)); // Exponential backoff
      return updateDb(data, retryCount + 1);
    }
    throw error;
  }
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

// Delete procedure instance
export async function deleteProcedureInstance(instanceId: string) {
  const data = await fetchFromDb();
  const updatedInstances = data.procedureInstances?.filter((p: any) => p.instanceId !== instanceId) || [];
  
  const updatedDb = {
    ...data,
    procedureInstances: updatedInstances,
  };

  return updateDb(updatedDb);
}

// Delete template and all its instances
export async function deleteTemplate(templateId: string) {
  const data = await fetchFromDb();
  const updatedTemplates = data.procedureTemplates?.filter((t: any) => t.templateId !== templateId) || [];
  const updatedInstances = data.procedureInstances?.filter((p: any) => p.templateId !== templateId) || [];
  
  const updatedDb = {
    ...data,
    procedureTemplates: updatedTemplates,
    procedureInstances: updatedInstances,
  };

  return updateDb(updatedDb);
}

// Add helper function for sleep
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
} 