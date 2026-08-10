import express from 'express'; 
import {
    userProfileController,
} from '../contorllers/userStats.controller.js'; 

const router = express.Router(); 

router.get('/profile', userProfileController); 

export default router; 