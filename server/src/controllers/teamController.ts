import { Request, Response } from 'express';
import fs from 'fs';
import prisma from '../utils/prisma';

const logToFile = (msg: string) => {
    try {
        const logMsg = `[${new Date().toISOString()}] ${msg}\n`;
        fs.appendFileSync('server-debug.log', logMsg);
    } catch (e) {
        console.error('Failed to log to file:', e);
    }
};

export const getTeams = async (req: Request, res: Response) => {
    try {
        logToFile('Fetching teams...');
        const teams = await prisma.team.findMany();
        logToFile(`Fetched ${teams.length} teams`);
        res.json(teams);
    } catch (error: any) {
        logToFile(`Error fetching teams: ${error.message}`);
        res.status(500).json({ message: 'Error fetching teams', error: error.message });
    }
};

export const createTeam = async (req: Request, res: Response) => {
    const { name, logoUrl } = req.body;
    logToFile(`Create Team request: name=${name}, logoUrl=${logoUrl}`);

    if (!name) {
        logToFile('Create Team failed: name is missing');
        res.status(400).json({ message: 'Team name is required' });
        return;
    }

    try {
        const team = await prisma.team.create({
            data: { name, logoUrl: logoUrl || null }
        });
        logToFile(`Team created successfully: id=${team.id}`);
        res.json(team);
    } catch (error: any) {
        logToFile(`Error creating team: ${error.message}`);
        res.status(500).json({ message: 'Error creating team', error: error.message });
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
    } catch (error: any) {
        console.error('Update Team error:', error);
        res.status(500).json({ message: 'Error updating team', error: error.message });
    }
};

export const deleteTeam = async (req: Request, res: Response) => {
    const { id } = req.params;
    logToFile(`Delete Team request: id=${id}`);
    try {
        // Cascade delete matches for this team
        await prisma.match.deleteMany({
            where: {
                OR: [
                    { homeTeamId: id },
                    { awayTeamId: id }
                ]
            }
        });
        logToFile(`Deleted matches associated with team id=${id}`);

        await prisma.team.delete({ where: { id } });
        logToFile(`Team deleted: id=${id}`);
        res.json({ message: 'Team and associated matches deleted' });
    } catch (error: any) {
        logToFile(`Error deleting team: ${error.message}`);
        res.status(500).json({ message: 'Error deleting team', error: error.message });
    }
};
export const deleteAllTeams = async (req: Request, res: Response) => {
    try {
        logToFile('Delete ALL teams request');
        // Clear all matches first (due to FK)
        await prisma.match.deleteMany();
        logToFile('Cleared all matches for reset');

        await prisma.team.deleteMany();
        logToFile('All teams deleted successfully');

        res.json({ message: 'All teams and matches cleared' });
    } catch (error: any) {
        logToFile(`Error deleting all teams: ${error.message}`);
        res.status(500).json({ message: 'Error clearing registry', error: error.message });
    }
};
