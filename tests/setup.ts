import '@testing-library/jest-dom/vitest'

process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test?sslmode=disable'
process.env.OPENAI_API_KEY ??= 'sk-test'
process.env.SESSION_COOKIE_SECRET ??= 'test-secret-at-least-8-chars'
process.env.NODE_ENV = 'test'
process.env.LOG_LEVEL ??= 'silent'
