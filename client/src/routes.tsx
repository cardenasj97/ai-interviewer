import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import JobListPage from './pages/JobListPage'
import InterviewRoomPage from './pages/InterviewRoomPage'
import ResultsPage from './pages/ResultsPage'

function NotFoundPage() {
  return (
    <section className="mx-auto max-w-4xl p-6 text-center">
      <h1 className="text-3xl font-bold text-slate-900">Lost your interview?</h1>
      <p className="mt-3 text-slate-500">That page doesn&apos;t exist.</p>
      <a href="/" className="mt-6 inline-block text-indigo-600 hover:underline">
        Back to jobs
      </a>
    </section>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <JobListPage /> },
      { path: 'interview/:slug', element: <InterviewRoomPage /> },
      { path: 'session/:id', element: <ResultsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
