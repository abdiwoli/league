import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

export const register = async (req: Request, res: Response) => {
    let { email, password, role } = req.body;

    if (!email || !password) {
        res.status(400).json({ message: 'Email and password required' });
        return;
    }

    email = email.toLowerCase();

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role: role || 'VIEWER',
            },
        });

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET as string,
            { expiresIn: '1d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        res.status(201).json({ message: 'User created', userId: user.id, role: user.role });
    } catch (error: any) {
        console.error('Register error details:', error);
        res.status(500).json({
            message: 'Server error during registration',
            error: error.message,
            code: error.code
        });
    }
};

export const login = async (req: Request, res: Response) => {
    let { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({ message: 'Missing fields' });
        return;
    }

    email = email.toLowerCase();

    try {
        console.log(`Login attempt for: ${email}`);
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            console.log('Login failed: User not found');
            res.status(400).json({ message: 'Invalid credentials (User not found)' });
            return;
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Login failed: Password mismatch');
            res.status(400).json({ message: 'Invalid credentials (Password mismatch)' });
            return;
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET as string,
            { expiresIn: '1d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({ message: 'Login successful', role: user.role });
    } catch (error: any) {
        console.error('Login error details:', error);
        res.status(500).json({
            message: 'Server error during login',
            error: error.message,
            code: error.code
        });
    }
};

export const logout = (req: Request, res: Response) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out' });
};

export const getMe = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            res.json(null);
            return;
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, role: true }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json(null);
    }
};
