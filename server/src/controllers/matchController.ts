import { addDays, parseISO } from 'date-fns';
import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const generateSchedule = async (req: Request, res: Response) => {
    try {
        const {
            rounds = 1,
            daysBetweenMatches = 1,
            startDate = new Date().toISOString(),
            offDays = [],
            playDays = 2,
            restDays = 1
        } = req.body;

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
        const numMatchdaysPerRound = numTeams - 1;
        const halfSize = numTeams / 2;

        let matchesToCreate = [];
        let currentDayDate = parseISO(startDate);

        // Helper to find next valid date based on offDays
        const getNextValidDate = (date: Date, skipGap = false) => {
            let next = skipGap ? addDays(date, daysBetweenMatches) : date;
            while (offDays.includes(next.getDay())) {
                next = addDays(next, 1);
            }
            return next;
        };

        // Ensure start date itself is valid
        currentDayDate = getNextValidDate(currentDayDate, false);

        let matchdayCounter = 1;
        let patternPlayCounter = 0; // Tracks consecutive play days

        for (let r = 0; r < rounds; r++) {
            let roundTeams = [...scheduleTeams];
            for (let day = 0; day < numMatchdaysPerRound; day++) {
                // Determine if this matchday should have a date jump
                if (matchdayCounter > 1) {
                    patternPlayCounter++;

                    // If we finished a "Play" cycle, add the "Rest" days
                    if (patternPlayCounter >= playDays) {
                        currentDayDate = addDays(currentDayDate, restDays);
                        patternPlayCounter = 0;
                    }

                    currentDayDate = getNextValidDate(currentDayDate, true);
                }

                for (let i = 0; i < halfSize; i++) {
                    const team1 = roundTeams[i];
                    const team2 = roundTeams[numTeams - 1 - i];

                    if (team1.id !== 'BYE' && team2.id !== 'BYE') {
                        // Alternate home/away based on round and index for fairness
                        const isEvenRound = r % 2 === 0;
                        const isEvenIndex = i % 2 === 0;

                        const home = (isEvenRound ? isEvenIndex : !isEvenIndex) ? team1 : team2;
                        const away = (isEvenRound ? isEvenIndex : !isEvenIndex) ? team2 : team1;

                        matchesToCreate.push({
                            matchday: matchdayCounter,
                            round: r + 1,
                            date: currentDayDate,
                            status: 'SCHEDULED',
                            homeTeamId: home.id,
                            awayTeamId: away.id
                        });
                    }
                }
                // Rotate teams (keep first team fixed)
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
