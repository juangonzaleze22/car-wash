import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExchangeRateService, ExchangeRatesResponse } from '../../../core/services/exchange-rate.service';
import { interval, Subscription } from 'rxjs';

@Component({
    selector: 'app-exchange-rates-marquee',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './exchange-rates-marquee.component.html',
    styleUrl: './exchange-rates-marquee.component.css'
})
export class ExchangeRatesMarqueeComponent implements OnInit, OnDestroy {
    private exchangeRateService = inject(ExchangeRateService);
    
    rates = signal<ExchangeRatesResponse | null>(null);
    loading = signal(true);
    error = signal<string | null>(null);
    
    private refreshSubscription?: Subscription;
    private readonly REFRESH_INTERVAL = 5 * 60 * 1000; // Actualizar cada 5 minutos

    ngOnInit() {
        this.loadExchangeRates();
        
        // Actualizar automáticamente cada 5 minutos
        this.refreshSubscription = interval(this.REFRESH_INTERVAL).subscribe(() => {
            this.loadExchangeRates();
        });
    }

    ngOnDestroy() {
        if (this.refreshSubscription) {
            this.refreshSubscription.unsubscribe();
        }
    }

    loadExchangeRates() {
        this.loading.set(true);
        this.error.set(null);
        
        this.exchangeRateService.getExchangeRates().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.rates.set(response);
                    this.loading.set(false);
                } else {
                    this.error.set('No se pudieron obtener las tasas de cambio');
                    this.loading.set(false);
                }
            },
            error: (err) => {
                console.error('Error al cargar tasas de cambio:', err);
                this.error.set('Error al cargar tasas de cambio');
                this.loading.set(false);
            }
        });
    }

    formatNumber(value: number): string {
        return new Intl.NumberFormat('es-VE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 8
        }).format(value);
    }
}

