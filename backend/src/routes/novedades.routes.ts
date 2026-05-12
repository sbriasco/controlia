import { Router } from 'express';
import { getNovedades } from '../controllers/novedades.controller';

const router = Router();

// GET /api/novedades
router.get('/', getNovedades);

export default router;
