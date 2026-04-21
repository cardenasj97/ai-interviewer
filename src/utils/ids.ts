import { randomUUID } from 'node:crypto'
import { nanoid as _nanoid } from 'nanoid'

export function uuid(): string {
  return randomUUID()
}

export function shortId(size = 12): string {
  return _nanoid(size)
}
