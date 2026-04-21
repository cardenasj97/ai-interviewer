import { Router } from 'express'

const router = Router()

const VERSION = '0.1.0'
const COMMIT_SHA = process.env.COMMIT_SHA ?? process.env.RENDER_GIT_COMMIT ?? 'dev'

router.get('/', (_req, res) => {
  res.status(200).json({
    data: {
      status: 'ok',
      version: VERSION,
      commitSha: COMMIT_SHA,
    },
  })
})

export default router
