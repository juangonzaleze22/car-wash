import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe para formatear precios en Dólares (USD)
 * Estándar: $X.XXX,XX (punto para miles, coma para decimales, 2 decimales)
 * 
 * Ejemplo de uso:
 * {{ 20.50 | usdCurrency }} -> "$20,50"
 */
@Pipe({
    name: 'usdCurrency',
    standalone: true
})
export class UsdCurrencyPipe implements PipeTransform {
    transform(value: number | null | undefined): string {
        if (value === null || value === undefined || isNaN(value)) {
            return '$0,00';
        }

        return new Intl.NumberFormat('es-VE', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }
}

