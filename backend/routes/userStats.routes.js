import express from 'express'; 
import {
    userProfileController,
} from '../contorllers/userStats.controller.js'; 
import { jwtAuthMiddleware } from '../middlewares/jwtAuth.middleware.js'; 

const router = express.Router(); 

router.get('/profile', jwtAuthMiddleware, userProfileController); 

export default router; 