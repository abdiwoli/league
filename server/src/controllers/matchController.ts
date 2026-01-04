import { addDays, startOfToday } from 'date-fns';
import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const generateSchedule = async (req: Request, res: Response) => {
    try {
        const { rounds = 1, daysBetweenMatches = 3 } = req.body;
        const teams = await prisma.team.findMany();

        if (teams.length < 2) {
            res.status(400).json({ message: 'Need at least 2 teams to generate a schedule' });
            return;
        }

        // Clear existing matches
        await prisma.match.deleteMany();

        // Round Robin Algorithm (Circle Method)
        let scheduleTeams = [...teams];
        if (scheduleTeams.length % 2 !== 0) {
            scheduleTeams.push({ id: 'BYE', name: 'BYE' } as any);
        }

        const numTeams = scheduleTeams.length;
        const numDays = numTeams - 1;
        const halfSize = numTeams / 2;

        let matchesToCreate = [];
        let currentDate = addDays(startOfToday(), 1);
        let matchdayCounter = 1;

        for (let r = 0; r < rounds; r++) {
            let roundTeams = [...scheduleTeams];
            for (let day = 0; day < numDays; day++) {
                for (let i = 0; i < halfSize; i++) {
                    const home = roundTeams[i];
                    const away = roundTeams[numTeams - 1 - i];

                    if (home.id !== 'BYE' && away.id !== 'BYE') {
                        // Alternate home/away each round to be fair
                        const actualHome = r % 2 === 0 ? home : away;
                        const actualAway = r % 2 === 0 ? away : home;

                        matchesToCreate.push({
                            matchday: matchdayCounter,
                            round: r + 1,
                            date: addDays(currentDate, (matchdayCounter - 1) * daysBetweenMatches),
                            status: 'SCHEDULED',
                            homeTeamId: actualHome.id,
                            awayTeamId: actualAway.id
                        });
                    }
                }
                // Rotate teams for next day
                roundTeams.splice(1, 0, roundTeams.pop()!);
                matchdayCounter++;
            }
        }

        await prisma.match.createMany({
            data: matchesToCreate
        });

        res.json({
            message: `Schedule generated: ${matchesToCreate.length} matches across ${matchdayCounter - 1} matchdays.`,
            matchCount: matchesToCreate.length,
            matchdays: matchdayCounter - 1
        });

    } catch (error: any) {
        console.error('Generate Schedule error:', error);
        res.status(500).json({ message: 'Error generating schedule', error: error.message });
    }
};

export const getMatches = async (req: Request, res: Response) => {
    try {
        const matches = await prisma.match.findMany({
            include: { homeTeam: true, awayTeam: true },
            orderBy: { matchday: 'asc' }
        });
        res.json(matches);
    } catch (error: any) {
        console.error('Fetch Matches error:', error);
        res.status(500).json({ message: 'Error fetching matches', error: error.message });
    }
};

export const updateResult = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { homeScore, awayScore } = req.body;

    try {
        const match = await prisma.match.update({
            where: { id },
            data: {
                homeScore: parseInt(homeScore),
                awayScore: parseInt(awayScore),
                status: 'PLAYED'
            },
            include: { homeTeam: true, awayTeam: true }
        });
        res.json(match);
    } catch (error: any) {
        console.error('Update Result error:', error);
        res.status(500).json({ message: 'Error updating result', error: error.message });
    }
};

export const clearLeague = async (req: Request, res: Response) => {
    try {
        await prisma.match.deleteMany();
        res.json({ message: 'League cleared' });
    } catch (error) {
        res.status(500).json({ message: 'Error clearing league' });
    }
};
