import express from 'express'; 
import {
    userProfileController,
    userStatsController
} from '../contorllers/userStats.controller.js'; 
import { jwtAuthMiddleware } from '../middlewares/jwtAuth.middleware.js'; 

const router = express.Router(); 

router.get('/profile', jwtAuthMiddleware, userProfileController); 
router.post('/stats', jwtAuthMiddleware, userStatsController); 

export default router; 