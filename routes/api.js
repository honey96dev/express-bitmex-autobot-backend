import express from 'express';
import indexRouter from './api/index';
import authRouter from './api/auth';
import registerBotsRouter from './api/registerBots';
import registerApikeysRouter from './api/registerApikeys';

const router = express.Router();

router.use('/', indexRouter);
router.use('/auth', authRouter);
router.use('/register-bots', registerBotsRouter);
router.use('/register-apikeys', registerApikeysRouter);

module.exports = router;
