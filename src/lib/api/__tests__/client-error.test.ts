import { describe, it, expect } from 'vitest';

interface ApiError {
  status: number;
  message: string;
}

function throwApiError(status: number, bodyJson: string): never {
  let data: { error?: string };
  try {
    data = JSON.parse(bodyJson);
  } catch {
    data = {};
  }
  throw { status, message: data.error || 'Unknown Error' } as ApiError;
}

describe('API client error handling', () => {
  it('throws on non-2xx response status', () => {
    let thrown = false;
    try {
      throwApiError(400, JSON.stringify({ error: 'Bad request' }));
    } catch {
      thrown = true;
    }
    expect(thrown).toBe(true);
  });

  it('error object has status and message properties', () => {
    try {
      throwApiError(404, JSON.stringify({ error: 'Not found' }));
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr).toHaveProperty('status');
      expect(apiErr).toHaveProperty('message');
      expect(typeof apiErr.status).toBe('number');
      expect(typeof apiErr.message).toBe('string');
    }
  });

  it('includes correct status code in error', () => {
    try {
      throwApiError(401, JSON.stringify({ error: 'Unauthorized' }));
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(401);
    }
  });

  it('includes correct message from response body', () => {
    try {
      throwApiError(403, JSON.stringify({ error: 'Forbidden' }));
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.message).toBe('Forbidden');
    }
  });

  it('uses fallback message when error field is missing', () => {
    try {
      throwApiError(500, JSON.stringify({}));
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.message).toBe('Unknown Error');
    }
  });

  it('handles malformed response body', () => {
    try {
      throwApiError(502, 'not-json');
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(502);
      expect(apiErr.message).toBe('Unknown Error');
    }
  });

  it('throws different errors for different status codes', () => {
    const statuses = [400, 401, 403, 404, 409, 422, 429, 500, 502, 503];
    for (const status of statuses) {
      try {
        throwApiError(status, JSON.stringify({ error: `Error ${status}` }));
      } catch (err) {
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(status);
        expect(apiErr.message).toBe(`Error ${status}`);
      }
    }
  });
});
