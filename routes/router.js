import { Router } from "express";
import generarActividad from '../controllers/consultaDatos.js'
const router = Router();

router.post('/consulta-data', generarActividad);

export default router;