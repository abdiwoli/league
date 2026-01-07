"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticate = (req, res, next) => {
    var _a, _b;
    const token = ((_a = req.cookies) === null || _a === void 0 ? void 0 : _a.token) || ((_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.split(' ')[1]);
    console.log(`[AUTH] Authenticating ${req.method} ${req.url}`);
    console.log(`[AUTH] Cookies received:`, JSON.stringify(req.cookies));
    console.log(`[AUTH] Token present: ${!!token}`);
    if (!token) {
        console.log('[AUTH] No token found in cookies or headers');
        res.status(401).json({ message: 'Unauthorized (No token)' });
        return;
    }
    try {
        const secret = process.env.JWT_SECRET || 'fallback_secret_123';
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        req.user = decoded;
        console.log(`[AUTH] User authenticated: ${decoded.id} (Role: ${decoded.role})`);
        next();
    }
    catch (error) {
        console.error('[AUTH] Token verification failed:', error);
        res.status(403).json({ message: 'Invalid token' });
    }
};
exports.authenticate = authenticate;
const requireAdmin = (req, res, next) => {
    var _a;
    if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'ADMIN') {
        res.status(403).json({ message: 'Admin access required' });
        return;
    }
    next();
};
exports.requireAdmin = requireAdmin;
