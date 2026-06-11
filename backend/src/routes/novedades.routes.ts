import { Router } from 'express';
import { getNovedades, createNovedad, updateEstadoNovedad } from '../controllers/novedades.controller';

const router = Router();

// GET /api/novedades
router.get('/', getNovedades);
router.post('/', createNovedad);
router.patch('/:id/estado', updateEstadoNovedad);

export default router;
