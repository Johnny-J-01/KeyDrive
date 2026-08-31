import express from 'express'; 
import {
    userAuthRegisterController, 
    userAuthLoginController, 
    userAuthLogoutController, 
    userAuthDeleteController,
    userAuthProfileController,
    userAuthRefreshController,
} from '../contorllers/userAuth.controller.js'; 

const router = express.Router(); 

router.post('/userAuthRegister', userAuthRegisterController); 
router.post('/userEditProfile', userAuthProfileController); 
router.post('/userAuthLogin', userAuthLoginController); 
router.post("/refresh", userAuthRefreshController);
router.post('/userAuthLogout', userAuthLogoutController); 
router.get('/userAuthDelete', userAuthDeleteController); 

export default router; 