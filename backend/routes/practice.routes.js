import express from 'express';
import { getPracticeWordsController } from '../controllers/practice.controller.js';

const router = express.Router();

router.get('/practice/words', getPracticeWordsController);

export default router;
