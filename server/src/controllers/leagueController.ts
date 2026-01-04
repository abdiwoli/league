import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getLeagueTable = async (req: Request, res: Response) => {
    try {
        const teams = await prisma.team.findMany({
            include: {
                matchesHome: { where: { status: 'PLAYED' } },
                matchesAway: { where: { status: 'PLAYED' } }
            }
        });

        const table = teams.map(team => {
            let played = 0, won = 0, drawn = 0, lost = 0, gf = 0, ga = 0, pts = 0;

            // Process Home Matches
            team.matchesHome.forEach(m => {
                played++;
                if (m.homeScore !== null && m.awayScore !== null) {
                    gf += m.homeScore;
                    ga += m.awayScore;
                    if (m.homeScore > m.awayScore) { won++; pts += 3; }
                    else if (m.homeScore < m.awayScore) lost++;
                    else { drawn++; pts += 1; }
                }
            });

            // Process Away Matches
            team.matchesAway.forEach(m => {
                played++;
                if (m.homeScore !== null && m.awayScore !== null) {
                    gf += m.awayScore; // Note: For away team, GF is awayScore
                    ga += m.homeScore;
                    if (m.awayScore > m.homeScore) { won++; pts += 3; }
                    else if (m.awayScore < m.homeScore) lost++;
                    else { drawn++; pts += 1; }
                }
            });

            return {
                id: team.id,
                name: team.name,
                logoUrl: team.logoUrl,
                played, won, drawn, lost, gf, ga,
                gd: gf - ga,
                pts
            };
        });

        // Sort: Points -> GD -> GF
        table.sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            if (b.gd !== a.gd) return b.gd - a.gd;
            return b.gf - a.gf;
        });

        res.json(table);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching table' });
    }
};
