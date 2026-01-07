"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.logout = exports.changePassword = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ message: 'Email and password required' });
        return;
    }
    email = email.trim().toLowerCase();
    try {
        const existingUser = yield prisma_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        const user = yield prisma_1.default.user.create({
            data: {
                email,
                password: hashedPassword,
                role: 'VIEWER', // All registrations are VIEWERS by default. Admin must promote.
            },
        });
        const secret = process.env.JWT_SECRET || 'fallback_secret_123';
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, secret, { expiresIn: '1d' });
        const isProd = process.env.NODE_ENV === 'production' || !!process.env.RENDER;
        res.cookie('token', token, {
            httpOnly: true,
            secure: true, // Necessary for cross-site cookies
            sameSite: isProd ? 'none' : 'lax',
            maxAge: 24 * 60 * 60 * 1000
        });
        res.status(201).json({
            message: 'User created',
            user: { id: user.id, email: user.email, role: user.role }
        });
    }
    catch (error) {
        console.error('Register error details:', error);
        res.status(500).json({
            message: 'Server error during registration',
            error: error.message,
            code: error.code
        });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ message: 'Missing fields' });
        return;
    }
    email = email.trim().toLowerCase();
    try {
        console.log(`Login attempt for: ${email}`);
        const user = yield prisma_1.default.user.findUnique({ where: { email } });
        if (!user) {
            console.log('Login failed: User not found');
            res.status(400).json({ message: 'Invalid credentials (User not found)' });
            return;
        }
        if (user.isBlocked) {
            console.log('Login failed: User is blocked');
            res.status(403).json({ message: 'Your account is blocked. Please contact admin.' });
            return;
        }
        const isMatch = yield bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            console.log('Login failed: Password mismatch');
            res.status(400).json({ message: 'Invalid credentials (Password mismatch)' });
            return;
        }
        const secret = process.env.JWT_SECRET || 'fallback_secret_123';
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, secret, { expiresIn: '1d' });
        const isProd = process.env.NODE_ENV === 'production' || !!process.env.RENDER;
        res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: isProd ? 'none' : 'lax',
            maxAge: 24 * 60 * 60 * 1000
        });
        res.json({
            message: 'Login successful',
            user: { id: user.id, email: user.email, role: user.role }
        });
    }
    catch (error) {
        console.error('Login error details:', error);
        res.status(500).json({
            message: 'Server error during login',
            error: error.message,
            code: error.code
        });
    }
});
exports.login = login;
const changePassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { currentPassword, newPassword } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!currentPassword || !newPassword) {
        res.status(400).json({ message: 'Current and new passwords are required' });
        return;
    }
    try {
        const user = yield prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const isMatch = yield bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isMatch) {
            res.status(400).json({ message: 'Current password is incorrect' });
            return;
        }
        const hashedPassword = yield bcryptjs_1.default.hash(newPassword, 10);
        yield prisma_1.default.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });
        res.json({ message: 'Password updated successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating password' });
    }
});
exports.changePassword = changePassword;
const logout = (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out' });
};
exports.logout = logout;
const getMe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            res.json(null);
            return;
        }
        const user = yield prisma_1.default.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, role: true }
        });
        res.json(user);
    }
    catch (error) {
        res.status(500).json(null);
    }
});
exports.getMe = getMe;
