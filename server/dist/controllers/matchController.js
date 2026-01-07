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
exports.clearLeague = exports.updateResult = exports.getMatches = exports.generateSchedule = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
/**
 * Get the next Friday from a given date
 */
const getNextFriday = (from = new Date()) => {
    const date = new Date(from);
    const day = date.getDay();
    const daysUntilFriday = (5 - day + 7) % 7 || 7; // 5 = Friday
    date.setDate(date.getDate() + daysUntilFriday);
    date.setHours(0, 0, 0, 0);
    return date;
};
/**
 * Generate match schedule with Friday/Saturday pattern
 * Friday: A(H) vs B(A), A(H) vs C(A), B(H) vs C(A)
 * Saturday: A(A) vs B(H), A(A) vs C(H), B(A) vs C(H)
 * Then 5 days rest before next Friday
 */
const generateSchedule = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, weeks = 4 } = req.body;
        // Fetch all teams
        const teams = yield prisma_1.default.team.findMany({ orderBy: { name: 'asc' } });
        if (teams.length !== 3) {
            res.status(400).json({
                message: `This scheduling system requires exactly 3 teams. Currently have ${teams.length} teams.`
            });
            return;
        }
        // Clear existing matches
        yield prisma_1.default.match.deleteMany();
        const [teamA, teamB, teamC] = teams;
        let currentDate = startDate ? new Date(startDate) : getNextFriday();
        const matches = [];
        let matchdayCounter = 1;
        // Generate matches for specified number of weeks
        for (let week = 0; week < weeks; week++) {
            // FRIDAY - Matchday 1 of the week
            const friday = new Date(currentDate);
            friday.setHours(18, 0, 0, 0); // 6 PM
            // Friday matches: A home, B mixed, C away
            matches.push({
                matchday: matchdayCounter,
                round: week + 1,
                date: new Date(friday),
                homeTeamId: teamA.id,
                awayTeamId: teamB.id,
                status: 'SCHEDULED'
            }, {
                matchday: matchdayCounter,
                round: week + 1,
                date: new Date(friday),
                homeTeamId: teamA.id,
                awayTeamId: teamC.id,
                status: 'SCHEDULED'
            }, {
                matchday: matchdayCounter,
                round: week + 1,
                date: new Date(friday),
                homeTeamId: teamB.id,
                awayTeamId: teamC.id,
                status: 'SCHEDULED'
            });
            matchdayCounter++;
            // SATURDAY - Matchday 2 of the week (next day)
            const saturday = new Date(friday);
            saturday.setDate(saturday.getDate() + 1);
            saturday.setHours(18, 0, 0, 0); // 6 PM
            // Saturday matches: HOME/AWAY SWAPPED from Friday
            matches.push({
                matchday: matchdayCounter,
                round: week + 1,
                date: new Date(saturday),
                homeTeamId: teamB.id, // SWAPPED
                awayTeamId: teamA.id, // SWAPPED
                status: 'SCHEDULED'
            }, {
                matchday: matchdayCounter,
                round: week + 1,
                date: new Date(saturday),
                homeTeamId: teamC.id, // SWAPPED
                awayTeamId: teamA.id, // SWAPPED
                status: 'SCHEDULED'
            }, {
                matchday: matchdayCounter,
                round: week + 1,
                date: new Date(saturday),
                homeTeamId: teamC.id, // SWAPPED
                awayTeamId: teamB.id, // SWAPPED
                status: 'SCHEDULED'
            });
            matchdayCounter++;
            // Move to next Friday (7 days from current Friday)
            currentDate.setDate(currentDate.getDate() + 7);
        }
        // Bulk create all matches
        yield prisma_1.default.match.createMany({ data: matches });
        const createdMatches = yield prisma_1.default.match.findMany({
            include: { homeTeam: true, awayTeam: true },
            orderBy: { date: 'asc' }
        });
        res.json({
            message: `Schedule generated: ${weeks} weeks, ${matches.length} matches`,
            matches: createdMatches
        });
    }
    catch (error) {
        console.error('Schedule generation error:', error);
        res.status(500).json({
            message: 'Error generating schedule',
            error: error.message
        });
    }
});
exports.generateSchedule = generateSchedule;
/**
 * Get all matches with team details
 */
const getMatches = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const matches = yield prisma_1.default.match.findMany({
            include: {
                homeTeam: { include: { players: true } },
                awayTeam: { include: { players: true } }
            },
            orderBy: {
                date: 'asc'
            }
        });
        res.json(matches);
    }
    catch (error) {
        console.error('Get matches error:', error);
        res.status(500).json({
            message: 'Error fetching matches',
            error: error.message
        });
    }
});
exports.getMatches = getMatches;
/**
 * Update match result
 */
const updateResult = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { homeScore, awayScore } = req.body;
        const match = yield prisma_1.default.match.update({
            where: { id },
            data: {
                homeScore: homeScore !== null ? parseInt(homeScore) : null,
                awayScore: awayScore !== null ? parseInt(awayScore) : null,
                status: (homeScore !== null && awayScore !== null) ? 'PLAYED' : 'SCHEDULED'
            },
            include: {
                homeTeam: true,
                awayTeam: true
            }
        });
        res.json(match);
    }
    catch (error) {
        console.error('Update result error:', error);
        res.status(500).json({
            message: 'Error updating result',
            error: error.message
        });
    }
});
exports.updateResult = updateResult;
/**
 * Clear all matches (reset league)
 */
const clearLeague = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma_1.default.match.deleteMany();
        res.json({ message: 'All matches cleared' });
    }
    catch (error) {
        console.error('Clear league error:', error);
        res.status(500).json({
            message: 'Error clearing league',
            error: error.message
        });
    }
});
exports.clearLeague = clearLeague;
