import { Router } from 'express';
import * as LeagueController from '../controllers/leagueController';
import * as MatchController from '../controllers/matchController';
import * as TeamController from '../controllers/teamController';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';

import { upload } from '../middleware/uploadMiddleware';

const router = Router();

// Teams
router.get('/teams', TeamController.getTeams);
router.post('/teams', authenticate, requireAdmin, TeamController.createTeam);
router.put('/teams/:id', authenticate, requireAdmin, TeamController.updateTeam);
router.delete('/teams/:id', authenticate, requireAdmin, TeamController.deleteTeam);
router.delete('/teams', authenticate, requireAdmin, TeamController.deleteAllTeams);
router.post('/teams/upload-logo', authenticate, requireAdmin, upload.single('logo'), (req, res) => {
    if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
    }
    const url = (req.file as any).path;
    res.json({ url });
});

// Matches
router.get('/matches', MatchController.getMatches);
router.post('/matches/schedule', authenticate, requireAdmin, MatchController.generateSchedule);
router.patch('/matches/:id', authenticate, requireAdmin, MatchController.updateResult);
router.delete('/matches', authenticate, requireAdmin, MatchController.clearLeague);

// League
router.get('/table', LeagueController.getLeagueTable);

export default router;
