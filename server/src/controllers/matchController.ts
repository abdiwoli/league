import { addDays, parseISO } from 'date-fns';
import { Request, Response } from 'express';
import prisma from '../utils/prisma';

type ScheduleMode = 'WEEKEND_DOUBLE' | 'TRADITIONAL' | 'CUSTOM';

interface ScheduleRequest {
    mode: ScheduleMode;
    rounds: number;
    startDate: string;
    offDays?: number[];

    // For WEEKEND_DOUBLE and TRADITIONAL modes
    daysBetweenRounds?: number;

    // For TRADITIONAL mode
    matchDaysPerRound?: number;

    // For CUSTOM mode
    daysBetweenMatches?: number;
    playDays?: number;
    restDays?: number;
}

export const generateSchedule = async (req: Request, res: Response) => {
    try {
        const {
            mode = 'WEEKEND_DOUBLE',
            rounds = 1,
            startDate = new Date().toISOString(),
            offDays = [],
            daysBetweenRounds = 5,
            matchDaysPerRound = 2,
            daysBetweenMatches = 1,
            playDays = 2,
            restDays = 1
        } = req.body as ScheduleRequest;

        const teams = await prisma.team.findMany();

        if (teams.length < 2) {
            res.status(400).json({ message: 'Need at least 2 teams to generate a schedule' });
            return;
        }

        // Clear existing matches
        await prisma.match.deleteMany();

        let matchesToCreate: any[] = [];

        // Helper to find next valid date based on offDays
        const getNextValidDate = (date: Date, daysToAdd = 0) => {
            let next = addDays(date, daysToAdd);
            while (offDays.includes(next.getDay())) {
                next = addDays(next, 1);
            }
            return next;
        };

        let currentDate = parseISO(startDate);
        currentDate = getNextValidDate(currentDate, 0);

        switch (mode) {
            case 'WEEKEND_DOUBLE':
                matchesToCreate = generateWeekendDoubleRoundRobin(
                    teams,
                    rounds,
                    currentDate,
                    daysBetweenRounds,
                    getNextValidDate
                );
                break;

            case 'TRADITIONAL':
                matchesToCreate = generateTraditionalRoundRobin(
                    teams,
                    rounds,
                    currentDate,
                    matchDaysPerRound,
                    daysBetweenRounds,
                    getNextValidDate
                );
                break;

            case 'CUSTOM':
                matchesToCreate = generateCustomSchedule(
                    teams,
                    rounds,
                    currentDate,
                    daysBetweenMatches,
                    playDays,
                    restDays,
                    getNextValidDate
                );
                break;

            default:
                res.status(400).json({ message: 'Invalid scheduling mode' });
                return;
        }

        await prisma.match.createMany({
            data: matchesToCreate
        });

        res.json({
            message: `Schedule generated: ${matchesToCreate.length} matches across ${rounds} rounds.`,
            matchCount: matchesToCreate.length,
            rounds: rounds,
            mode: mode
        });

    } catch (error: any) {
        console.error('Generate Schedule error:', error);
        res.status(500).json({ message: 'Error generating schedule', error: error.message });
    }
};

// Weekend Double Round-Robin: All home matches on Day 1, all away matches on Day 2
function generateWeekendDoubleRoundRobin(
    teams: any[],
    rounds: number,
    startDate: Date,
    daysBetweenRounds: number,
    getNextValidDate: (date: Date, daysToAdd: number) => Date
) {
    const matches: any[] = [];
    let currentDate = startDate;

    for (let r = 0; r < rounds; r++) {
        // Get all unique pairings
        const pairings: Array<[any, any]> = [];
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                pairings.push([teams[i], teams[j]]);
            }
        }

        // Friday: All home matches (first team is home)
        const fridayDate = currentDate;
        pairings.forEach(([team1, team2]) => {
            matches.push({
                matchday: r * 2 + 1,
                round: r + 1,
                date: fridayDate,
                status: 'SCHEDULED',
                homeTeamId: team1.id,
                awayTeamId: team2.id
            });
        });

        // Saturday: All return matches (swap home/away)
        const saturdayDate = getNextValidDate(fridayDate, 1);
        pairings.forEach(([team1, team2]) => {
            matches.push({
                matchday: r * 2 + 2,
                round: r + 1,
                date: saturdayDate,
                status: 'SCHEDULED',
                homeTeamId: team2.id,
                awayTeamId: team1.id
            });
        });

        // Move to next round (add rest days + 2 days for the weekend we just used)
        if (r < rounds - 1) {
            currentDate = getNextValidDate(saturdayDate, daysBetweenRounds);
        }
    }

    return matches;
}

// Traditional Round-Robin: Single round-robin distributed across multiple days
function generateTraditionalRoundRobin(
    teams: any[],
    rounds: number,
    startDate: Date,
    matchDaysPerRound: number,
    daysBetweenRounds: number,
    getNextValidDate: (date: Date, daysToAdd: number) => Date
) {
    const matches: any[] = [];

    // Round Robin Algorithm (Circle Method)
    let scheduleTeams = [...teams];
    if (scheduleTeams.length % 2 !== 0) {
        scheduleTeams.push({ id: 'BYE', name: 'BYE' } as any);
    }

    const numTeams = scheduleTeams.length;
    const numMatchdaysPerRound = numTeams - 1;
    const halfSize = numTeams / 2;

    let currentDate = startDate;
    let matchdayCounter = 1;

    for (let r = 0; r < rounds; r++) {
        let roundTeams = [...scheduleTeams];
        const roundMatches: any[] = [];

        // Generate all matches for this round
        for (let day = 0; day < numMatchdaysPerRound; day++) {
            for (let i = 0; i < halfSize; i++) {
                const team1 = roundTeams[i];
                const team2 = roundTeams[numTeams - 1 - i];

                if (team1.id !== 'BYE' && team2.id !== 'BYE') {
                    const isEvenRound = r % 2 === 0;
                    const isEvenIndex = i % 2 === 0;

                    const home = (isEvenRound ? isEvenIndex : !isEvenIndex) ? team1 : team2;
                    const away = (isEvenRound ? isEvenIndex : !isEvenIndex) ? team2 : team1;

                    roundMatches.push({
                        matchday: matchdayCounter,
                        round: r + 1,
                        homeTeamId: home.id,
                        awayTeamId: away.id
                    });
                }
            }
            // Rotate teams (keep first team fixed)
            roundTeams.splice(1, 0, roundTeams.pop()!);
            matchdayCounter++;
        }

        // Distribute matches across matchDaysPerRound days
        const matchesPerDay = Math.ceil(roundMatches.length / matchDaysPerRound);
        let dayIndex = 0;

        for (let i = 0; i < roundMatches.length; i++) {
            if (i > 0 && i % matchesPerDay === 0) {
                dayIndex++;
                currentDate = getNextValidDate(currentDate, 1);
            }

            matches.push({
                ...roundMatches[i],
                date: currentDate,
                status: 'SCHEDULED'
            });
        }

        // Move to next round
        if (r < rounds - 1) {
            currentDate = getNextValidDate(currentDate, daysBetweenRounds);
        }
    }

    return matches;
}

// Custom Schedule: Full control with playDays and restDays pattern
function generateCustomSchedule(
    teams: any[],
    rounds: number,
    startDate: Date,
    daysBetweenMatches: number,
    playDays: number,
    restDays: number,
    getNextValidDate: (date: Date, daysToAdd: number) => Date
) {
    const matches: any[] = [];

    // Round Robin Algorithm (Circle Method)
    let scheduleTeams = [...teams];
    if (scheduleTeams.length % 2 !== 0) {
        scheduleTeams.push({ id: 'BYE', name: 'BYE' } as any);
    }

    const numTeams = scheduleTeams.length;
    const numMatchdaysPerRound = numTeams - 1;
    const halfSize = numTeams / 2;

    let currentDayDate = startDate;
    let matchdayCounter = 1;
    let patternPlayCounter = 0;

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

                currentDayDate = getNextValidDate(currentDayDate, daysBetweenMatches);
            }

            for (let i = 0; i < halfSize; i++) {
                const team1 = roundTeams[i];
                const team2 = roundTeams[numTeams - 1 - i];

                if (team1.id !== 'BYE' && team2.id !== 'BYE') {
                    const isEvenRound = r % 2 === 0;
                    const isEvenIndex = i % 2 === 0;

                    const home = (isEvenRound ? isEvenIndex : !isEvenIndex) ? team1 : team2;
                    const away = (isEvenRound ? isEvenIndex : !isEvenIndex) ? team2 : team1;

                    matches.push({
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

    return matches;
}

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
