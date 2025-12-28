import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiRoutes from './routes/api';
import path from 'path';
import { createServer } from 'http';
import { initSocket } from './socket';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize Socket.IO
initSocket(httpServer);

// 1. CORS Global - Permitir todo primero
app.use(cors());

// 2. Servir Archivos Estáticos (Imágenes) ANTES de Helmet
// Esto evita que Helmet imponga políticas restrictivas a las imágenes
const uploadsPath = path.resolve(__dirname, '../uploads');
console.log('Serving static files from:', uploadsPath);

app.use('/uploads', (req, res, next) => {
    // Cabeceras explícitas para permitir carga de imágenes cross-origin
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
}, express.static(uploadsPath));

// 3. Configuración de Seguridad para la API
app.use(helmet({
    crossOriginResourcePolicy: false, // Deshabilitar política global de recursos cruzados por si acaso
    contentSecurityPolicy: false, // Deshabilitar CSP para evitar conflictos en desarrollo
}));

// 4. Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5. Rutas API
app.use('/api', apiRoutes);

// Start server
httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📂 Uploads directory: ${uploadsPath}`);
});
