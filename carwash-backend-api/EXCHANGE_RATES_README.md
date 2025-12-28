# Servicio de Tasas de Cambio (Exchange Rates)

Este servicio permite obtener las tasas de cambio del dólar (USD) y euro (EUR) en tiempo real mediante web scraping de diferentes fuentes.

## Instalación

Primero, instala las dependencias necesarias:

```bash
cd carwash-backend-api
npm install axios cheerio
```

## Endpoints Disponibles

Todos los endpoints requieren autenticación mediante token Bearer.

### GET /api/exchange-rates

Obtiene las tasas de cambio del dólar y euro.

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": {
    "usd": {
      "buy": 45.50,
      "sell": 46.41,
      "average": 45.955,
      "source": "Dólar Today",
      "lastUpdated": "2024-01-15T10:30:00.000Z"
    },
    "eur": {
      "buy": 50.05,
      "sell": 51.05,
      "average": 50.55,
      "source": "Dólar Today",
      "lastUpdated": "2024-01-15T10:30:00.000Z"
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET /api/exchange-rates/usd

Obtiene solo la tasa de cambio del dólar.

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": {
    "buy": 45.50,
    "sell": 46.41,
    "average": 45.955,
    "source": "Dólar Today",
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET /api/exchange-rates/eur

Obtiene solo la tasa de cambio del euro.

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": {
    "buy": 50.05,
    "sell": 51.05,
    "average": 50.55,
    "source": "Dólar Today",
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Fuentes de Datos

El servicio intenta obtener las tasas de cambio desde múltiples fuentes en el siguiente orden:

1. **Dólar Today** (https://dolartoday.com/) - Principal fuente para tasas de cambio en Venezuela
2. **BCV** (Banco Central de Venezuela) (http://www.bcv.org.ve/) - Fuente oficial
3. **ExchangeRate-API** (https://api.exchangerate-api.com/) - API externa como respaldo

Si una fuente falla, el servicio automáticamente intenta con la siguiente.

## Uso en el Frontend

Se ha creado un servicio Angular para consumir estos endpoints:

```typescript
import { ExchangeRateService } from './core/services/exchange-rate.service';

// Inyectar el servicio
constructor(private exchangeRateService: ExchangeRateService) {}

// Obtener todas las tasas
this.exchangeRateService.getExchangeRates().subscribe({
  next: (response) => {
    console.log('USD:', response.data.usd.average);
    console.log('EUR:', response.data.eur.average);
  },
  error: (error) => {
    console.error('Error:', error);
  }
});

// Obtener solo USD
this.exchangeRateService.getUSDExchangeRate().subscribe({
  next: (response) => {
    console.log('Tasa USD:', response.data.average);
  }
});

// Obtener solo EUR
this.exchangeRateService.getEURExchangeRate().subscribe({
  next: (response) => {
    console.log('Tasa EUR:', response.data.average);
  }
});
```

## Notas Importantes

1. **Web Scraping**: El servicio utiliza web scraping, lo que significa que:
   - Los selectores HTML pueden cambiar si las páginas web modifican su estructura
   - Puede haber limitaciones de rate limiting de los sitios web
   - Es recomendable implementar caché para evitar hacer demasiadas peticiones

2. **Caché**: Se recomienda implementar caché para:
   - Reducir la carga en los servidores de origen
   - Mejorar el rendimiento de la aplicación
   - Evitar bloqueos por demasiadas peticiones

3. **Manejo de Errores**: El servicio maneja errores automáticamente intentando múltiples fuentes, pero si todas fallan, retornará un error 500.

4. **Actualización**: Las tasas se obtienen en tiempo real cada vez que se llama al endpoint. Para producción, considera implementar un sistema de caché con TTL (Time To Live) de 5-15 minutos.

## Mejoras Futuras

- [ ] Implementar caché en memoria o Redis
- [ ] Agregar más fuentes de datos
- [ ] Implementar webhooks para notificar cambios significativos
- [ ] Agregar historial de tasas de cambio
- [ ] Implementar alertas cuando las tasas cambien significativamente

