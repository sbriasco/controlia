import { Router } from 'express';
import { processInterpretation } from '../controllers/interpretation.controller';

const router = Router();

// POST /api/interpretation/process
router.post('/process', processInterpretation);

export default router;
