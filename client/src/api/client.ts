/**
 * API Client for Military Technological College Event System
 */

const BASE_URL = '/api';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success?: boolean;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('tmc_auth_token');

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  let result: any;

  if (contentType && contentType.includes('application/json')) {
    result = await response.json();
  } else if (contentType && (contentType.includes('spreadsheet') || contentType.includes('octet-stream'))) {
    return (await response.blob()) as any;
  } else {
    result = await response.text();
  }

  if (!response.ok) {
    const errorMsg = result?.error || result?.message || `خطأ في الخادم (${response.status})`;
    throw new Error(errorMsg);
  }

  return result as T;
}
