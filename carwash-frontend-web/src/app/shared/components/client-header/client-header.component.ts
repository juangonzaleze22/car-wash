import { Component, inject, signal, OnInit, OnDestroy, Input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ClientAuthService } from '../../../core/services/client-auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ExchangeRateService, ExchangeRatesResponse } from '../../../core/services/exchange-rate.service';
import { ClientNotificationComponent } from '../client-notification/client-notification.component';
import { interval, Subscription } from 'rxjs';

@Component({
    selector: 'app-client-header',
    standalone: true,
    imports: [
        CommonModule,
        ButtonModule,
        TooltipModule,
        ClientNotificationComponent
    ],
    templateUrl: './client-header.component.html',
    styleUrl: './client-header.component.css'
})
export class ClientHeaderComponent implements OnInit, OnDestroy {
    clientAuthService = inject(ClientAuthService);
    themeService = inject(ThemeService);
    private exchangeRateService = inject(ExchangeRateService);
    
    @Input() toggleSidebarFn?: () => void;
    toggleSidebar = output<void>();
    
    rates = signal<ExchangeRatesResponse | null>(null);
    loadingRates = signal(true);
    errorRates = signal<string | null>(null);
    
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
        this.loadingRates.set(true);
        this.errorRates.set(null);
        
        this.exchangeRateService.getExchangeRates().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.rates.set(response);
                    this.loadingRates.set(false);
                } else {
                    this.errorRates.set('No se pudieron obtener las tasas');
                    this.loadingRates.set(false);
                }
            },
            error: (err) => {
                console.error('Error al cargar tasas de cambio:', err);
                this.errorRates.set('Error al cargar tasas');
                this.loadingRates.set(false);
            }
        });
    }

    formatNumber(value: number): string {
        return new Intl.NumberFormat('es-VE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    toggleTheme() {
        this.themeService.toggleTheme();
    }

    logout() {
        this.clientAuthService.logout();
    }

    onToggleSidebar() {
        if (this.toggleSidebarFn) {
            this.toggleSidebarFn();
        } else {
            this.toggleSidebar.emit();
        }
    }
}

