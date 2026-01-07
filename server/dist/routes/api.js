"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const LeagueController = __importStar(require("../controllers/leagueController"));
const MatchController = __importStar(require("../controllers/matchController"));
const PlayerController = __importStar(require("../controllers/playerController"));
const StatsController = __importStar(require("../controllers/statsController"));
const TeamController = __importStar(require("../controllers/teamController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const uploadMiddleware_1 = require("../middleware/uploadMiddleware");
const router = (0, express_1.Router)();
// Teams
router.get('/teams', TeamController.getTeams);
router.post('/teams', authMiddleware_1.authenticate, authMiddleware_1.requireAdmin, TeamController.createTeam);
router.put('/teams/:id', authMiddleware_1.authenticate, authMiddleware_1.requireAdmin, TeamController.updateTeam);
router.delete('/teams/:id', authMiddleware_1.authenticate, authMiddleware_1.requireAdmin, TeamController.deleteTeam);
router.delete('/teams', authMiddleware_1.authenticate, authMiddleware_1.requireAdmin, TeamController.deleteAllTeams);
router.post('/teams/upload-logo', authMiddleware_1.authenticate, authMiddleware_1.requireAdmin, uploadMiddleware_1.upload.single('logo'), (req, res) => {
    if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
    }
    const url = req.file.path;
    res.json({ url });
});
// Matches
router.get('/matches', MatchController.getMatches);
router.post('/matches/schedule', authMiddleware_1.authenticate, authMiddleware_1.requireAdmin, MatchController.generateSchedule);
router.patch('/matches/:id', authMiddleware_1.authenticate, authMiddleware_1.requireAdmin, MatchController.updateResult);
router.delete('/matches', authMiddleware_1.authenticate, authMiddleware_1.requireAdmin, MatchController.clearLeague);
// League
router.get('/table', LeagueController.getLeagueTable);
// Players
router.get('/players', PlayerController.getPlayers);
router.get('/players/team/:teamId', PlayerController.getPlayersByTeam);
router.post('/players', authMiddleware_1.authenticate, authMiddleware_1.requireAdmin, PlayerController.createPlayer);
router.put('/players/:id', authMiddleware_1.authenticate, authMiddleware_1.requireAdmin, PlayerController.updatePlayer);
router.delete('/players/:id', authMiddleware_1.authenticate, authMiddleware_1.requireAdmin, PlayerController.deletePlayer);
// Statistics
router.post('/stats/match/:matchId', authMiddleware_1.authenticate, authMiddleware_1.requireAdmin, StatsController.recordMatchStats);
router.get('/stats/match/:matchId', StatsController.getMatchStats);
router.get('/stats/player/:playerId', StatsController.getPlayerStats);
router.get('/stats/league', StatsController.getLeagueStats);
router.get('/stats/top-performers', StatsController.getTopPerformers);
exports.default = router;
