import { Router } from "express";
import { obtenerYGuardarDatosClima, prompt } from '../controllers/consultaDatos.js';
const router = Router();

router.get('/consulta-data', obtenerYGuardarDatosClima);
router.post('/consulta', prompt);

export default router;