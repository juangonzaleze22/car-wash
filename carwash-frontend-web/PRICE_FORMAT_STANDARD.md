# Estándar de Formato de Precios

Este documento define el estándar para mostrar precios en la aplicación CarWash Pro.

## Formato de Precios en Bolívares (VES)

**Estándar:** `Bs. X.XXX,XX`

- **Símbolo:** `Bs.` (siempre con punto)
- **Separador de miles:** Punto (.)
- **Separador decimal:** Coma (,)
- **Decimales:** Siempre 2 decimales
- **Ejemplos:**
  - `Bs. 5.415,80`
  - `Bs. 270,79`
  - `Bs. 1.234.567,89`

## Formato de Precios en Dólares (USD)

**Estándar:** `$X.XXX,XX` o `USD X.XXX,XX`

- **Símbolo:** `$` o `USD`
- **Separador de miles:** Punto (.)
- **Separador decimal:** Coma (,)
- **Decimales:** Siempre 2 decimales
- **Ejemplos:**
  - `$20,50`
  - `$1.234,56`
  - `USD 20,50`

## Implementación

### Pipes Disponibles

Se han creado dos pipes estándar para formatear precios:

1. **`vesCurrency`** - Para precios en Bolívares
   ```html
   {{ precioVES | vesCurrency }}
   <!-- Ejemplo: Bs. 5.415,80 -->
   ```

2. **`usdCurrency`** - Para precios en Dólares
   ```html
   {{ precioUSD | usdCurrency }}
   <!-- Ejemplo: $20,50 -->
   ```

### Uso en Componentes TypeScript

```typescript
import { VesCurrencyPipe } from '../../../shared/pipes/ves-currency.pipe';
import { UsdCurrencyPipe } from '../../../shared/pipes/usd-currency.pipe';

// En el componente
private vesPipe = new VesCurrencyPipe();
private usdPipe = new UsdCurrencyPipe();

formatVES(amount: number): string {
    return this.vesPipe.transform(amount);
}

formatUSD(amount: number): string {
    return this.usdPipe.transform(amount);
}
```

## Conversión USD a VES

Para convertir precios de USD a VES, usar la tasa de cambio actual del servicio:

```typescript
// Obtener tasa de cambio
const rates = await exchangeRateService.getUSDExchangeRate();
const exchangeRate = rates.data.average; // Ej: 270.79

// Convertir
const precioVES = precioUSD * exchangeRate;

// Formatear
const precioFormateado = vesPipe.transform(precioVES);
```

## Reglas de Visualización

1. **Siempre mostrar ambos precios** cuando sea relevante:
   - USD como precio principal (más grande)
   - VES como precio secundario (más pequeño, debajo)

2. **Formato consistente:**
   - Usar los pipes `vesCurrency` y `usdCurrency` en lugar de formateo manual
   - Nunca usar `number:'1.2-2'` directamente, usar los pipes

3. **Ejemplo de visualización:**
   ```html
   <div class="precio-principal">{{ precioUSD | usdCurrency }}</div>
   <div class="precio-secundario">{{ precioVES | vesCurrency }}</div>
   ```

## Archivos de Referencia

- `src/app/shared/pipes/ves-currency.pipe.ts` - Pipe para formatear VES
- `src/app/shared/pipes/usd-currency.pipe.ts` - Pipe para formatear USD
- `src/app/core/services/exchange-rate.service.ts` - Servicio para obtener tasas

