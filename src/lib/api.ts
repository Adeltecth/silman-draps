export class ApiError extends Error {
  status: number;
  fields: Record<string, string>;
  constructor(message: string, status: number, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  admin?: boolean;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, admin = false } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  const init: RequestInit = { method, headers, signal, credentials: 'same-origin' };

  if (body !== undefined) {
    if (body instanceof FormData) {
      init.body = body;
    } else {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
  }
  if (admin && method !== 'GET') headers['x-silima-csrf'] = '1';

  let response: Response;
  try {
    response = await fetch(path, init);
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError('Connexion impossible. Vérifiez votre réseau puis réessayez.', 0);
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    if (admin && response.status === 401) {
      window.dispatchEvent(new CustomEvent('silima:unauthorized'));
    }
    const message = (payload as { error?: string } | null)?.error ?? `Une erreur est survenue (code ${response.status}).`;
    throw new ApiError(message, response.status, (payload as { fields?: Record<string, string> } | null)?.fields ?? {});
  }
  return payload as T;
}

export const adminApi = {
  get: <T,>(path: string, signal?: AbortSignal) => api<T>(`/api/admin${path}`, { admin: true, signal }),
  post: <T,>(path: string, body?: unknown) => api<T>(`/api/admin${path}`, { method: 'POST', body, admin: true }),
  put: <T,>(path: string, body?: unknown) => api<T>(`/api/admin${path}`, { method: 'PUT', body, admin: true }),
  patch: <T,>(path: string, body?: unknown) => api<T>(`/api/admin${path}`, { method: 'PATCH', body, admin: true }),
  del: <T,>(path: string) => api<T>(`/api/admin${path}`, { method: 'DELETE', admin: true }),
  upload: <T,>(file: File) => {
    const form = new FormData();
    form.append('image', file);
    return api<T>('/api/admin/uploads', { method: 'POST', body: form, admin: true });
  },
};
