/**
 * API Configuration for PLED
 *
 * Controls whether to use local simulation or API-based execution.
 * This allows safe testing of the new API without breaking existing demo functionality.
 */

export interface APIConfig {
  /** Toggle between local simulation and API-based execution */
  useAPISimulation: boolean;
  /** API base URL for remote execution */
  apiBaseUrl: string;
  /** API version */
  apiVersion: string;
  /** Request timeout in milliseconds */
  timeout: number;
}

export const getAPIConfig = (): APIConfig => {
  const useAPISimulation = process.env.NEXT_PUBLIC_USE_API_SIMULATION === 'true';
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || (
    typeof window !== 'undefined'
      ? `${window.location.origin}/api`
      : 'http://localhost:3000/api'
  );

  return {
    useAPISimulation,
    apiBaseUrl,
    apiVersion: 'v1',
    timeout: 30000, // 30 seconds
  };
};

export const apiConfig = getAPIConfig();

/**
 * Get full API endpoint URL
 */
export const getAPIEndpoint = (path: string): string => {
  const config = getAPIConfig();
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${config.apiBaseUrl}/${config.apiVersion}/${cleanPath}`;
};

/**
 * Check if API simulation mode is enabled
 */
export const isAPISimulationEnabled = (): boolean => {
  return getAPIConfig().useAPISimulation;
};