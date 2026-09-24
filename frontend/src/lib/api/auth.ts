import { apiFetch } from './client';
import { PublicUser } from './types';

export interface AuthResult {
  user: PublicUser;
  token: string;
}

/** POST /auth/register */
export function register(input: {
  email: string;
  password: string;
  name: string;
}): Promise<AuthResult> {
  return apiFetch('/auth/register', { method: 'POST', body: input });
}

/** POST /auth/login */
export function login(input: {
  email: string;
  password: string;
}): Promise<{ token: string }> {
  return apiFetch('/auth/login', { method: 'POST', body: input });
}

/** GET /auth/me */
export function me(token: string): Promise<{ user: PublicUser }> {
  return apiFetch('/auth/me', { token });
}
