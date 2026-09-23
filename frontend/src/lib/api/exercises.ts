import { apiFetch } from './client';
import { Exercise } from './types';

/** GET /exercises: 既定種目+自分のカスタム種目。 */
export function listExercises(token: string): Promise<Exercise[]> {
  return apiFetch('/exercises', { token });
}

/** POST /exercises */
export function createExercise(token: string, name: string): Promise<Exercise> {
  return apiFetch('/exercises', { method: 'POST', token, body: { name } });
}
