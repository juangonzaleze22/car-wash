import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarModule } from 'primeng/calendar';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ReportService, Report } from '../../../core/services/report.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-daily-report',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        CalendarModule,
        TableModule,
        CardModule,
        ButtonModule,
        TagModule,
        ToastModule
    ],
    providers: [MessageService],
    templateUrl: './daily-report.component.html',
    styleUrl: './daily-report.component.css'
})
export class DailyReportComponent implements OnInit {
    private reportService = inject(ReportService);
    private messageService = inject(MessageService);
    authService = inject(AuthService);

    selectedPeriod = signal<string>('today');
    customStartDate = signal<Date | null>(null);
    customEndDate = signal<Date | null>(null);
    report = signal<Report | null>(null);
    loading = signal(false);
    maxDate = new Date();

    periodOptions = [
        { label: 'Hoy', value: 'today' },
        { label: 'Ayer', value: 'yesterday' },
        { label: 'Últimos 7 días', value: 'week' },
        { label: 'Este mes', value: 'month' },
        { label: 'Este año', value: 'year' },
        { label: 'Personalizado', value: 'custom' }
    ];

    ngOnInit() {
        this.loadReport();
    }

    onPeriodChange(period: string) {
        this.selectedPeriod.set(period);
        if (period !== 'custom') {
            this.customStartDate.set(null);
            this.customEndDate.set(null);
        }
        this.loadReport();
    }

    onCustomDateChange() {
        if (this.selectedPeriod() === 'custom' && this.customStartDate() && this.customEndDate()) {
            this.loadReport();
        }
    }

    loadReport() {
        const period = this.selectedPeriod();
        let startDate: Date | undefined;
        let endDate: Date | undefined;

        if (period === 'custom') {
            if (!this.customStartDate() || !this.customEndDate()) {
                this.report.set(null);
                return;
            }
            startDate = this.customStartDate()!;
            endDate = this.customEndDate()!;
        }

        this.loading.set(true);
        this.reportService.getReport(period, startDate, endDate).subscribe({
            next: (report) => {
                this.report.set(report);
                this.loading.set(false);
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: err.error?.error || 'Error al cargar el reporte'
                });
                this.loading.set(false);
                this.report.set(null);
            }
        });
    }

    getPeriodLabel(period: string): string {
        const option = this.periodOptions.find(opt => opt.value === period);
        return option?.label || period;
    }

    getMethodLabel(method: string): string {
        const methods: { [key: string]: string } = {
            'CASH': 'Efectivo',
            'CARD': 'Tarjeta',
            'TRANSFER': 'Transferencia'
        };
        return methods[method] || method;
    }

    getCurrencyLabel(currency: string): string {
        return currency === 'USD' ? 'Dólares' : 'Bolívares';
    }

    getStatusLabel(status: string): string {
        const statusMap: { [key: string]: string } = {
            'RECEIVED': 'Recibida',
            'IN_PROGRESS': 'En Progreso',
            'QUALITY_CHECK': 'Control de Calidad',
            'WAITING_PAYMENT': 'Esperando Pago',
            'COMPLETED': 'Completada',
            'CANCELLED': 'Cancelada'
        };
        return statusMap[status] || status;
    }

    getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' | undefined {
        const statusMap: { [key: string]: 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' | undefined } = {
            'RECEIVED': 'info',
            'IN_PROGRESS': 'warning',
            'QUALITY_CHECK': 'info',
            'WAITING_PAYMENT': 'warning',
            'COMPLETED': 'success',
            'CANCELLED': 'danger'
        };
        return statusMap[status] || 'info';
    }

    getExpenseCategoryLabel(category: string): string {
        const categories: { [key: string]: string } = {
            'SUPPLIES': 'Suministros',
            'EQUIPMENT': 'Equipos',
            'MAINTENANCE': 'Mantenimiento',
            'UTILITIES': 'Servicios Públicos',
            'SALARY': 'Salarios',
            'OTHER': 'Otros'
        };
        return categories[category] || category;
    }

    getMaxStartDate(): Date {
        return this.customEndDate() || this.maxDate;
    }

    isAdmin(): boolean {
        return this.authService.currentUser()?.role === 'ADMIN';
    }

    printReport() {
        window.print();
    }

    /**
     * Calcula el total de pagos en USD para una orden
     */
    getOrderPaymentsTotalUSD(order: Report['orders'][0]): number {
        return order.payments.reduce((sum, payment) => sum + payment.amountUSD, 0);
    }

    /**
     * Calcula el total de pagos en USD de todas las órdenes
     */
    getTotalPaymentsUSD(): number {
        if (!this.report()) return 0;
        return this.report()!.orders.reduce((sum, order) => {
            return sum + this.getOrderPaymentsTotalUSD(order);
        }, 0);
    }

    /**
     * Calcula el total de las órdenes (suma de totalAmount)
     */
    getTotalOrdersAmount(): number {
        if (!this.report()) return 0;
        return this.report()!.orders.reduce((sum, order) => sum + order.totalAmount, 0);
    }
}

