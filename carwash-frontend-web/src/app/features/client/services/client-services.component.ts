import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ServiceService, Service } from '../../../core/services/service.service';
import { ExchangeRateService } from '../../../core/services/exchange-rate.service';
import { VesCurrencyPipe } from '../../../shared/pipes/ves-currency.pipe';
import { UsdCurrencyPipe } from '../../../shared/pipes/usd-currency.pipe';

@Component({
    selector: 'app-client-services',
    standalone: true,
    imports: [
        CommonModule,
        CardModule,
        SkeletonModule,
        ToastModule,
        VesCurrencyPipe,
        UsdCurrencyPipe
    ],
    providers: [MessageService],
    templateUrl: './client-services.component.html',
    styleUrl: './client-services.component.css'
})
export class ClientServicesComponent implements OnInit {
    private serviceService = inject(ServiceService);
    private messageService = inject(MessageService);
    private exchangeRateService = inject(ExchangeRateService);
    private vesCurrencyPipe = new VesCurrencyPipe();
    private usdCurrencyPipe = new UsdCurrencyPipe();

    services = signal<Service[]>([]);
    loading = signal(true);
    exchangeRate = signal<number>(0);
    loadingExchangeRate = signal(false);

    ngOnInit() {
        this.loadServices();
        this.loadExchangeRate();
    }

    loadServices() {
        this.loading.set(true);
        this.serviceService.getPublicServices().subscribe({
            next: (services) => {
                this.services.set(services);
                this.loading.set(false);
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar los servicios'
                });
                this.loading.set(false);
            }
        });
    }

    loadExchangeRate() {
        this.loadingExchangeRate.set(true);
        this.exchangeRateService.getUSDExchangeRate().subscribe({
            next: (response) => {
                this.exchangeRate.set(response.data.average);
                this.loadingExchangeRate.set(false);
            },
            error: (err) => {
                console.error('Error loading exchange rate:', err);
                this.loadingExchangeRate.set(false);
            }
        });
    }

    getServicesByCategory(categoryCode: string): Service[] {
        return this.services().filter(s => 
            s.categoryTargetRef?.code === categoryCode || s.categoryTarget === categoryCode
        );
    }

    formatVES(amount: number): string {
        if (!amount || amount === 0) {
            return 'Bs. 0,00';
        }
        const rate = this.exchangeRate();
        if (!rate || rate === 0) {
            return 'Bs. 0,00';
        }
        const vesAmount = amount * rate;
        return this.vesCurrencyPipe.transform(vesAmount);
    }

    formatUSD(amount: number): string {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return '$0,00';
        }
        return this.usdCurrencyPipe.transform(amount);
    }
}

