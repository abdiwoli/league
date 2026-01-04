import { Router } from 'express';
import { changePassword, getMe, login, logout, register } from '../controllers/authController';
import * as UserController from '../controllers/userController';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changePassword);

// User Management (Admin Only)
router.get('/users', authenticate, requireAdmin, UserController.getAllUsers);
router.put('/users/:id', authenticate, requireAdmin, UserController.updateUser);
router.delete('/users/:id', authenticate, requireAdmin, UserController.deleteUser);

export default router;
