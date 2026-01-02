import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { TabViewModule } from 'primeng/tabview';
import { CalendarModule } from 'primeng/calendar';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { KPIService, WasherKPIs, ChartData, WasherEfficiencyData } from '../../../core/services/kpi.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AuthService } from '../../../core/services/auth.service';
import { Subscription } from 'rxjs';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
    ApexNonAxisChartSeries,
    ApexResponsive,
    ApexChart,
    ApexTheme,
    ApexTitleSubtitle,
    ApexAxisChartSeries,
    ApexXAxis,
    ApexYAxis,
    ApexDataLabels,
    ApexGrid,
    ApexStroke,
    ApexLegend,
    ApexTooltip,
    ApexPlotOptions
} from 'ng-apexcharts';

export type ChartOptions = {
    series: ApexAxisChartSeries | ApexNonAxisChartSeries;
    chart: ApexChart;
    responsive: ApexResponsive[];
    labels: any;
    theme: ApexTheme;
    title: ApexTitleSubtitle;
    xaxis: ApexXAxis;
    yaxis: ApexYAxis;
    dataLabels: ApexDataLabels;
    grid: ApexGrid;
    stroke: ApexStroke;
    legend: ApexLegend;
    tooltip: ApexTooltip;
    plotOptions?: ApexPlotOptions;
    colors?: string[];
};

@Component({
    selector: 'app-washer-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        CardModule,
        SkeletonModule,
        TabViewModule,
        CalendarModule,
        ButtonModule,
        SelectButtonModule,
        ToastModule,
        NgApexchartsModule
    ],
    providers: [MessageService],
    templateUrl: './washer-dashboard.component.html',
    styleUrl: './washer-dashboard.component.css'
})
export class WasherDashboardComponent implements OnInit, OnDestroy {
    private kpiService = inject(KPIService);
    private messageService = inject(MessageService);
    private webSocketService = inject(WebSocketService);
    private authService = inject(AuthService);

    kpis = signal<WasherKPIs | null>(null);
    chartData = signal<ChartData | null>(null);
    loading = signal(true);
    chartLoading = signal(false);
    efficiencyLoading = signal(false);
    efficiencyData = signal<WasherEfficiencyData | null>(null);
    private socketSubscription?: Subscription;

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

    // Chart options
    earningsChartOptions: Partial<ChartOptions> = {
        series: [],
        chart: { type: 'area', height: 350 },
        xaxis: { categories: [] }
    };
    ordersChartOptions: Partial<ChartOptions> = {
        series: [],
        chart: { type: 'bar', height: 350 },
        xaxis: { categories: [] }
    };
    efficiencyChartOptions: Partial<ChartOptions> = {
        series: [],
        chart: { type: 'bar', height: 350 },
        xaxis: { categories: [] }
    };

    ngOnInit() {
        this.loadKPIs();
        this.loadChartData();
        this.loadEfficiencyData();
        this.setupSocketListeners();
        this.initChartOptions();
    }

    ngOnDestroy() {
        if (this.socketSubscription) {
            this.socketSubscription.unsubscribe();
        }
    }

    setupSocketListeners() {
        const user = this.authService.currentUser();
        if (user && user.role === 'WASHER') {
            // Unirse al room del lavador
            this.webSocketService.emit('join:room', {
                role: 'WASHER',
                userId: user.id
            });

            // Escuchar actualizaciones de KPIs
            this.socketSubscription = this.webSocketService.listen<any>('kpi:washer:updated').subscribe((data: any) => {
                // Verificar que los KPIs sean para este lavador
                if (data.washerId === user.id || !data.washerId) {
                    this.kpis.set(data);
                    this.loading.set(false);
                    this.loadChartData(); // Recargar gráficas también
                }
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

    loadKPIs() {
        this.loading.set(true);
        const { startDate, endDate } = this.getDateRange();
        this.kpiService.getWasherKPIs(startDate, endDate).subscribe({
            next: (data) => {
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

    loadChartData() {
        this.chartLoading.set(true);
        const { startDate, endDate } = this.getDateRange();
        this.kpiService.getWasherChartData(startDate, endDate).subscribe({
            next: (data) => {
                this.chartData.set(data);
                this.updateCharts(data);
                this.chartLoading.set(false);
            },
            error: (err) => {
                this.chartLoading.set(false);
            }
        });
    }

    loadEfficiencyData() {
        this.efficiencyLoading.set(true);
        this.kpiService.getWasherEfficiencyData().subscribe({
            next: (data) => {
                this.efficiencyData.set(data);
                this.updateEfficiencyChart(data);
                this.efficiencyLoading.set(false);
            },
            error: () => this.efficiencyLoading.set(false)
        });
    }

    initChartOptions() {
        this.earningsChartOptions = {
            series: [],
            chart: {
                type: 'area',
                height: 350,
                toolbar: { show: false },
                zoom: { enabled: false }
            },
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 2 },
            xaxis: { categories: [], type: 'datetime' },
            yaxis: {
                labels: {
                    formatter: (val: number) => `$${val.toFixed(2)}`
                }
            },
            tooltip: {
                y: {
                    formatter: (val: number) => `$${val.toFixed(2)}`
                }
            },
            colors: ['#3B82F6', '#10B981', '#F59E0B'],
            legend: {
                position: 'top',
                horizontalAlign: 'right'
            },
            grid: {
                borderColor: '#E5E7EB',
                strokeDashArray: 4
            }
        };

        this.ordersChartOptions = {
            series: [],
            chart: {
                type: 'bar',
                height: 350,
                toolbar: { show: false }
            },
            dataLabels: { enabled: true },
            xaxis: { categories: [] },
            yaxis: {
                labels: {
                    formatter: (val: number) => val.toString()
                }
            },
            colors: ['#3B82F6'],
            grid: {
                borderColor: '#E5E7EB',
                strokeDashArray: 4
            }
        };

        this.efficiencyChartOptions = {
            series: [],
            chart: {
                type: 'bar',
                height: 350,
                toolbar: { show: false }
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    dataLabels: { position: 'top' }
                }
            } as any,
            dataLabels: {
                enabled: true,
                offsetX: -6,
                style: { fontSize: '12px', colors: ['#fff'] },
                formatter: (val: number) => `${val}m`
            },
            stroke: { show: true, width: 1, colors: ['#fff'] },
            xaxis: { categories: [] },
            colors: ['#3B82F6', '#94A3B8'],
            legend: { position: 'top' },
            tooltip: {
                y: {
                    formatter: (val: number) => `${val} minutos`
                }
            }
        };
    }

    updateCharts(data: ChartData) {
        // Gráfica de ganancias
        this.earningsChartOptions = {
            ...this.earningsChartOptions,
            series: [
                {
                    name: 'Total',
                    data: data.totals || []
                },
                {
                    name: 'Pagadas',
                    data: data.paids || []
                },
                {
                    name: 'Pendientes',
                    data: data.pendings || []
                }
            ],
            xaxis: {
                ...this.earningsChartOptions.xaxis,
                categories: data.dates
            }
        };

        // Gráfica de órdenes
        this.ordersChartOptions = {
            ...this.ordersChartOptions,
            series: [{
                name: 'Órdenes',
                data: data.counts || []
            }],
            xaxis: {
                ...this.ordersChartOptions.xaxis,
                categories: data.dates
            }
        };
    }

    updateEfficiencyChart(data: WasherEfficiencyData) {
        this.efficiencyChartOptions = {
            ...this.efficiencyChartOptions,
            series: [
                {
                    name: 'Mi Tiempo Promedio',
                    data: data.washerAverages
                },
                {
                    name: 'Promedio General',
                    data: data.globalAverages
                }
            ],
            xaxis: {
                ...this.efficiencyChartOptions.xaxis,
                categories: data.services
            }
        };
    }
}

