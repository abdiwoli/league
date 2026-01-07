"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const api_1 = __importDefault(require("./routes/api"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
dotenv_1.default.config();
console.log('--- DEBUG INFO ---');
console.log('DATABASE_URL detected:', !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
    console.log('DATABASE_URL starts with:', process.env.DATABASE_URL.substring(0, 10));
}
console.log('------------------');
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
if (!process.env.JWT_SECRET) {
    console.error('CRITICAL ERROR: JWT_SECRET environment variable is missing!');
}
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
const rawClientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const clientUrl = rawClientUrl.trim().replace(/\/$/, '');
console.log('--- CORS CONFIG ---');
console.log('Raw CLIENT_URL:', rawClientUrl);
console.log('Sanitized Origin:', clientUrl);
console.log('-------------------');
app.use((0, cors_1.default)({
    origin: clientUrl,
    credentials: true
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Global Request Logger
app.use((req, res, next) => {
    try {
        const logMsg = `[${new Date().toISOString()}] ${req.method} ${req.url}\n`;
        require('fs').appendFileSync('global-debug.log', logMsg);
    }
    catch (e) { }
    next();
});
app.use('/api/auth', authRoutes_1.default);
app.use('/api', api_1.default);
app.use('/uploads', express_1.default.static('uploads'));
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
// Trigger deployment: 2026-01-07 01:54
