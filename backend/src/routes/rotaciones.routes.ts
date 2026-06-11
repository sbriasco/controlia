import { Router } from 'express';
import { getRotaciones, getRotacionById, createRotacion, updateRotacion, deleteRotacion } from '../controllers/rotaciones.controller';

const router = Router();

router.get('/', getRotaciones);
router.get('/:id', getRotacionById);
router.post('/', createRotacion);
router.put('/:id', updateRotacion);
router.delete('/:id', deleteRotacion);

export default router;
