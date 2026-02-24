import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth';
import paymentRoutes from './routes/payment';
import geminiRoutes from './routes/gemini';
import userRoutes from './routes/user';
import creditRoutes from './routes/creditRoutes';  // ← NEW

import { generalRateLimit } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(generalRateLimit);

app.use(
    '/api/payments/webhook',
    express.raw({ type: 'application/json' })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'INTELLMADE STUDIO backend is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ai', geminiRoutes);
app.use('/api/user', userRoutes);
app.use('/api/credits', creditRoutes);  // ← NEW

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
    console.log('');
    console.log('==============================================');
    console.log('  INTELLMADE STUDIO - Backend Server');
    console.log('==============================================');
    console.log(`  Status:      RUNNING`);
    console.log(`  Port:        ${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  API URL:     http://localhost:${PORT}/api`);
    console.log(`  Health:      http://localhost:${PORT}/api/health`);
    console.log('==============================================');
    console.log('');
    console.log('Available API endpoints:');
    console.log('  Auth:     /api/auth/signup, /api/auth/signin, /api/auth/profile');
    console.log('  Payments: /api/payments/plans, /api/payments/checkout, /api/payments/webhook');
    console.log('  Credits:  /api/credits/deduct, /api/credits/balance');
    console.log('  AI Chat:  /api/ai/chat, /api/ai/chat/stream');
    console.log('  AI Image: /api/ai/image/generate, /api/ai/image/clone, /api/ai/image/analyze');
    console.log('  AI Video: /api/ai/video/from-image, /api/ai/video/from-prompt');
    console.log('  AI Audio: /api/ai/audio/transcribe');
    console.log('  User:     /api/user/usage, /api/user/images, /api/user/videos');
    console.log('');
});

export default app;