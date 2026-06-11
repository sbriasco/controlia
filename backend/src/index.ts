import express from 'express';
import cors from 'cors';

import horariosRoutes from './routes/horarios.routes';
import empleadosRoutes from './routes/empleados.routes';
import fichadasRoutes from './routes/fichadas.routes';
import interpretationRoutes from './routes/interpretation.routes';
import novedadesRoutes from './routes/novedades.routes';
import rotacionesRoutes from './routes/rotaciones.routes';
import feriadosRoutes from './routes/feriados.routes';
import reglasRoutes from './routes/reglas.routes';

const app = express();
const port = process.env.PORT || 3000;

// Silenciar logs no criticos por defecto. Setear LOG_LEVEL=info para habilitarlos.
const logLevel = process.env.LOG_LEVEL || 'error';
if (logLevel === 'error') {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.warn = () => {};
}

app.use(cors());
app.use(express.json());

// Rutas API
app.use('/api/horarios', horariosRoutes);
app.use('/api/empleados', empleadosRoutes);
app.use('/api/fichadas', fichadasRoutes);
app.use('/api/interpretation', interpretationRoutes);
app.use('/api/novedades', novedadesRoutes);
app.use('/api/rotaciones', rotacionesRoutes);
app.use('/api/feriados', feriadosRoutes);
app.use('/api/reglas', reglasRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Controlia Backend API V1 - Funcionando' });
});

// Catch-all 404 para la API (devolver siempre JSON)
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Ruta no encontrada en el servidor', 
    path: req.url,
    method: req.method 
  });
});

app.listen(port, () => {
  console.log(`[server]: Servidor inicializado en el puerto ${port}`);
});
