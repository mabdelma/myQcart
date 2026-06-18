/** Tiny envelope helpers so every service returns a consistent JSON shape. */

export type ApiOk<T> = { success: true; data: T };
export type ApiErr = { success: false; error: string };

export const ok = <T>(data: T): ApiOk<T> => ({ success: true, data });
export const err = (error: string): ApiErr => ({ success: false, error });

/** Call another internal service. Base URLs come from env (container DNS on the edge network). */
export async function callService<T>(
  baseUrlEnv: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const base = process.env[baseUrlEnv];
  if (!base) throw new Error(`${baseUrlEnv} is not set`);
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`${baseUrlEnv}${path} → ${res.status}`);
  return (await res.json()) as T;
}
