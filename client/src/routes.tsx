import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import JobListPage from './pages/JobListPage'
import InterviewRoomPage from './pages/InterviewRoomPage'
import ResultsPage from './pages/ResultsPage'

function NotFoundPage() {
  return (
    <section className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-slate-600">That URL doesn&apos;t match a known route.</p>
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
