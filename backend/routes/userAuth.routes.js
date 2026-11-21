import express from 'express'; 
import {
    userAuthRegisterController, 
    userAuthLoginController, 
    userAuthLogoutController, 
    userAuthDeleteController,
    userAuthProfileController,
    userAuthRefreshController,
} from '../controllers/userAuth.controller.js'; 
import { jwtAuthMiddleware } from '../middlewares/jwtAuth.middleware.js';

const router = express.Router(); 

router.post('/userAuthRegister', userAuthRegisterController); 
router.post('/userEditProfile', jwtAuthMiddleware, userAuthProfileController); 
router.post('/userAuthLogin', userAuthLoginController); 
router.post("/refresh", userAuthRefreshController);
router.post('/userAuthLogout', userAuthLogoutController); 
router.delete('/userAuthDelete', jwtAuthMiddleware, userAuthDeleteController); 

export default router; 