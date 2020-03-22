import express from 'express';
import indexRouter from './api/index';
import dashboardRouter from './api/dashboard';
import authRouter from './api/auth';
import registerApikeysRouter from './api/registerApikeys';
import registerBotsRouter from './api/registerBots';
import settingsRouter from './api/settings';
import verifyRouter from './api/verify';
import signalBotRouter from './api/signalBot';

const router = express.Router();

router.use('/', indexRouter);
router.use('/auth', authRouter);
router.use('/dashboard', dashboardRouter);
router.use('/register-bots', registerBotsRouter);
router.use('/register-apikeys', registerApikeysRouter);
router.use('/settings', settingsRouter);
router.use('/verify', verifyRouter);
router.use('/signal-bot', signalBotRouter);

export default router;
