import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getTeams = async (req: Request, res: Response) => {
    try {
        const teams = await prisma.team.findMany();
        res.json(teams);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching teams' });
    }
};

export const createTeam = async (req: Request, res: Response) => {
    const { name, logoUrl } = req.body;

    if (!name) {
        res.status(400).json({ message: 'Team name is required' });
        return;
    }

    try {
        const count = await prisma.team.count();
        if (count >= 4) {
            res.status(400).json({ message: 'League is full (max 4 teams)' });
            return;
        }

        const team = await prisma.team.create({
            data: { name, logoUrl }
        });
        res.json(team);
    } catch (error) {
        res.status(500).json({ message: 'Error creating team' });
    }
};

export const updateTeam = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, logoUrl } = req.body;

    try {
        const team = await prisma.team.update({
            where: { id },
            data: { name, logoUrl }
        });
        res.json(team);
    } catch (error) {
        res.status(500).json({ message: 'Error updating team' });
    }
};

export const deleteTeam = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.team.delete({ where: { id } });
        res.json({ message: 'Team deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting team' });
    }
};
