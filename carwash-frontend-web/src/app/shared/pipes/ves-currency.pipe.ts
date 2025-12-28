import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe para formatear precios en Bolívares (VES)
 * Estándar: Bs. X.XXX,XX (punto para miles, coma para decimales, 2 decimales)
 * 
 * Ejemplo de uso:
 * {{ 5415.80 | vesCurrency }} -> "Bs. 5.415,80"
 */
@Pipe({
    name: 'vesCurrency',
    standalone: true
})
export class VesCurrencyPipe implements PipeTransform {
    transform(value: number | null | undefined): string {
        if (value === null || value === undefined || isNaN(value)) {
            return 'Bs. 0,00';
        }

        return new Intl.NumberFormat('es-VE', {
            style: 'currency',
            currency: 'VES',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value).replace('VES', 'Bs.');
    }
}

