import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as KPICalculator from '../services/kpi-calculator.service';
import * as ChartDataService from '../services/kpi-chart-data.service';

/**
 * GET /api/kpi/washer
 * KPIs para el lavador autenticado
 */
export const getWasherKPIs = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user || user.role !== 'WASHER') {
            return res.status(403).json({ error: 'Solo los lavadores pueden acceder a esta ruta' });
        }

        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

        const kpis = await KPICalculator.calculateWasherKPIs(user.id, startDate, endDate);
        res.json(kpis);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Error al obtener los KPIs del lavador' });
    }
};

/**
 * GET /api/kpi/admin
 * KPIs para el administrador
 */
export const getAdminKPIs = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user || user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Solo los administradores pueden acceder a esta ruta' });
        }

        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

        const kpis = await KPICalculator.calculateAdminKPIs(startDate, endDate);
        res.json(kpis);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Error al obtener los KPIs del administrador' });
    }
};

/**
 * GET /api/kpi/washer/chart-data
 * Datos históricos para gráficas del lavador
 */
export const getWasherChartData = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user || user.role !== 'WASHER') {
            return res.status(403).json({ error: 'Solo los lavadores pueden acceder a esta ruta' });
        }

        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date();
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
        
        // Si no se proporcionan fechas, usar último mes
        if (!req.query.startDate) {
            startDate.setMonth(startDate.getMonth() - 1);
        }

        const chartData = await ChartDataService.getWasherEarningsChartData(user.id, startDate, endDate);
        res.json(chartData);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Error al obtener los datos de gráficas' });
    }
};

/**
 * GET /api/kpi/admin/chart-data
 * Datos históricos para gráficas del administrador
 */
export const getAdminChartData = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user || user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Solo los administradores pueden acceder a esta ruta' });
        }

        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date();
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
        
        // Si no se proporcionan fechas, usar último mes
        if (!req.query.startDate) {
            startDate.setMonth(startDate.getMonth() - 1);
        }

        const chartData = await ChartDataService.getAdminChartData(startDate, endDate);
        res.json(chartData);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Error al obtener los datos de gráficas' });
    }
};

