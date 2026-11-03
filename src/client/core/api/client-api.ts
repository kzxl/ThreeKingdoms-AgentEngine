/**
 * ThreeKingdoms-AgentEngine: Client API Client
 * (src/client/core/api/client-api.ts)
 *
 * Typed fetch client wrapper for backend simulation endpoints.
 */

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  [key: string]: any;
}

export class ClientApiClient {
  private static instance: ClientApiClient;

  public static getInstance(): ClientApiClient {
    if (!ClientApiClient.instance) {
      ClientApiClient.instance = new ClientApiClient();
    }
    return ClientApiClient.instance;
  }

  /**
   * The campaign lease is per tab. The legacy API wrapper also injects these
   * headers, but the bundled client must work even if it loads first.
   */
  private sessionHeaders(): Record<string, string> {
    if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') return {};
    const sessionId = window.sessionStorage.getItem('sim.sessionId');
    const token = window.sessionStorage.getItem('sim.sessionToken');
    if (!sessionId || !token) return {};
    return {
      'x-session-id': sessionId,
      'x-session-token': token
    };
  }

  public async get<T = any>(endpoint: string, params?: Record<string, string | number>): Promise<T> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      }
      const qs = searchParams.toString();
      if (qs) url += (url.includes('?') ? '&' : '?') + qs;
    }

    const res = await fetch(url, { headers: this.sessionHeaders() });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `HTTP error ${res.status}: ${res.statusText}`);
    }
    return res.json();
  }

  public async post<T = any>(endpoint: string, data?: any): Promise<T> {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.sessionHeaders()
      },
      body: data ? JSON.stringify(data) : undefined
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok || (body && body.success === false)) {
      throw new Error(body.error || `HTTP error ${res.status}: ${res.statusText}`);
    }
    return body;
  }
}

export const apiClient = ClientApiClient.getInstance();
