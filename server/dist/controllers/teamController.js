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
exports.deleteTeam = exports.updateTeam = exports.createTeam = exports.getTeams = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getTeams = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const teams = yield prisma_1.default.team.findMany();
        res.json(teams);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching teams' });
    }
});
exports.getTeams = getTeams;
const createTeam = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, logoUrl } = req.body;
    if (!name) {
        res.status(400).json({ message: 'Team name is required' });
        return;
    }
    try {
        const count = yield prisma_1.default.team.count();
        if (count >= 4) {
            res.status(400).json({ message: 'League is full (max 4 teams)' });
            return;
        }
        const team = yield prisma_1.default.team.create({
            data: { name, logoUrl }
        });
        res.json(team);
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating team' });
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
        res.status(500).json({ message: 'Error updating team' });
    }
});
exports.updateTeam = updateTeam;
const deleteTeam = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        yield prisma_1.default.team.delete({ where: { id } });
        res.json({ message: 'Team deleted' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting team' });
    }
});
exports.deleteTeam = deleteTeam;
