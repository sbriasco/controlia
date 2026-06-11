import { Router } from 'express';
import { getReglas, updateRegla } from '../controllers/reglas.controller';

const router = Router();

router.get('/', getReglas);
router.put('/:clave', updateRegla);

export default router;
