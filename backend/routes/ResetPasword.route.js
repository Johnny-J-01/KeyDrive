import express from 'express';
import { forgotPasswordController, resetPasswordController } from '../contorllers/resetPassword.controller.js';

const router = express.Router();

router.post('/api/password/ForgotPassword', forgotPasswordController);
router.patch('/resetPassword', resetPasswordController); 

export default router; 