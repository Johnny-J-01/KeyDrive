import express from 'express'; 
import {
    userProfileController,
    userStatsGetController, 
    userStatsPostController
} from '../contorllers/userStats.controller.js'; 
import { jwtAuthMiddleware } from '../middlewares/jwtAuth.middleware.js'; 

const router = express.Router(); 

router.get('/profile', jwtAuthMiddleware, userProfileController); 
router.post('/stats', jwtAuthMiddleware, userStatsPostController); 
router.get('/stats', jwtAuthMiddleware, userStatsGetController); 

export default router; 