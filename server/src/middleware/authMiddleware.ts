import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
    user?: { id: string; role: string };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

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
        const decoded = jwt.verify(token, secret) as any;
        req.user = decoded;
        console.log(`[AUTH] User authenticated: ${decoded.id} (Role: ${decoded.role})`);
        next();
    } catch (error) {
        console.error('[AUTH] Token verification failed:', error);
        res.status(403).json({ message: 'Invalid token' });
    }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'ADMIN') {
        res.status(403).json({ message: 'Admin access required' });
        return;
    }
    next();
};
