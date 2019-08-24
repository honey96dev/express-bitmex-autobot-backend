import express from 'express';
import indexRouter from './api/index';
import authRouter from './api/auth';
import registerApikeysRouter from './api/registerApikeys';
import registerBotsRouter from './api/registerBots';
import settingsRouter from './api/settings';

const router = express.Router();

router.use('/', indexRouter);
router.use('/auth', authRouter);
router.use('/register-bots', registerBotsRouter);
router.use('/register-apikeys', registerApikeysRouter);
router.use('/settings', settingsRouter);

module.exports = router;
