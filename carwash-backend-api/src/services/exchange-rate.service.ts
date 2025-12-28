import axios from 'axios';
import { load } from 'cheerio';
import https from 'https';

// Caché en memoria para las tasas de cambio
let cachedRates: ExchangeRates | null = null;
let cacheTimestamp: Date | null = null;
const CACHE_DURATION_MS = 2 * 60 * 1000; // 2 minutos - balance entre actualización y rendimiento

// Función helper para redondear a 2 decimales (centavos)
const roundTo2Decimals = (value: number): number => {
    return Math.round(value * 100) / 100;
};

export interface ExchangeRates {
    usd: {
        buy: number;
        sell: number;
        average: number;
        source: string;
        lastUpdated: Date;
    };
    eur: {
        buy: number;
        sell: number;
        average: number;
        source: string;
        lastUpdated: Date;
    };
}

/**
 * Obtiene las tasas de cambio del dólar desde Dólar Today
 * Este es un sitio popular en Venezuela para consultar tasas de cambio
 */
export const getExchangeRatesFromDolarToday = async (): Promise<ExchangeRates> => {
    try {
        // Configurar agente HTTPS para ignorar errores de certificado SSL (solo desarrollo)
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false // Solo para desarrollo - NO usar en producción
        });

        const response = await axios.get('https://dolartoday.com/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            httpsAgent: httpsAgent,
            timeout: 10000
        });

        const $ = load(response.data);
        
        // Buscar los valores del dólar (Dólar Today muestra varios tipos)
        // Intentamos obtener el "Dólar Paralelo" que es el más usado
        let usdBuy = 0;
        let usdSell = 0;
        let eurBuy = 0;
        let eurSell = 0;

        // Buscar el precio del dólar paralelo
        // Dólar Today tiene diferentes selectores, intentamos varios
        const usdElements = $('.exchange-rate, .dollar-rate, [data-currency="USD"], .price-value');
        
        // Si no encontramos con selectores específicos, buscamos por texto
        $('*').each((_: number, element: any) => {
            const text = $(element).text();
            // Buscar patrones como "Bs. 45.50" o "$ 45.50"
            const usdMatch = text.match(/USD.*?(\d+[.,]\d+)/i);
            const eurMatch = text.match(/EUR.*?(\d+[.,]\d+)/i);
            
            if (usdMatch && !usdBuy) {
                usdBuy = parseFloat(usdMatch[1].replace(',', '.'));
                usdSell = usdBuy * 1.02; // Aproximación: venta 2% más alta
            }
            
            if (eurMatch && !eurBuy) {
                eurBuy = parseFloat(eurMatch[1].replace(',', '.'));
                eurSell = eurBuy * 1.02;
            }
        });

        // Si no encontramos valores, intentar con una API alternativa o valores por defecto
        if (!usdBuy) {
            // Intentar obtener desde BCV (Banco Central de Venezuela)
            return await getExchangeRatesFromBCV();
        }

        const usdAverage = (usdBuy + usdSell) / 2;
        const eurAverage = (eurBuy + eurSell) / 2;

        return {
            usd: {
                buy: roundTo2Decimals(usdBuy),
                sell: roundTo2Decimals(usdSell),
                average: roundTo2Decimals(usdAverage),
                source: 'Dólar Today',
                lastUpdated: new Date()
            },
            eur: {
                buy: roundTo2Decimals(eurBuy || usdBuy * 1.1), // Aproximación EUR = USD * 1.1 si no encontramos EUR
                sell: roundTo2Decimals(eurSell || usdSell * 1.1),
                average: roundTo2Decimals(eurAverage || usdAverage * 1.1),
                source: 'Dólar Today',
                lastUpdated: new Date()
            }
        };
    } catch (error) {
        console.error('Error obteniendo tasas desde Dólar Today:', error);
        // Intentar con BCV como respaldo
        return await getExchangeRatesFromBCV();
    }
};

/**
 * Obtiene las tasas de cambio desde el Banco Central de Venezuela (BCV)
 * https://www.bcv.org.ve/
 */
export const getExchangeRatesFromBCV = async (): Promise<ExchangeRates> => {
    try {
        // Configurar agente HTTPS para ignorar errores de certificado SSL (solo desarrollo)
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false // Solo para desarrollo - NO usar en producción
        });

        // console.log('Obteniendo tasas desde BCV con httpsAgent configurado...'); // Comentado para reducir logs
        
        const response = await axios.get('https://www.bcv.org.ve/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
            },
            httpsAgent: httpsAgent,
            timeout: 15000
        });

        const $ = load(response.data);
        
        let usdRate = 0;
        let eurRate = 0;

        // BCV muestra las tasas en la sección "TIPO DE CAMBIO DE REFERENCIA"
        // Buscar elementos que contengan los símbolos € EUR y $ USD seguidos de números
        
        // Buscar por el formato específico: símbolo + código + número
        // Ejemplo: "€ EUR 317.89851452" o "$ USD 270.78930000"
        
        // Buscar en todos los elementos de texto
        $('*').each((_: number, element: any) => {
            const text = $(element).text().trim();
            
            // Buscar patrón para USD: "$ USD" seguido de número (puede tener punto o coma decimal)
            // El número puede tener muchos decimales
            const usdMatch = text.match(/\$\s*USD\s*[:\-]?\s*(\d+[.,]\d+)/i) || 
                            text.match(/USD\s*[:\-]?\s*(\d+[.,]\d+)/i) ||
                            text.match(/\$\s*(\d+[.,]\d+)/);
            
            // Buscar patrón para EUR: "€ EUR" seguido de número
            const eurMatch = text.match(/€\s*EUR\s*[:\-]?\s*(\d+[.,]\d+)/i) ||
                            text.match(/EUR\s*[:\-]?\s*(\d+[.,]\d+)/i) ||
                            text.match(/€\s*(\d+[.,]\d+)/);
            
            if (usdMatch && !usdRate) {
                const value = usdMatch[1].replace(',', '.');
                usdRate = parseFloat(value);
            }
            
            if (eurMatch && !eurRate) {
                const value = eurMatch[1].replace(',', '.');
                eurRate = parseFloat(value);
            }
        });

        // Si no encontramos con el método anterior, buscar en elementos específicos
        // BCV puede tener las tasas en divs, spans o elementos con clases específicas
        if (!usdRate || !eurRate) {
            // Buscar elementos que contengan números grandes (tasas de cambio)
            $('div, span, p, li, td').each((_: number, element: any) => {
                const $el = $(element);
                const text = $el.text().trim();
                
                // Buscar números grandes (tasas de cambio suelen ser > 1)
                const numberMatch = text.match(/^(\d+[.,]\d{8,})$/);
                if (numberMatch) {
                    const value = parseFloat(numberMatch[1].replace(',', '.'));
                    
                    // Verificar contexto: buscar si hay USD o EUR cerca
                    const parentText = $el.parent().text();
                    const prevText = $el.prev().text();
                    const nextText = $el.next().text();
                    const context = (parentText + ' ' + prevText + ' ' + nextText).toUpperCase();
                    
                    if ((context.includes('USD') || context.includes('DÓLAR') || context.includes('$')) && !usdRate) {
                        usdRate = value;
                    } else if ((context.includes('EUR') || context.includes('EURO') || context.includes('€')) && !eurRate) {
                        eurRate = value;
                    }
                }
            });
        }

        // Si aún no encontramos, buscar por estructura de lista o tabla
        if (!usdRate || !eurRate) {
            // Buscar en listas (ul, ol) o tablas
            $('ul li, ol li, tr td, div[class*="rate"], div[class*="exchange"], div[class*="tipo"]').each((_: number, element: any) => {
                const text = $(element).text();
                
                // Buscar patrón más flexible
                if (text.includes('USD') || text.includes('$')) {
                    const match = text.match(/(\d+[.,]\d+)/);
                    if (match && !usdRate) {
                        usdRate = parseFloat(match[1].replace(',', '.'));
                    }
                }
                
                if (text.includes('EUR') || text.includes('€')) {
                    const match = text.match(/(\d+[.,]\d+)/);
                    if (match && !eurRate) {
                        eurRate = parseFloat(match[1].replace(',', '.'));
                    }
                }
            });
        }

        // Validar que encontramos al menos USD
        if (!usdRate || usdRate === 0) {
            throw new Error('No se pudo obtener la tasa de cambio del dólar desde BCV');
        }

        // Si no encontramos EUR, calcular aproximación basada en USD
        if (!eurRate || eurRate === 0) {
            // Aproximación: EUR suele ser ~1.17 veces USD en BCV
            eurRate = usdRate * 1.17;
        }

        // BCV proporciona tasas de referencia (promedio ponderado)
        // Para compra/venta, aplicamos márgenes pequeños
        const usdBuy = usdRate * 0.995; // Compra 0.5% menor
        const usdSell = usdRate * 1.005; // Venta 0.5% mayor
        const eurBuy = eurRate * 0.995;
        const eurSell = eurRate * 1.005;

        return {
            usd: {
                buy: roundTo2Decimals(usdBuy),
                sell: roundTo2Decimals(usdSell),
                average: roundTo2Decimals(usdRate),
                source: 'BCV',
                lastUpdated: new Date()
            },
            eur: {
                buy: roundTo2Decimals(eurBuy),
                sell: roundTo2Decimals(eurSell),
                average: roundTo2Decimals(eurRate),
                source: 'BCV',
                lastUpdated: new Date()
            }
        };
    } catch (error: any) {
        console.error('Error obteniendo tasas desde BCV:', error.message);
        throw new Error(`Error al obtener tasas desde BCV: ${error.message}`);
    }
};

/**
 * Obtiene las tasas de cambio usando una API pública alternativa
 * Esta función puede usar APIs como exchangerate-api.com o similar
 */
export const getExchangeRatesFromAPI = async (): Promise<ExchangeRates> => {
    try {
        // API alternativa: exchangerate-api.com (gratuita, limitada)
        // Nota: Esta API da tasas internacionales, no específicas de Venezuela
        const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', {
            timeout: 10000
        });

        const rates = response.data.rates;
        const vesRate = rates.VES || 0; // Tasa USD a VES
        
        if (vesRate === 0) {
            throw new Error('Tasa VES no disponible en la API');
        }

        // Para EUR, obtener la tasa EUR/USD y multiplicar
        const eurToUsd = rates.EUR || 1.1;
        const eurRate = vesRate * eurToUsd;

        return {
            usd: {
                buy: roundTo2Decimals(vesRate * 0.99),
                sell: roundTo2Decimals(vesRate * 1.01),
                average: roundTo2Decimals(vesRate),
                source: 'ExchangeRate-API',
                lastUpdated: new Date()
            },
            eur: {
                buy: roundTo2Decimals(eurRate * 0.99),
                sell: roundTo2Decimals(eurRate * 1.01),
                average: roundTo2Decimals(eurRate),
                source: 'ExchangeRate-API',
                lastUpdated: new Date()
            }
        };
    } catch (error) {
        console.error('Error obteniendo tasas desde API externa:', error);
        throw error;
    }
};

/**
 * Función para limpiar el caché (útil para forzar actualización)
 */
export const clearExchangeRateCache = (): void => {
    cachedRates = null;
    cacheTimestamp = null;
};

/**
 * Verifica si hay datos en caché válidos
 */
export const isCached = (): boolean => {
    if (!cachedRates || !cacheTimestamp) {
        return false;
    }
    const now = new Date();
    const cacheAge = now.getTime() - cacheTimestamp.getTime();
    return cacheAge < CACHE_DURATION_MS;
};

/**
 * Función principal que obtiene las tasas de cambio desde BCV (fuente principal)
 * Implementa caché corto (2 minutos) para balancear actualización y rendimiento
 * 
 * @param forceRefresh - Si es true, ignora el caché y fuerza la actualización
 * 
 * Nota: Las tasas de cambio pueden variar durante el día, por lo que el caché
 * es relativamente corto para mantener la información actualizada.
 */
export const getExchangeRates = async (forceRefresh: boolean = false): Promise<ExchangeRates> => {
    // Si se fuerza la actualización, limpiar caché
    if (forceRefresh) {
        clearExchangeRateCache();
    }
    
    // Verificar si hay caché válido
    if (cachedRates && cacheTimestamp) {
        const now = new Date();
        const cacheAge = now.getTime() - cacheTimestamp.getTime();
        
        if (cacheAge < CACHE_DURATION_MS) {
            // Devolver caché si aún es válido (menos de 2 minutos)
            return cachedRates;
        }
    }
    
    // Si no hay caché válido, obtener nuevas tasas
    let rates: ExchangeRates;
    
    // BCV es la fuente oficial y principal
    try {
        rates = await getExchangeRatesFromBCV();
    } catch (error) {
        console.error('Error con BCV, intentando Dólar Today como respaldo:', error);
        
        // Si falla BCV, intentar con Dólar Today como respaldo
        try {
            rates = await getExchangeRatesFromDolarToday();
        } catch (error2) {
            console.error('Error con Dólar Today, intentando API externa:', error2);
            
            // Como último recurso, usar API externa
            try {
                rates = await getExchangeRatesFromAPI();
            } catch (error3) {
                console.error('Error con todas las fuentes:', error3);
                // Si hay caché antiguo, devolverlo como fallback
                if (cachedRates) {
                    console.warn('Usando tasas de cambio en caché debido a error en todas las fuentes');
                    return cachedRates;
                }
                throw new Error('No se pudieron obtener las tasas de cambio desde ninguna fuente disponible');
            }
        }
    }
    
    // Actualizar caché
    cachedRates = rates;
    cacheTimestamp = new Date();
    
    return rates;
};

