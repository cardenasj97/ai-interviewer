import { Router } from 'express'
import healthRouter from './health'
import jobsRouter from './jobs'
import sessionsRouter from './sessions'
import sttRouter from './stt'

const router = Router()

router.use('/health', healthRouter)
router.use('/jobs', jobsRouter)
router.use('/sessions', sessionsRouter)
router.use('/stt', sttRouter)

export default router
