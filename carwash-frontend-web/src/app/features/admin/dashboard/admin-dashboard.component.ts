import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { ThemeService } from '../../../core/services/theme.service';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabview';
import { CalendarModule } from 'primeng/calendar';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DropdownModule } from 'primeng/dropdown';
import { KPIService, AdminKPIs } from '../../../core/services/kpi.service';
import { ExpenseService, Expense } from '../../../core/services/expense.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { PatioDashboardComponent } from '../../supervisor/dashboard/patio-dashboard.component';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AuthService } from '../../../core/services/auth.service';
import { Subscription } from 'rxjs';
import { NgApexchartsModule, ChartComponent, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexDataLabels, ApexTooltip, ApexStroke, ApexYAxis, ApexTitleSubtitle, ApexFill, ApexLegend, ApexPlotOptions, ApexResponsive, ApexGrid } from 'ng-apexcharts';

export type ChartOptions = {
    series: ApexAxisChartSeries | any;
    chart: ApexChart | any;
    xaxis: ApexXAxis | any;
    stroke: ApexStroke | any;
    dataLabels: ApexDataLabels | any;
    tooltip: ApexTooltip | any;
    fill: ApexFill | any;
    yaxis: ApexYAxis | any;
    title: ApexTitleSubtitle | any;
    labels: any;
    legend: ApexLegend | any;
    plotOptions: ApexPlotOptions | any;
    responsive: ApexResponsive[] | any;
    grid: ApexGrid | any;
    colors: string[] | any;
};

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        CardModule,
        SkeletonModule,
        TableModule,
        TagModule,
        ButtonModule,
        TabViewModule,
        CalendarModule,
        SelectButtonModule,
        DropdownModule,
        ToastModule,
        PatioDashboardComponent,
        NgApexchartsModule
    ],
    providers: [MessageService],
    templateUrl: './admin-dashboard.component.html',
    styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
    private kpiService = inject(KPIService);
    private expenseService = inject(ExpenseService);
    private messageService = inject(MessageService);
    private webSocketService = inject(WebSocketService);
    private authService = inject(AuthService);
    themeService = inject(ThemeService);

    kpis = signal<AdminKPIs | null>(null);
    loading = signal(true);
    showKPIs = signal(true);
    upcomingRecurringExpenses = signal<Expense[]>([]);
    loadingRecurringExpenses = signal(false);
    loadingCharts = signal(true);
    private socketSubscription?: Subscription;

    // Chart Options
    financialChartOptions = signal<Partial<ChartOptions> | null>(null);
    distributionChartOptions = signal<Partial<ChartOptions> | null>(null);
    efficiencyChartOptions = signal<Partial<ChartOptions> | null>(null);

    // Period filter
    selectedPeriod = signal<'today' | 'week' | 'month' | 'year' | 'custom'>('today');
    customStartDate = signal<Date | null>(null);
    customEndDate = signal<Date | null>(null);

    periodOptions = [
        { label: 'Hoy', value: 'today' },
        { label: 'Semana', value: 'week' },
        { label: 'Mes', value: 'month' },
        { label: 'Año', value: 'year' },
        { label: 'Personalizado', value: 'custom' }
    ];

    // Service filter for time table
    selectedServiceId = signal<string | null>(null);



    ngOnInit() {
        this.loadKPIs();
        this.loadUpcomingRecurringExpenses();
        this.loadChartData();
        this.setupSocketListeners();
    }


    ngOnDestroy() {
        if (this.socketSubscription) {
            this.socketSubscription.unsubscribe();
        }
    }

    setupSocketListeners() {
        const user = this.authService.currentUser();
        if (user && user.role === 'ADMIN') {
            // Unirse al room de admin
            this.webSocketService.emit('join:room', {
                role: 'ADMIN'
            });

            // Escuchar actualizaciones de KPIs
            this.socketSubscription = this.webSocketService.listen<AdminKPIs>('kpi:admin:updated').subscribe((data: AdminKPIs) => {
                this.kpis.set(data);
                this.loading.set(false);
            });
        }
    }

    getDateRange(): { startDate: Date; endDate: Date } {
        const now = new Date();
        let startDate = new Date();
        const endDate = new Date(now);

        switch (this.selectedPeriod()) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            case 'custom':
                if (this.customStartDate() && this.customEndDate()) {
                    startDate = this.customStartDate()!;
                    endDate.setTime(this.customEndDate()!.getTime());
                }
                break;
        }

        return { startDate, endDate };
    }

    onPeriodChange() {
        if (this.selectedPeriod() !== 'custom') {
            this.loadKPIs();
            this.loadChartData();
        }
    }

    onCustomDateChange() {
        if (this.customStartDate() && this.customEndDate()) {
            this.loadKPIs();
            this.loadChartData();
        }
    }

    loadUpcomingRecurringExpenses() {
        this.loadingRecurringExpenses.set(true);
        this.expenseService.getUpcomingRecurringExpenses(10).subscribe({
            next: (response) => {
                this.upcomingRecurringExpenses.set(response.expenses);
                this.loadingRecurringExpenses.set(false);
            },
            error: (err) => {
                console.error('Error al cargar gastos recurrentes próximos:', err);
                this.loadingRecurringExpenses.set(false);
            }
        });
    }

    loadKPIs() {
        this.loading.set(true);
        const { startDate, endDate } = this.getDateRange();
        this.kpiService.getAdminKPIs(startDate, endDate).subscribe({
            next: (data) => {
                // Si hay servicios pero no hay servicio seleccionado, seleccionar el primero automáticamente
                if (data.serviceAverages && data.serviceAverages.length > 0 && !this.selectedServiceId()) {
                    this.selectedServiceId.set(data.serviceAverages[0].serviceId);
                }

                this.kpis.set(data);
                this.loading.set(false);
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar los KPIs'
                });
                this.loading.set(false);
            }
        });
    }

    toggleView() {
        this.showKPIs.update(v => !v);
    }

    loadChartData() {
        this.loadingCharts.set(true);
        const { startDate, endDate } = this.getDateRange();

        this.kpiService.getAdminChartData(startDate, endDate).subscribe({
            next: (data: any) => {
                this.setupFinancialChart(data);
                this.setupDistributionChart();
                this.setupEfficiencyChart();
                this.loadingCharts.set(false);
            },
            error: (err) => {
                console.error('Error al cargar datos de gráficas:', err);
                this.loadingCharts.set(false);
            }
        });
    }

    private setupFinancialChart(data: any) {
        const isDark = this.themeService.isDarkMode();
        const textColor = isDark ? '#e5e7eb' : '#374151';
        const gridColor = isDark ? '#374151' : '#f3f4f6';

        this.financialChartOptions.set({
            series: [
                { name: 'Ingresos', data: data.revenues },
                { name: 'Gastos', data: data.expenses.map((v: number) => -v) },
                { name: 'Ganancia Neta', data: data.netProfit }
            ],
            chart: {
                type: 'area',
                height: 350,
                toolbar: { show: false },
                zoom: { enabled: false },
                background: 'transparent',
                foreColor: textColor
            },
            colors: ['#3b82f6', '#ef4444', '#10b981'],
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 2 },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.45,
                    opacityTo: 0.05,
                    stops: [20, 100, 100, 100]
                }
            },
            xaxis: {
                categories: data.dates.map((d: string) => {
                    const date = new Date(d);
                    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                }),
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: { style: { colors: textColor } }
            },
            yaxis: {
                labels: {
                    formatter: (val: number) => `$${val.toFixed(0)}`,
                    style: { colors: textColor }
                }
            },
            grid: {
                borderColor: gridColor,
                strokeDashArray: 4,
                padding: { left: 20, right: 20 }
            },
            tooltip: {
                theme: isDark ? 'dark' : 'light',
                x: { show: true },
                style: {
                    fontSize: '12px',
                    fontFamily: 'Inter, sans-serif'
                },
                y: {
                    formatter: (val: number) => `$${val.toFixed(2)}`
                }
            },
            legend: {
                position: 'top',
                horizontalAlign: 'right',
                labels: { colors: textColor }
            }
        });
    }

    private setupDistributionChart() {
        const kpis = this.kpis();
        if (!kpis || !kpis.servicesByCategory) return;

        const isDark = this.themeService.isDarkMode();
        const textColor = isDark ? '#e5e7eb' : '#374151';

        const categories = kpis.servicesByCategory;
        const series = categories.map(c => c.serviceCount);
        const labels = categories.map(c => c.categoryName);

        this.distributionChartOptions.set({
            series: series,
            chart: {
                type: 'donut',
                height: 350,
                background: 'transparent',
                foreColor: textColor
            },
            labels: labels,
            colors: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'],
            plotOptions: {
                pie: {
                    donut: {
                        size: '70%',
                        labels: {
                            show: true,
                            name: {
                                show: true,
                                color: textColor
                            },
                            value: {
                                show: true,
                                color: textColor
                            },
                            total: {
                                show: true,
                                label: 'Total',
                                color: textColor,
                                formatter: () => series.reduce((a, b) => a + b, 0).toString()
                            }
                        }
                    }
                }
            },
            legend: {
                position: 'bottom',
                labels: {
                    colors: textColor,
                    useSeriesColors: false
                }
            },
            dataLabels: { enabled: false },
            tooltip: {
                theme: isDark ? 'dark' : 'light',
                style: {
                    fontSize: '12px',
                    fontFamily: 'Inter, sans-serif'
                }
            },
            stroke: { show: false }
        });
    }

    private setupEfficiencyChart() {
        const kpis = this.kpis();
        if (!kpis || !kpis.avgTimeByWasher) return;

        const isDark = this.themeService.isDarkMode();
        const textColor = isDark ? '#e5e7eb' : '#374151';
        const gridColor = isDark ? '#374151' : '#f3f4f6';

        const data = kpis.avgTimeByWasher.sort((a, b) => b.avgTimeMinutes - a.avgTimeMinutes);
        const names = data.map(d => d.washerName);
        const times = data.map(d => Math.round(d.avgTimeMinutes));

        this.efficiencyChartOptions.set({
            series: [{
                name: 'Minutos Promedio',
                data: times
            }],
            chart: {
                type: 'bar',
                height: 350,
                toolbar: { show: false },
                background: 'transparent',
                foreColor: textColor
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    borderRadius: 4,
                    barHeight: '60%',
                    distributed: true
                }
            },
            colors: ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'],
            dataLabels: {
                enabled: true,
                formatter: (val: number) => `${val} min`,
                textAnchor: 'start',
                style: { colors: ['#fff'] },
                offsetX: 0
            },
            xaxis: {
                categories: names,
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: { style: { colors: textColor } }
            },
            yaxis: {
                labels: { style: { colors: textColor } }
            },
            grid: {
                borderColor: gridColor,
                strokeDashArray: 4
            },
            tooltip: {
                theme: isDark ? 'dark' : 'light',
                style: {
                    fontSize: '12px',
                    fontFamily: 'Inter, sans-serif'
                },
                y: {
                    formatter: (val: number) => `${val} minutos por servicio`
                }
            },
            legend: { show: false }
        });
    }

    /**
     * Formatea el tiempo en minutos a formato legible (ej: "16 seg", "45 min" o "1h 30min")
     */
    formatTime(minutes: number): string {
        if (!minutes || minutes === 0) {
            return '0 min';
        }

        // Si es menos de 1 minuto, mostrar en segundos
        if (minutes < 1) {
            const seconds = Math.round(minutes * 60);
            return `${seconds} seg`;
        }

        // Si es menos de 60 minutos, mostrar en minutos (con decimales si es necesario)
        if (minutes < 60) {
            // Si tiene decimales significativos (menos de 1 minuto), mostrar segundos también
            const wholeMinutes = Math.floor(minutes);
            const remainingSeconds = Math.round((minutes - wholeMinutes) * 60);

            if (wholeMinutes === 0) {
                return `${remainingSeconds} seg`;
            } else if (remainingSeconds > 0) {
                return `${wholeMinutes} min ${remainingSeconds} seg`;
            } else {
                return `${wholeMinutes} min`;
            }
        }

        // Si es 60 minutos o más, mostrar en horas y minutos
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = Math.round(minutes % 60);

        if (remainingMinutes === 0) {
            return `${hours}h`;
        }

        return `${hours}h ${remainingMinutes}min`;
    }

    /**
     * Obtiene los servicios únicos de los datos
     */
    getUniqueServices(): Array<{ serviceId: string; serviceName: string; avgTimeMinutes: number }> {
        const kpis = this.kpis();
        if (!kpis || !kpis.serviceAverages) return [];
        return kpis.serviceAverages;
    }

    /**
     * Obtiene las opciones para el dropdown de servicios
     */
    getServiceOptions(): Array<{ label: string; value: string }> {
        const services = this.getUniqueServices();
        return services.map(s => ({
            label: s.serviceName,
            value: s.serviceId
        }));
    }

    /**
     * Obtiene el servicio seleccionado
     */
    getSelectedService() {
        const serviceId = this.selectedServiceId();
        if (!serviceId) return null;
        const services = this.getUniqueServices();
        return services.find(s => s.serviceId === serviceId) || null;
    }

    /**
     * Obtiene los lavadores del servicio seleccionado
     */
    getWashersForSelectedService() {
        const serviceId = this.selectedServiceId();
        if (!serviceId) return [];
        return this.getWashersForService(serviceId);
    }

    /**
     * Maneja el cambio de servicio seleccionado
     */
    onServiceChange(serviceId: string | null) {
        this.selectedServiceId.set(serviceId);
    }

    /**
     * Obtiene los lavadores que han realizado un servicio específico con sus tiempos
     */
    getWashersForService(serviceId: string): Array<{
        washerId: string;
        washerName: string;
        avgTimeMinutes: number;
        totalOrders: number;
        diffPercent: number;
    }> {
        const kpis = this.kpis();
        if (!kpis || !kpis.avgTimeByServiceAndWasher) return [];

        const serviceAvg = kpis.serviceAverages?.find(s => s.serviceId === serviceId)?.avgTimeMinutes || 0;

        return kpis.avgTimeByServiceAndWasher
            .filter(item => item.serviceId === serviceId)
            .map(item => {
                const diffPercent = serviceAvg > 0
                    ? ((item.avgTimeMinutes - serviceAvg) / serviceAvg * 100)
                    : 0;
                return {
                    washerId: item.washerId,
                    washerName: item.washerName,
                    avgTimeMinutes: item.avgTimeMinutes,
                    totalOrders: item.totalOrders,
                    diffPercent: diffPercent
                };
            })
            .sort((a, b) => a.avgTimeMinutes - b.avgTimeMinutes); // Ordenar por tiempo (más rápido primero)
    }

    /**
     * Calcula el porcentaje de diferencia absoluto
     */
    getAbsDiffPercent(diffPercent: number): number {
        return Math.abs(Math.round(diffPercent));
    }

    /**
     * Verifica si la diferencia es significativa (>5%)
     */
    isSignificantDiff(diffPercent: number): boolean {
        return Math.abs(diffPercent) > 5;
    }

    /**
     * Obtiene los lavadores únicos de los datos
     */
    getUniqueWashers(): Array<{ washerId: string; washerName: string }> {
        const kpis = this.kpis();
        if (!kpis || !kpis.avgTimeByServiceAndWasher) return [];

        const washersMap = new Map<string, { washerId: string; washerName: string }>();
        kpis.avgTimeByServiceAndWasher.forEach(item => {
            if (!washersMap.has(item.washerId)) {
                washersMap.set(item.washerId, {
                    washerId: item.washerId,
                    washerName: item.washerName
                });
            }
        });

        return Array.from(washersMap.values());
    }

    /**
     * Obtiene el tiempo promedio de un lavador para un servicio específico
     */
    getWasherTimeForService(washerId: string, serviceId: string): number | null {
        const kpis = this.kpis();
        if (!kpis || !kpis.avgTimeByServiceAndWasher) return null;

        const item = kpis.avgTimeByServiceAndWasher.find(
            x => x.washerId === washerId && x.serviceId === serviceId
        );

        return item ? item.avgTimeMinutes : null;
    }

    /**
     * Obtiene el número de órdenes de un lavador para un servicio específico
     */
    getWasherOrdersForService(washerId: string, serviceId: string): number {
        const kpis = this.kpis();
        if (!kpis || !kpis.avgTimeByServiceAndWasher) return 0;

        const item = kpis.avgTimeByServiceAndWasher.find(
            x => x.washerId === washerId && x.serviceId === serviceId
        );

        return item ? item.totalOrders : 0;
    }

    /**
     * Obtiene ambos valores (tiempo y órdenes) para un lavador y servicio específico
     * Esto optimiza las llamadas al template evitando múltiples búsquedas
     */
    getWasherServiceData(washerId: string, serviceId: string): { time: number | null; orders: number } {
        const kpis = this.kpis();
        if (!kpis || !kpis.avgTimeByServiceAndWasher) {
            return { time: null, orders: 0 };
        }

        const item = kpis.avgTimeByServiceAndWasher.find(
            x => x.washerId === washerId && x.serviceId === serviceId
        );

        return {
            time: item ? item.avgTimeMinutes : null,
            orders: item ? item.totalOrders : 0
        };
    }

    /**
     * Calcula la eficiencia relativa comparando con el promedio del servicio
     * Retorna un valor entre -1 y 1: negativo = más lento, positivo = más rápido
     */
    getEfficiencyScore(washerTime: number | null, serviceAvgTime: number): number {
        if (!washerTime || serviceAvgTime === 0) return 0;

        // Si el lavador es más rápido que el promedio, score positivo
        // Si es más lento, score negativo
        const diff = serviceAvgTime - washerTime;
        return diff / serviceAvgTime; // Normalizado entre -1 y 1
    }

    /**
     * Obtiene la clase CSS para el indicador de eficiencia
     */
    getEfficiencyClass(washerTime: number | null, serviceAvgTime: number): string {
        const score = this.getEfficiencyScore(washerTime, serviceAvgTime);

        if (!washerTime) return 'efficiency-na';
        if (score > 0.2) return 'efficiency-excellent'; // 20% más rápido
        if (score > 0.1) return 'efficiency-good'; // 10% más rápido
        if (score > -0.1) return 'efficiency-normal'; // Dentro del 10% del promedio
        if (score > -0.2) return 'efficiency-slow'; // 10% más lento
        return 'efficiency-very-slow'; // Más de 20% más lento
    }

    /**
     * Obtiene el icono para el indicador de eficiencia
     */
    getEfficiencyIcon(washerTime: number | null, serviceAvgTime: number): string {
        const score = this.getEfficiencyScore(washerTime, serviceAvgTime);

        if (!washerTime) return 'pi-question-circle';
        if (score > 0.2) return 'pi-check-circle';
        if (score > 0.1) return 'pi-check';
        if (score > -0.1) return 'pi-minus';
        if (score > -0.2) return 'pi-exclamation-triangle';
        return 'pi-times-circle';
    }

    getExpenseCategoryLabel(category: string): string {
        return this.expenseService.getCategoryLabel(category as any);
    }

    getRecurrenceLabel(frequency?: string): string {
        if (!frequency) return '';
        return this.expenseService.getRecurrenceLabel(frequency as any);
    }

    isDueSoon(nextDueDate?: string): boolean {
        if (!nextDueDate) return false;
        const dueDate = new Date(nextDueDate);
        const today = new Date();
        const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff <= 7 && daysDiff >= 0; // Próximos 7 días
    }

    isOverdue(nextDueDate?: string): boolean {
        if (!nextDueDate) return false;
        const dueDate = new Date(nextDueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
    }

    getServicesByCategoryWithPercentage() {
        if (!this.kpis() || !this.kpis()!.servicesByCategory) return [];
        const totalServices = this.kpis()!.servicesByCategory.reduce((sum, cat) => sum + cat.serviceCount, 0);
        return this.kpis()!.servicesByCategory.map(cat => ({
            ...cat,
            percentage: totalServices > 0 ? (cat.serviceCount / totalServices) * 100 : 0
        }));
    }

    getCategoryColor(categoryCode: string): string {
        // Generar un color consistente basado en el código de la categoría
        // Usar un hash simple para convertir el código en un índice de color
        const colorPalette = [
            'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', // Azul
            'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', // Morado
            'linear-gradient(135deg, #10b981 0%, #059669 100%)', // Verde
            'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', // Naranja
            'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', // Rojo
            'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', // Rosa
            'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', // Cyan
            'linear-gradient(135deg, #84cc16 0%, #65a30d 100%)', // Lima
            'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', // Naranja oscuro
            'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', // Índigo
        ];

        // Función hash simple para convertir el código en un número
        let hash = 0;
        for (let i = 0; i < categoryCode.length; i++) {
            const char = categoryCode.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convertir a entero de 32 bits
        }

        // Usar el valor absoluto del hash para obtener un índice válido
        const index = Math.abs(hash) % colorPalette.length;
        return colorPalette[index];
    }
}

