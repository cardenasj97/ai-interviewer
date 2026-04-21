import { Router } from 'express'
import healthRouter from './health'
import historyRouter from './history'
import jobsRouter from './jobs'
import metricsRouter from './metrics'
import sessionsRouter from './sessions'
import sttRouter from './stt'

const router = Router()

router.use('/health', healthRouter)
router.use('/history', historyRouter)
router.use('/jobs', jobsRouter)
router.use('/metrics', metricsRouter)
router.use('/sessions', sessionsRouter)
router.use('/stt', sttRouter)

export default router
