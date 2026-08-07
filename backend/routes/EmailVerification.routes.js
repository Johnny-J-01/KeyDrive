import express from 'express';
import { emailVerificationController } from '../contorllers/emailVerification.controller.js';

const router = express.Router();

router.get('/api/users/verify-email/:token', emailVerificationController); 

export default router; 