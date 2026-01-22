import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import apiRoutes from './routes/api';
import authRoutes from './routes/authRoutes';

dotenv.config();

console.log('--- DEBUG INFO ---');
console.log('DATABASE_URL detected:', !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
    console.log('DATABASE_URL starts with:', process.env.DATABASE_URL.substring(0, 10));
}
console.log('------------------');

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
    console.error('CRITICAL ERROR: JWT_SECRET environment variable is missing!');
}

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const rawClientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const clientUrl = rawClientUrl.trim().replace(/\/$/, '');

console.log('--- CORS CONFIG ---');
console.log('Raw CLIENT_URL:', rawClientUrl);
console.log('Sanitized Origin:', clientUrl);
console.log('-------------------');

app.use(cors({
    origin: clientUrl,
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Global Request Logger
app.use((req, res, next) => {
    try {
        const logMsg = `[${new Date().toISOString()}] ${req.method} ${req.url}\n`;
        require('fs').appendFileSync('global-debug.log', logMsg);
    } catch (e) { }
    next();
});

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/uploads', express.static('uploads'));

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Export for Vercel
export default app;