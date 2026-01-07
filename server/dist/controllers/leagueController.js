"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeagueTable = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getLeagueTable = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const teams = yield prisma_1.default.team.findMany({
            include: {
                matchesHome: { where: { status: 'PLAYED' } },
                matchesAway: { where: { status: 'PLAYED' } }
            }
        });
        const table = teams.map((team) => {
            let played = 0, won = 0, drawn = 0, lost = 0, gf = 0, ga = 0, pts = 0;
            // Process Home Matches
            team.matchesHome.forEach((m) => {
                played++;
                if (m.homeScore !== null && m.awayScore !== null) {
                    gf += m.homeScore;
                    ga += m.awayScore;
                    if (m.homeScore > m.awayScore) {
                        won++;
                        pts += 3;
                    }
                    else if (m.homeScore < m.awayScore)
                        lost++;
                    else {
                        drawn++;
                        pts += 1;
                    }
                }
            });
            // Process Away Matches
            team.matchesAway.forEach((m) => {
                played++;
                if (m.homeScore !== null && m.awayScore !== null) {
                    gf += m.awayScore; // Note: For away team, GF is awayScore
                    ga += m.homeScore;
                    if (m.awayScore > m.homeScore) {
                        won++;
                        pts += 3;
                    }
                    else if (m.awayScore < m.homeScore)
                        lost++;
                    else {
                        drawn++;
                        pts += 1;
                    }
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
            if (b.pts !== a.pts)
                return b.pts - a.pts;
            if (b.gd !== a.gd)
                return b.gd - a.gd;
            return b.gf - a.gf;
        });
        res.json(table);
    }
    catch (error) {
        console.error('Table error details:', error);
        res.status(500).json({
            message: 'Error fetching table',
            error: error.message,
            code: error.code
        });
    }
});
exports.getLeagueTable = getLeagueTable;
