import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as ExchangeRateService from '../services/exchange-rate.service';

/**
 * GET /api/exchange-rates
 * Obtiene las tasas de cambio actuales del dólar y euro
 * Requiere autenticación
 * Query params: ?refresh=true para forzar actualización del caché
 */
export const getExchangeRates = async (req: AuthRequest, res: Response) => {
    try {
        const forceRefresh = req.query.refresh === 'true';
        const rates = await ExchangeRateService.getExchangeRates(forceRefresh);
        res.json({
            success: true,
            data: rates,
            timestamp: new Date().toISOString(),
            cached: !forceRefresh && ExchangeRateService.isCached()
        });
    } catch (error: any) {
        console.error('Error al obtener tasas de cambio:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al obtener las tasas de cambio',
            message: 'No se pudieron obtener las tasas de cambio. Por favor, intente más tarde.'
        });
    }
};

/**
 * GET /api/exchange-rates/usd
 * Obtiene solo la tasa de cambio del dólar
 * Query params: ?refresh=true para forzar actualización del caché
 */
export const getUSDExchangeRate = async (req: AuthRequest, res: Response) => {
    try {
        const forceRefresh = req.query.refresh === 'true';
        const rates = await ExchangeRateService.getExchangeRates(forceRefresh);
        res.json({
            success: true,
            data: rates.usd,
            timestamp: new Date().toISOString(),
            cached: !forceRefresh && ExchangeRateService.isCached()
        });
    } catch (error: any) {
        console.error('Error al obtener tasa de cambio USD:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al obtener la tasa de cambio del dólar'
        });
    }
};

/**
 * GET /api/exchange-rates/eur
 * Obtiene solo la tasa de cambio del euro
 * Query params: ?refresh=true para forzar actualización del caché
 */
export const getEURExchangeRate = async (req: AuthRequest, res: Response) => {
    try {
        const forceRefresh = req.query.refresh === 'true';
        const rates = await ExchangeRateService.getExchangeRates(forceRefresh);
        res.json({
            success: true,
            data: rates.eur,
            timestamp: new Date().toISOString(),
            cached: !forceRefresh && ExchangeRateService.isCached()
        });
    } catch (error: any) {
        console.error('Error al obtener tasa de cambio EUR:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al obtener la tasa de cambio del euro'
        });
    }
};

