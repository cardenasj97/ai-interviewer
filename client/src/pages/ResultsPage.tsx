import { useParams } from 'react-router-dom'

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>()
  return (
    <section className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">Results</h1>
      <p className="mt-2 text-slate-600">
        Placeholder for session <code>{id}</code> — Frontend agent renders transcript + evaluation here.
      </p>
    </section>
  )
}
