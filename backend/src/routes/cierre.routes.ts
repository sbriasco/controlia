import { Router } from 'express';
import {
  getCierres,
  getCierreById,
  consolidarPeriodo,
  cerrarPeriodo,
  reabrirPeriodo,
} from '../controllers/cierre.controller';

const router = Router();

router.get('/', getCierres);
router.get('/:id', getCierreById);
router.post('/consolidar', consolidarPeriodo);
router.patch('/:id/cerrar', cerrarPeriodo);
router.patch('/:id/reabrir', reabrirPeriodo);

export default router;
