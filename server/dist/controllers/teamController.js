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
exports.deleteAllTeams = exports.deleteTeam = exports.updateTeam = exports.createTeam = exports.getTeams = void 0;
const fs_1 = __importDefault(require("fs"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const logToFile = (msg) => {
    try {
        const logMsg = `[${new Date().toISOString()}] ${msg}\n`;
        fs_1.default.appendFileSync('server-debug.log', logMsg);
    }
    catch (e) {
        console.error('Failed to log to file:', e);
    }
};
const getTeams = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        logToFile('Fetching teams...');
        const teams = yield prisma_1.default.team.findMany();
        logToFile(`Fetched ${teams.length} teams`);
        res.json(teams);
    }
    catch (error) {
        logToFile(`Error fetching teams: ${error.message}`);
        res.status(500).json({ message: 'Error fetching teams', error: error.message });
    }
});
exports.getTeams = getTeams;
const createTeam = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, logoUrl } = req.body;
    logToFile(`Create Team request: name=${name}, logoUrl=${logoUrl}`);
    if (!name) {
        logToFile('Create Team failed: name is missing');
        res.status(400).json({ message: 'Team name is required' });
        return;
    }
    try {
        const team = yield prisma_1.default.team.create({
            data: { name, logoUrl: logoUrl || null }
        });
        logToFile(`Team created successfully: id=${team.id}`);
        res.json(team);
    }
    catch (error) {
        logToFile(`Error creating team: ${error.message}`);
        res.status(500).json({ message: 'Error creating team', error: error.message });
    }
});
exports.createTeam = createTeam;
const updateTeam = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name, logoUrl } = req.body;
    try {
        const team = yield prisma_1.default.team.update({
            where: { id },
            data: { name, logoUrl }
        });
        res.json(team);
    }
    catch (error) {
        console.error('Update Team error:', error);
        res.status(500).json({ message: 'Error updating team', error: error.message });
    }
});
exports.updateTeam = updateTeam;
const deleteTeam = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    logToFile(`Delete Team request: id=${id}`);
    try {
        // Cascade delete matches for this team
        yield prisma_1.default.match.deleteMany({
            where: {
                OR: [
                    { homeTeamId: id },
                    { awayTeamId: id }
                ]
            }
        });
        logToFile(`Deleted matches associated with team id=${id}`);
        yield prisma_1.default.team.delete({ where: { id } });
        logToFile(`Team deleted: id=${id}`);
        res.json({ message: 'Team and associated matches deleted' });
    }
    catch (error) {
        logToFile(`Error deleting team: ${error.message}`);
        res.status(500).json({ message: 'Error deleting team', error: error.message });
    }
});
exports.deleteTeam = deleteTeam;
const deleteAllTeams = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        logToFile('Delete ALL teams request');
        // Clear all matches first (due to FK)
        yield prisma_1.default.match.deleteMany();
        logToFile('Cleared all matches for reset');
        yield prisma_1.default.team.deleteMany();
        logToFile('All teams deleted successfully');
        res.json({ message: 'All teams and matches cleared' });
    }
    catch (error) {
        logToFile(`Error deleting all teams: ${error.message}`);
        res.status(500).json({ message: 'Error clearing registry', error: error.message });
    }
});
exports.deleteAllTeams = deleteAllTeams;
