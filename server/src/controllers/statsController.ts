import { Request, Response } from 'express';
import prisma from '../utils/prisma';

/**
 * Calculate player rating based on performance
 * Formula: (Goals * 3) + (Assists * 2) - (YellowCards * 1) - (RedCards * 3)
 */
const calculatePlayerRating = (stats: {
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
}): number => {
    return (
        stats.goals * 3 +
        stats.assists * 2 -
        stats.yellowCards * 1 -
        stats.redCards * 3
    );
};

/**
 * Record or update player statistics for a match
 */
export const recordMatchStats = async (req: Request, res: Response) => {
    try {
        const { matchId } = req.params;
        const { playerStats } = req.body; // Array of { playerId, goals, assists, yellowCards, redCards, minutesPlayed, isBestPlayer }

        if (!Array.isArray(playerStats)) {
            res.status(400).json({
                message: 'playerStats must be an array'
            });
            return;
        }

        // Verify match exists
        const match = await prisma.match.findUnique({
            where: { id: matchId },
            include: {
                homeTeam: { include: { players: true } },
                awayTeam: { include: { players: true } }
            }
        });

        if (!match) {
            res.status(404).json({ message: 'Match not found' });
            return;
        }

        // Get all player IDs from both teams
        const validPlayerIds = [
            ...match.homeTeam.players.map(p => p.id),
            ...match.awayTeam.players.map(p => p.id)
        ];

        // Validate all players belong to teams in this match
        for (const stat of playerStats) {
            if (!validPlayerIds.includes(stat.playerId)) {
                res.status(400).json({
                    message: `Player ${stat.playerId} does not belong to either team in this match`
                });
                return;
            }
        }

        // Upsert stats for each player
        const results = await Promise.all(
            playerStats.map(stat =>
                prisma.playerStats.upsert({
                    where: {
                        playerId_matchId: {
                            playerId: stat.playerId,
                            matchId: matchId
                        }
                    },
                    update: {
                        goals: stat.goals || 0,
                        assists: stat.assists || 0,
                        yellowCards: stat.yellowCards || 0,
                        redCards: stat.redCards || 0,
                        minutesPlayed: stat.minutesPlayed || null,
                        isBestPlayer: stat.isBestPlayer || false
                    },
                    create: {
                        playerId: stat.playerId,
                        matchId: matchId,
                        goals: stat.goals || 0,
                        assists: stat.assists || 0,
                        yellowCards: stat.yellowCards || 0,
                        redCards: stat.redCards || 0,
                        minutesPlayed: stat.minutesPlayed || null,
                        isBestPlayer: stat.isBestPlayer || false
                    },
                    include: {
                        player: {
                            include: {
                                team: true
                            }
                        }
                    }
                })
            )
        );

        res.json({
            message: 'Match statistics recorded successfully',
            stats: results
        });
    } catch (error: any) {
        console.error('Record match stats error:', error);
        res.status(500).json({
            message: 'Error recording match statistics',
            error: error.message
        });
    }
};

/**
 * Get statistics for a specific match
 */
export const getMatchStats = async (req: Request, res: Response) => {
    try {
        const { matchId } = req.params;

        const stats = await prisma.playerStats.findMany({
            where: { matchId },
            include: {
                player: {
                    include: {
                        team: true
                    }
                }
            },
            orderBy: [
                { player: { team: { name: 'asc' } } },
                { player: { number: 'asc' } }
            ]
        });

        res.json(stats);
    } catch (error: any) {
        console.error('Get match stats error:', error);
        res.status(500).json({
            message: 'Error fetching match statistics',
            error: error.message
        });
    }
};

/**
 * Get all statistics for a specific player
 */
export const getPlayerStats = async (req: Request, res: Response) => {
    try {
        const { playerId } = req.params;

        const stats = await prisma.playerStats.findMany({
            where: { playerId },
            include: {
                match: {
                    include: {
                        homeTeam: true,
                        awayTeam: true
                    }
                }
            },
            orderBy: {
                match: { date: 'desc' }
            }
        });

        // Calculate totals
        const totals = stats.reduce(
            (acc, stat) => ({
                goals: acc.goals + stat.goals,
                assists: acc.assists + stat.assists,
                yellowCards: acc.yellowCards + stat.yellowCards,
                redCards: acc.redCards + stat.redCards,
                matchesPlayed: acc.matchesPlayed + 1
            }),
            { goals: 0, assists: 0, yellowCards: 0, redCards: 0, matchesPlayed: 0 }
        );

        res.json({
            stats,
            totals,
            rating: calculatePlayerRating(totals)
        });
    } catch (error: any) {
        console.error('Get player stats error:', error);
        res.status(500).json({
            message: 'Error fetching player statistics',
            error: error.message
        });
    }
};

/**
 * Get league-wide player statistics with rankings
 */
export const getLeagueStats = async (req: Request, res: Response) => {
    try {
        const players = await prisma.player.findMany({
            include: {
                team: true,
                stats: true
            }
        });

        // Calculate aggregated stats for each player
        const playerStats = players.map(player => {
            const totals = player.stats.reduce(
                (acc, stat) => ({
                    goals: acc.goals + stat.goals,
                    assists: acc.assists + stat.assists,
                    yellowCards: acc.yellowCards + stat.yellowCards,
                    redCards: acc.redCards + stat.redCards,
                    matchesPlayed: acc.matchesPlayed + 1,
                    motmCount: acc.motmCount + (stat.isBestPlayer ? 1 : 0)
                }),
                { goals: 0, assists: 0, yellowCards: 0, redCards: 0, matchesPlayed: 0, motmCount: 0 }
            );

            const rating = calculatePlayerRating(totals);

            return {
                id: player.id,
                name: player.name,
                number: player.number,
                team: {
                    id: player.team.id,
                    name: player.team.name,
                    logoUrl: player.team.logoUrl
                },
                ...totals,
                rating,
                avgGoalsPerMatch: totals.matchesPlayed > 0 ? (totals.goals / totals.matchesPlayed).toFixed(2) : '0.00',
                avgAssistsPerMatch: totals.matchesPlayed > 0 ? (totals.assists / totals.matchesPlayed).toFixed(2) : '0.00'
            };
        });

        // Sort priority: MOTM > Goals > Assists > Red Cards (ascending - lower is better)
        playerStats.sort((a, b) => {
            if (b.motmCount !== a.motmCount) return b.motmCount - a.motmCount;
            if (b.goals !== a.goals) return b.goals - a.goals;
            if (b.assists !== a.assists) return b.assists - a.assists;
            return a.redCards - b.redCards; // Fewer red cards is better
        });

        // Add rank
        const rankedStats = playerStats.map((player, index) => ({
            rank: index + 1,
            ...player
        }));

        res.json(rankedStats);
    } catch (error: any) {
        console.error('Get league stats error:', error);
        res.status(500).json({
            message: 'Error fetching league statistics',
            error: error.message
        });
    }
};

/**
 * Get top performers (top scorers, top assisters, best players)
 */
export const getTopPerformers = async (req: Request, res: Response) => {
    try {
        const players = await prisma.player.findMany({
            include: {
                team: true,
                stats: true
            }
        });

        // Calculate totals for each player
        const playerStats = players.map(player => {
            const totals = player.stats.reduce(
                (acc, stat) => ({
                    goals: acc.goals + stat.goals,
                    assists: acc.assists + stat.assists,
                    yellowCards: acc.yellowCards + stat.yellowCards,
                    redCards: acc.redCards + stat.redCards,
                    matchesPlayed: acc.matchesPlayed + 1,
                    motmCount: acc.motmCount + (stat.isBestPlayer ? 1 : 0)
                }),
                { goals: 0, assists: 0, yellowCards: 0, redCards: 0, matchesPlayed: 0, motmCount: 0 }
            );

            return {
                id: player.id,
                name: player.name,
                number: player.number,
                team: player.team,
                ...totals,
                rating: calculatePlayerRating(totals)
            };
        });

        // Get top 5 in each category
        const topScorers = [...playerStats]
            .sort((a, b) => b.goals - a.goals)
            .slice(0, 5);

        const topAssisters = [...playerStats]
            .sort((a, b) => b.assists - a.assists)
            .slice(0, 5);

        const bestPlayers = [...playerStats]
            .sort((a, b) => {
                if (b.motmCount !== a.motmCount) return b.motmCount - a.motmCount;
                if (b.goals !== a.goals) return b.goals - a.goals;
                return b.assists - a.assists;
            })
            .slice(0, 5);

        res.json({
            topScorers,
            topAssisters,
            bestPlayers
        });
    } catch (error: any) {
        console.error('Get top performers error:', error);
        res.status(500).json({
            message: 'Error fetching top performers',
            error: error.message
        });
    }
};
