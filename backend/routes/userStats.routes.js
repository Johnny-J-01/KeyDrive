import express from 'express'; 
import {
    userProfileController,
    userStatsGetController, 
    userStatsPostController, 
    allUserDataController,
    userPerformanceHistoryController
} from '../controllers/userStats.controller.js'; 
import { jwtAuthMiddleware } from '../middlewares/jwtAuth.middleware.js'; 

const router = express.Router(); 

router.get('/profile', jwtAuthMiddleware, userProfileController); 
router.post('/stats', jwtAuthMiddleware, userStatsPostController); 
router.get('/stats', jwtAuthMiddleware, userStatsGetController); 
router.get('/stats/history', jwtAuthMiddleware, userPerformanceHistoryController); 
router.get('/history', jwtAuthMiddleware, userPerformanceHistoryController); 
router.get('/users/all/data', allUserDataController); 

export default router;