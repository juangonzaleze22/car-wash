import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as ReportService from '../services/report.service';

export const getReport = async (req: AuthRequest, res: Response) => {
    try {
        const period = (req.query.period as string) || 'today';
        const startDateParam = req.query.startDate as string;
        const endDateParam = req.query.endDate as string;

        let startDate: Date | undefined;
        let endDate: Date | undefined;

        if (period === 'custom') {
            if (!startDateParam || !endDateParam) {
                return res.status(400).json({ error: 'Fechas de inicio y fin son requeridas para el período personalizado' });
            }
            startDate = new Date(startDateParam);
            endDate = new Date(endDateParam);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return res.status(400).json({ error: 'Fechas personalizadas inválidas' });
            }
        }
        
        const userRole = req.user?.role;
        const report = await ReportService.getReport(period, startDate, endDate, userRole);
        res.json(report);
    } catch (error: any) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: error.message || 'Error al generar el reporte' });
    }
};

