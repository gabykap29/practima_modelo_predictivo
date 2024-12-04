import { Router } from "express";
import { obtenerYGuardarDatosClima, prompt } from '../controllers/consultaDatos.js';
import { obtenerPromediosClimaticos } from "../controllers/estadisticas.controller.js";
const router = Router();

router.get('/consulta-data', obtenerYGuardarDatosClima);
router.post('/consulta', prompt);
router.get('/promedios', obtenerPromediosClimaticos);
export default router;