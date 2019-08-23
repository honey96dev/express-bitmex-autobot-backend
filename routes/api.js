import express from 'express';
import indexRouter from './api/index';
import authRouter from './api/auth';
import registerBotsRouter from './api/registerBots';

const router = express.Router();

router.use('/', indexRouter);
router.use('/auth', authRouter);
router.use('/register-bots', registerBotsRouter);

module.exports = router;
