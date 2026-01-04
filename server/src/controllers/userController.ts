import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                role: true,
                isBlocked: true
            }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { role, isBlocked } = req.body;

    try {
        const user = await prisma.user.update({
            where: { id },
            data: { role, isBlocked },
            select: {
                id: true,
                email: true,
                role: true,
                isBlocked: true
            }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error updating user' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.user.delete({ where: { id } });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user' });
    }
};
