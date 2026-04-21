// Deterministic post-processing for common Whisper / Web Speech mis-transcriptions.
// Each entry: [pattern (word-boundary, case-insensitive), replacement]
const CORRECTIONS: [RegExp, string][] = [
  // Phonetic mis-transcriptions first (more specific → more general)
  [/\boauth\b/gi, 'OAuth'],
  [/\boath\b/gi, 'OAuth'],     // Whisper hears "oath" for "OAuth"
  [/\bcrud\b/gi, 'CRUD'],
  [/\bcrude\b/gi, 'CRUD'],    // Whisper hears "crude" for "CRUD"
  [/\bcors\b/gi, 'CORS'],
  [/\bcourse\s+headers?\b/gi, 'CORS headers'], // "course headers" → "CORS headers"
  [/\brest\s+api\b/gi, 'REST API'],
  [/\bj\s*w\s*t\b/gi, 'JWT'],
  [/\bci\s*[/-]?\s*cd\b/gi, 'CI/CD'],
  [/\bcicd\b/gi, 'CI/CD'],
  [/\bredox\b/gi, 'Redux'],
  [/\breact\s+query\b/gi, 'React Query'],
  [/\buse\s+effect\b/gi, 'useEffect'],
  [/\buse\s+state\b/gi, 'useState'],
  [/\bnode\s+j\s*s\b/gi, 'Node.js'],
  [/\bnext\s+j\s*s\b/gi, 'Next.js'],
  [/\btype\s+script\b/gi, 'TypeScript'],
  [/\bjava\s+script\b/gi, 'JavaScript'],
  [/\bpostgre\s+sql\b/gi, 'PostgreSQL'],
  [/\bkube\s*r\s*netes\b/gi, 'Kubernetes'],
  [/\bdock\s*er\b/gi, 'Docker'],
  [/\ba\s*11\s*y\b/gi, 'a11y'],
  [/\bw\s*cag\b/gi, 'WCAG'],
  [/\baria\b/g, 'ARIA'],
  [/\bokr\b/gi, 'OKR'],
  [/\bkpi\b/gi, 'KPI'],
  [/\bdau\b/gi, 'DAU'],
  [/\bmau\b/gi, 'MAU'],
  [/\bnps\b/gi, 'NPS'],
  [/\ba\s*[/-]?\s*b\s+test/gi, 'A/B test'],
  [/\bp\s*r\s*d\b/gi, 'PRD'],
  [/\bd\s*b\s*t\b/gi, 'dbt'],
  [/\be\s*t\s*l\b/gi, 'ETL'],
]

export function normalize(text: string): string {
  let result = text
  for (const [pattern, replacement] of CORRECTIONS) {
    result = result.replace(pattern, replacement)
  }
  return result
}
