import { describe, it, expect } from 'vitest'
import { normalize } from '@/utils/stt-normalize'

describe('normalize', () => {
  it('corrects oauth → OAuth', () => {
    expect(normalize('I used oath for auth')).toBe('I used OAuth for auth')
  })

  it('corrects crud → CRUD', () => {
    expect(normalize('we support full crude operations')).toBe('we support full CRUD operations')
  })

  it('corrects cors → CORS', () => {
    expect(normalize('we handle cors in express')).toBe('we handle CORS in express')
  })

  it('corrects "course headers" phrase → CORS headers', () => {
    expect(normalize('we handle course headers')).toBe('we handle CORS headers')
  })

  it('corrects rest api (case insensitive)', () => {
    expect(normalize('it is a rest api endpoint')).toBe('it is a REST API endpoint')
  })

  it('corrects JWT spacing variants', () => {
    expect(normalize('using j w t tokens')).toBe('using JWT tokens')
    expect(normalize('using jwt tokens')).toBe('using JWT tokens')
  })

  it('corrects CI/CD variants', () => {
    expect(normalize('set up ci cd pipelines')).toBe('set up CI/CD pipelines')
    expect(normalize('cicd pipeline')).toBe('CI/CD pipeline')
  })

  it('corrects redox → Redux', () => {
    expect(normalize('managed state with redox')).toBe('managed state with Redux')
  })

  it('corrects react query spacing', () => {
    expect(normalize('i used react query for data fetching')).toBe('i used React Query for data fetching')
  })

  it('corrects use effect spacing', () => {
    expect(normalize('use effect hook')).toBe('useEffect hook')
  })

  it('corrects use state spacing', () => {
    expect(normalize('use state hook')).toBe('useState hook')
  })

  it('corrects TypeScript spacing', () => {
    expect(normalize('i write type script')).toBe('i write TypeScript')
  })

  it('corrects JavaScript spacing', () => {
    expect(normalize('vanilla java script')).toBe('vanilla JavaScript')
  })

  it('corrects PostgreSQL spacing', () => {
    expect(normalize('using postgre sql')).toBe('using PostgreSQL')
  })

  it('corrects OKR/KPI/DAU/MAU/NPS', () => {
    expect(normalize('track okr and kpi')).toBe('track OKR and KPI')
    expect(normalize('we measure dau and mau')).toBe('we measure DAU and MAU')
    expect(normalize('our nps is high')).toBe('our NPS is high')
  })

  it('corrects ETL', () => {
    expect(normalize('built the e t l pipeline')).toBe('built the ETL pipeline')
  })

  it('leaves unrelated text unchanged', () => {
    const text = 'We built a great product together.'
    expect(normalize(text)).toBe(text)
  })

  it('handles empty string', () => {
    expect(normalize('')).toBe('')
  })
})
