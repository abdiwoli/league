import { Request, Response } from 'express';
import prisma from '../utils/prisma';

/**
 * Get all players with team information
 */
export const getPlayers = async (req: Request, res: Response) => {
    try {
        const players = await prisma.player.findMany({
            include: {
                team: true,
                stats: {
                    include: {
                        match: true
                    }
                }
            },
            orderBy: [
                { team: { name: 'asc' } },
                { number: 'asc' }
            ]
        });
        res.json(players);
    } catch (error: any) {
        console.error('Get players error:', error);
        res.status(500).json({
            message: 'Error fetching players',
            error: error.message
        });
    }
};

/**
 * Get players for a specific team
 */
export const getPlayersByTeam = async (req: Request, res: Response) => {
    try {
        const { teamId } = req.params;

        const players = await prisma.player.findMany({
            where: { teamId },
            include: {
                team: true
            },
            orderBy: { number: 'asc' }
        });

        res.json(players);
    } catch (error: any) {
        console.error('Get players by team error:', error);
        res.status(500).json({
            message: 'Error fetching team players',
            error: error.message
        });
    }
};

/**
 * Create a new player
 */
export const createPlayer = async (req: Request, res: Response) => {
    try {
        const { name, number, teamId } = req.body;

        if (!name || !number || !teamId) {
            res.status(400).json({
                message: 'Name, number, and teamId are required'
            });
            return;
        }

        // Check if team exists
        const team = await prisma.team.findUnique({ where: { id: teamId } });
        if (!team) {
            res.status(404).json({ message: 'Team not found' });
            return;
        }

        // Check for duplicate jersey number in the same team
        const existingPlayer = await prisma.player.findFirst({
            where: {
                teamId,
                number: parseInt(number)
            }
        });

        if (existingPlayer) {
            res.status(400).json({
                message: `Jersey number ${number} is already taken in ${team.name}`
            });
            return;
        }

        const player = await prisma.player.create({
            data: {
                name,
                number: parseInt(number),
                teamId
            },
            include: {
                team: true
            }
        });

        res.json(player);
    } catch (error: any) {
        console.error('Create player error:', error);
        res.status(500).json({
            message: 'Error creating player',
            error: error.message
        });
    }
};

/**
 * Update player details
 */
export const updatePlayer = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, number } = req.body;

        // If updating number, check for duplicates in the same team
        if (number) {
            const player = await prisma.player.findUnique({ where: { id } });
            if (!player) {
                res.status(404).json({ message: 'Player not found' });
                return;
            }

            const duplicate = await prisma.player.findFirst({
                where: {
                    teamId: player.teamId,
                    number: parseInt(number),
                    id: { not: id }
                }
            });

            if (duplicate) {
                res.status(400).json({
                    message: `Jersey number ${number} is already taken`
                });
                return;
            }
        }

        const updatedPlayer = await prisma.player.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(number && { number: parseInt(number) })
            },
            include: {
                team: true
            }
        });

        res.json(updatedPlayer);
    } catch (error: any) {
        console.error('Update player error:', error);
        res.status(500).json({
            message: 'Error updating player',
            error: error.message
        });
    }
};

/**
 * Delete a player
 */
export const deletePlayer = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.player.delete({
            where: { id }
        });

        res.json({ message: 'Player deleted successfully' });
    } catch (error: any) {
        console.error('Delete player error:', error);
        res.status(500).json({
            message: 'Error deleting player',
            error: error.message
        });
    }
};
