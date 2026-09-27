/** Thin client for the Python backend (auth/profile only — see the backend's README). */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  workspace: string | null;
  region: string | null;
}

/** Thrown by `call()`. `status` is 0 for a genuine network failure (backend unreachable), otherwise the HTTP status code. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function call<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
  } catch {
    throw new ApiError(0, `Could not reach ${API_URL}`);
  }
  if (!res.ok) throw new ApiError(res.status, await res.text().catch(() => res.statusText));
  return res.json();
}

export const fetchProfile = (token: string) => call<Profile>('/me', token);

export const updateProfile = (token: string, patch: Partial<Pick<Profile, 'name' | 'workspace' | 'region'>>) =>
  call<Profile>('/me', token, { method: 'PUT', body: JSON.stringify(patch) });
