import { useParams } from 'react-router-dom'

export default function InterviewRoomPage() {
  const { slug } = useParams<{ slug: string }>()
  return (
    <section className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">Interview Room</h1>
      <p className="mt-2 text-slate-600">
        Placeholder for <code>{slug}</code> — Frontend agent wires up the mic + transcript loop.
      </p>
    </section>
  )
}
