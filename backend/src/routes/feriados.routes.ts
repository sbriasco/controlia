import { Router } from 'express';
import { getFeriados, createFeriado, updateFeriado, deleteFeriado, importFeriadosAr } from '../controllers/feriados.controller';

const router = Router();

router.get('/', getFeriados);
router.post('/', createFeriado);
router.post('/importar/:anio', importFeriadosAr);
router.put('/:id', updateFeriado);
router.delete('/:id', deleteFeriado);

export default router;
