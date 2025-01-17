export interface DocuSignConfig {
  integrationKey: string;
  accountId: string;
  userId: string;
  privateKey: string;
  oAuthServer: string;
}

export const getDefaultConfig = async (): Promise<DocuSignConfig> => {
  try {
    const response = await fetch('/api/docusign/config');
    const config = await response.json();
    return config;
  } catch (error) {
    console.error('Error loading config:', error);
    throw error;
  }
}; 