export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

type FetchOptions = Omit<RequestInit, 'body'> & { body?: unknown }

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options
  const init: RequestInit = {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(headers ?? {}),
    },
    ...rest,
  }
  if (body !== undefined) init.body = JSON.stringify(body)

  const res = await fetch(`/api/v1${path}`, init)
  const raw = await res.json().catch(() => ({
    error: { code: 'INTERNAL_ERROR', message: 'Malformed response' },
  }))

  if (!res.ok) {
    throw new ApiClientError(
      raw?.error?.code ?? 'INTERNAL_ERROR',
      raw?.error?.message ?? 'Request failed',
      res.status,
      raw?.error?.details,
    )
  }
  return raw.data as T
}
