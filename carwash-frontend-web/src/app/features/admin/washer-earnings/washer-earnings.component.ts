import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { take, debounceTime } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService, PrimeNGConfig } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { PaginatorModule } from 'primeng/paginator';
import { WasherEarningsService, WasherEarning } from '../../../core/services/washer-earnings.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';

@Component({
    selector: 'app-washer-earnings',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        InputTextModule,
        DropdownModule,
        CalendarModule,
        TagModule,
        CardModule,
        CheckboxModule,
        DialogModule,
        ConfirmDialogModule,
        ToastModule,
        SkeletonModule,
        PaginatorModule
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './washer-earnings.component.html',
    styleUrl: './washer-earnings.component.css'
})
export class WasherEarningsComponent implements OnInit, OnDestroy {
    private earningsService = inject(WasherEarningsService);
    private messageService = inject(MessageService);
    private authService = inject(AuthService);
    private userService = inject(UserService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private primengConfig = inject(PrimeNGConfig);
    private queryParamsSubscription?: Subscription;
    private isInitialLoad = true;
    private filterChangeSubject = new Subject<void>();
    private filterChangeSubscription?: Subscription;
    private isUpdatingUrl = false;
    private lastLoadParams: string = '';

    earnings = signal<WasherEarning[]>([]);
    loading = signal(false);
    selectedEarnings = signal<WasherEarning[]>([]);
    
    // Grouped earnings by washer
    groupedEarnings = signal<Map<string, WasherEarning[]>>(new Map());
    
    // Pagination
    page = signal(1);
    limit = signal(10);
    total = signal(0);
    totalPages = signal(0);

    // Filters
    statusFilter = signal<'PENDING' | 'PAID' | 'CANCELLED' | null>(null);
    washerFilter = signal<string | null>(null);
    startDate = signal<Date | null>(null);
    endDate = signal<Date | null>(null);
    
    // Washers list for filter
    washers = signal<Array<{ id: string; username: string }>>([]);
    
    // Check if current user is a washer
    isWasher = signal(false);
    
    // Dialog
    showMarkAsPaidDialog = signal(false);
    markAsPaidDate = signal<Date | null>(null);

    statusOptions = [
        { label: 'Todos', value: null },
        { label: 'Pendientes', value: 'PENDING' },
        { label: 'Pagadas', value: 'PAID' },
        { label: 'Canceladas', value: 'CANCELLED' }
    ];

    ngOnInit() {
        this.primengConfig.setTranslation({
            firstDayOfWeek: 1,
            dayNames: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
            dayNamesShort: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
            dayNamesMin: ["D", "L", "M", "X", "J", "V", "S"],
            monthNames: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
            monthNamesShort: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
            today: 'Hoy',
            clear: 'Borrar'
        });

        // Verificar si el usuario es lavador
        const currentUser = this.authService.currentUser();
        const isWasherUser = currentUser?.role === 'WASHER';
        this.isWasher.set(isWasherUser);
        
        // Si es lavador, establecer automáticamente su ID como filtro
        if (isWasherUser && currentUser?.id) {
            this.washerFilter.set(currentUser.id);
        }
        
        // Leer query params para aplicar filtros iniciales (solo una vez)
        this.route.queryParams.pipe(take(1)).subscribe(params => {
            // Aplicar filtros desde query params SIN disparar eventos de cambio
            // Usar setTimeout para asegurar que los valores se establezcan después del render inicial
            setTimeout(() => {
                if (params['status']) {
                    this.statusFilter.set(params['status'] as 'PENDING' | 'PAID' | 'CANCELLED');
                }
                // Solo aplicar washerId desde query params si NO es lavador (los lavadores solo ven sus propias ganancias)
                if (!isWasherUser && params['washerId']) {
                    this.washerFilter.set(params['washerId']);
                }
                if (params['startDate']) {
                    this.startDate.set(new Date(params['startDate']));
                }
                if (params['endDate']) {
                    this.endDate.set(new Date(params['endDate']));
                }
                
                // Marcar como carga inicial completada y cargar datos
                this.isInitialLoad = false;
                // Resetear el último parámetro para permitir la primera carga
                this.lastLoadParams = '';
                this.loadEarnings();
            }, 0);
        });
        
        // Suscribirse a cambios de filtros con debounce para evitar múltiples llamadas
        this.filterChangeSubscription = this.filterChangeSubject
            .pipe(debounceTime(300))
            .subscribe(() => {
                if (!this.isInitialLoad && !this.isUpdatingUrl) {
                    this.page.set(1);
                    this.loadEarnings();
                    // Actualizar URL después de cargar para evitar loops
                    setTimeout(() => {
                        if (!this.isUpdatingUrl) {
                            this.updateUrlParams();
                        }
                    }, 50);
                }
            });
        
        this.loadWashers();
    }

    ngOnDestroy() {
        if (this.queryParamsSubscription) {
            this.queryParamsSubscription.unsubscribe();
        }
        if (this.filterChangeSubscription) {
            this.filterChangeSubscription.unsubscribe();
        }
        this.filterChangeSubject.complete();
    }

    loadWashers() {
        this.userService.getWashers().subscribe({
            next: (washers) => {
                this.washers.set(washers);
            },
            error: (err) => {
                // Si falla, se usarán los lavadores de los earnings
                console.error('Error al cargar lavadores:', err);
            }
        });
    }

    loadEarnings() {
        // Crear una clave única para los parámetros de carga
        const paramsKey = JSON.stringify({
            page: this.page(),
            limit: this.limit(),
            status: this.statusFilter(),
            washerId: this.washerFilter(),
            startDate: this.startDate()?.toISOString(),
            endDate: this.endDate()?.toISOString()
        });
        
        // Evitar cargas duplicadas con los mismos parámetros
        if (this.lastLoadParams === paramsKey) {
            // Si ya está cargando o ya cargó con estos parámetros, no hacer nada
            return;
        }
        
        this.lastLoadParams = paramsKey;
        
        // Si ya está cargando, esperar a que termine
        if (this.loading()) {
            return;
        }
        
        this.loading.set(true);
        
        const params: any = {
            page: this.page(),
            limit: this.limit(),
        };

        if (this.statusFilter()) {
            params.status = this.statusFilter();
        }

        if (this.washerFilter() && this.washerFilter() !== null) {
            params.washerId = this.washerFilter();
        }

        if (this.startDate()) {
            params.startDate = this.startDate();
        }

        if (this.endDate()) {
            params.endDate = this.endDate();
        }

        this.earningsService.getEarnings(params).subscribe({
            next: (response) => {
                this.earnings.set(response.earnings);
                this.total.set(response.pagination.total);
                this.totalPages.set(response.pagination.totalPages);
                this.page.set(response.pagination.page);
                
                // Agrupar ganancias por lavador
                this.groupEarningsByWasher(response.earnings);
                
                // Solo actualizar lavadores si la lista está vacía (fallback)
                // Normalmente se cargan desde loadWashers()
                if (this.washers().length === 0) {
                    const uniqueWashers = new Map<string, { id: string; username: string }>();
                    response.earnings.forEach(earning => {
                        if (earning.washer && !uniqueWashers.has(earning.washerId)) {
                            uniqueWashers.set(earning.washerId, {
                                id: earning.washer.id,
                                username: earning.washer.username
                            });
                        }
                    });
                    this.washers.set(Array.from(uniqueWashers.values()));
                }
                
                this.loading.set(false);
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar las ganancias'
                });
                this.loading.set(false);
            }
        });
    }

    onFilterChange() {
        if (this.isInitialLoad) {
            return; // Evitar ejecutar durante la carga inicial
        }
        // Emitir evento para procesar con debounce
        this.filterChangeSubject.next();
    }

    updateUrlParams() {
        // Evitar actualizar URL si estamos en carga inicial o ya estamos actualizando
        if (this.isInitialLoad || this.isUpdatingUrl) {
            return;
        }
        
        const queryParams: any = {};
        if (this.statusFilter()) queryParams.status = this.statusFilter();
        if (this.washerFilter() && this.washerFilter() !== null) queryParams.washerId = this.washerFilter();
        if (this.startDate()) queryParams.startDate = this.startDate()!.toISOString();
        if (this.endDate()) queryParams.endDate = this.endDate()!.toISOString();
        
        // Comparar con los query params actuales para evitar navegaciones innecesarias
        const currentParams = this.route.snapshot.queryParams;
        
        // Normalizar valores para comparación
        const normalizeValue = (val: any) => val === null || val === undefined ? null : String(val);
        
        const hasChanges = 
            normalizeValue(queryParams.status) !== normalizeValue(currentParams['status']) ||
            normalizeValue(queryParams.washerId) !== normalizeValue(currentParams['washerId']) ||
            normalizeValue(queryParams.startDate) !== normalizeValue(currentParams['startDate']) ||
            normalizeValue(queryParams.endDate) !== normalizeValue(currentParams['endDate']);
        
        if (!hasChanges) {
            return; // No hay cambios, no actualizar URL
        }
        
        // Marcar que estamos actualizando para evitar loops
        this.isUpdatingUrl = true;
        
        // Usar replaceUrl para evitar agregar al historial y prevenir loops
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams,
            queryParamsHandling: 'merge',
            replaceUrl: true,
            skipLocationChange: false
        }).then(() => {
            this.isUpdatingUrl = false;
        }).catch(() => {
            this.isUpdatingUrl = false;
        });
    }

    onPageChange(event: any) {
        // El paginador puede venir de p-table o p-paginator
        if (event.page !== undefined) {
            // Viene de p-table (lazy load)
            this.page.set(event.page + 1);
            this.limit.set(event.rows);
        } else {
            // Viene de p-paginator
            const newPage = Math.floor(event.first / event.rows) + 1;
            this.page.set(newPage);
            this.limit.set(event.rows);
        }
        this.loadEarnings();
    }

    getStatusSeverity(status: string): 'success' | 'warning' | 'danger' | 'info' {
        switch (status) {
            case 'PAID':
                return 'success';
            case 'PENDING':
                return 'warning';
            case 'CANCELLED':
                return 'danger';
            default:
                return 'info';
        }
    }

    getStatusLabel(status: string): string {
        switch (status) {
            case 'PAID':
                return 'Pagada';
            case 'PENDING':
                return 'Pendiente';
            case 'CANCELLED':
                return 'Cancelada';
            default:
                return status;
        }
    }

    openMarkAsPaidDialog() {
        const pendingEarnings = this.selectedEarnings().filter(e => e.status === 'PENDING');
        if (pendingEarnings.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'Selecciona al menos una ganancia pendiente'
            });
            return;
        }
        this.markAsPaidDate.set(new Date());
        this.showMarkAsPaidDialog.set(true);
    }

    confirmMarkAsPaid() {
        const pendingEarnings = this.selectedEarnings().filter(e => e.status === 'PENDING');
        if (pendingEarnings.length === 0) {
            return;
        }

        const earningIds = pendingEarnings.map(e => e.id);
        
        this.earningsService.markAsPaid({
            earningIds,
            paidAt: this.markAsPaidDate() || undefined
        }).subscribe({
            next: (response) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: response.message
                });
                this.showMarkAsPaidDialog.set(false);
                this.selectedEarnings.set([]);
                this.loadEarnings();
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al marcar las ganancias como pagadas'
                });
            }
        });
    }

    selectAll(event: any) {
        if (event.checked) {
            const selectable = this.earnings().filter(e => e.status === 'PENDING');
            this.selectedEarnings.set(selectable);
        } else {
            this.selectedEarnings.set([]);
        }
    }

    isAllSelected(): boolean {
        const pendingEarnings = this.earnings().filter(e => e.status === 'PENDING');
        return pendingEarnings.length > 0 && 
               this.selectedEarnings().length === pendingEarnings.length;
    }

    isSelected(earning: WasherEarning): boolean {
        return this.selectedEarnings().some(e => e.id === earning.id);
    }

    toggleSelection(earning: WasherEarning) {
        if (earning.status !== 'PENDING') {
            return; // Solo se pueden seleccionar pendientes
        }
        
        const selected = this.selectedEarnings();
        const index = selected.findIndex(e => e.id === earning.id);
        
        if (index > -1) {
            selected.splice(index, 1);
        } else {
            selected.push(earning);
        }
        
        this.selectedEarnings.set([...selected]);
    }

    getPendingSelectedCount(): number {
        return this.selectedEarnings().filter(e => e.status === 'PENDING').length;
    }

    getPendingSelectedTotal(): number {
        return this.selectedEarnings()
            .filter(e => e.status === 'PENDING')
            .reduce((sum, e) => {
                const amount = typeof e.commissionAmount === 'string' 
                    ? parseFloat(e.commissionAmount) 
                    : Number(e.commissionAmount);
                return sum + (isNaN(amount) ? 0 : amount);
            }, 0);
    }

    hasPendingSelected(): boolean {
        return this.getPendingSelectedCount() > 0;
    }

    getWashersWithAllOption(): Array<{ id: string | null; username: string }> {
        return [{ id: null, username: 'Todos' }, ...this.washers()];
    }

    /**
     * Calcula el total general de todas las ganancias (según filtro actual)
     */
    getTotalEarnings(): number {
        return this.earnings().reduce((sum, e) => {
            const amount = typeof e.commissionAmount === 'string' 
                ? parseFloat(e.commissionAmount) 
                : Number(e.commissionAmount);
            return sum + (isNaN(amount) ? 0 : amount);
        }, 0);
    }

    /**
     * Calcula el total general pendiente
     */
    getTotalPending(): number {
        return this.earnings()
            .filter(e => e.status === 'PENDING')
            .reduce((sum, e) => {
                const amount = typeof e.commissionAmount === 'string' 
                    ? parseFloat(e.commissionAmount) 
                    : Number(e.commissionAmount);
                return sum + (isNaN(amount) ? 0 : amount);
            }, 0);
    }

    /**
     * Calcula el total general pagado
     */
    getTotalPaid(): number {
        return this.earnings()
            .filter(e => e.status === 'PAID')
            .reduce((sum, e) => {
                const amount = typeof e.commissionAmount === 'string' 
                    ? parseFloat(e.commissionAmount) 
                    : Number(e.commissionAmount);
                return sum + (isNaN(amount) ? 0 : amount);
            }, 0);
    }

    /**
     * Agrupa las ganancias por lavador
     */
    groupEarningsByWasher(earnings: WasherEarning[]): void {
        const grouped = new Map<string, WasherEarning[]>();
        
        earnings.forEach(earning => {
            const washerId = earning.washerId || 'unknown';
            if (!grouped.has(washerId)) {
                grouped.set(washerId, []);
            }
            grouped.get(washerId)!.push(earning);
        });
        
        this.groupedEarnings.set(grouped);
    }

    /**
     * Obtiene las ganancias agrupadas como array para iterar en el template
     */
    getGroupedEarningsArray(): Array<{ washerId: string; washerName: string; earnings: WasherEarning[] }> {
        const grouped = this.groupedEarnings();
        const result: Array<{ washerId: string; washerName: string; earnings: WasherEarning[] }> = [];
        
        grouped.forEach((earnings, washerId) => {
            const washerName = earnings[0]?.washer?.username || 'Desconocido';
            result.push({ washerId, washerName, earnings });
        });
        
        // Ordenar por nombre de lavador
        return result.sort((a, b) => a.washerName.localeCompare(b.washerName));
    }

    /**
     * Calcula el total de ganancias de un lavador
     */
    getWasherTotal(earnings: WasherEarning[]): number {
        return earnings.reduce((sum, e) => {
            const amount = typeof e.commissionAmount === 'string' 
                ? parseFloat(e.commissionAmount) 
                : Number(e.commissionAmount);
            return sum + (isNaN(amount) ? 0 : amount);
        }, 0);
    }

    /**
     * Calcula el total pendiente de un lavador
     */
    getWasherPendingTotal(earnings: WasherEarning[]): number {
        return earnings
            .filter(e => e.status === 'PENDING')
            .reduce((sum, e) => {
                const amount = typeof e.commissionAmount === 'string' 
                    ? parseFloat(e.commissionAmount) 
                    : Number(e.commissionAmount);
                return sum + (isNaN(amount) ? 0 : amount);
            }, 0);
    }

    /**
     * Obtiene las ganancias pendientes de un lavador
     */
    getWasherPendingEarnings(earnings: WasherEarning[]): WasherEarning[] {
        return earnings.filter(e => e.status === 'PENDING');
    }

    /**
     * Selecciona/deselecciona todas las ganancias pendientes de un lavador
     */
    toggleWasherSelection(washerId: string, checked: boolean): void {
        const grouped = this.groupedEarnings();
        const washerEarnings = grouped.get(washerId) || [];
        const pendingEarnings = washerEarnings.filter(e => e.status === 'PENDING');
        
        const selected = this.selectedEarnings();
        
        if (checked) {
            // Agregar todas las pendientes de este lavador
            pendingEarnings.forEach(earning => {
                if (!selected.some(e => e.id === earning.id)) {
                    selected.push(earning);
                }
            });
        } else {
            // Remover todas las de este lavador
            pendingEarnings.forEach(earning => {
                const index = selected.findIndex(e => e.id === earning.id);
                if (index > -1) {
                    selected.splice(index, 1);
                }
            });
        }
        
        this.selectedEarnings.set([...selected]);
    }

    /**
     * Verifica si todas las ganancias pendientes de un lavador están seleccionadas
     */
    isWasherAllSelected(washerId: string): boolean {
        const grouped = this.groupedEarnings();
        const washerEarnings = grouped.get(washerId) || [];
        const pendingEarnings = washerEarnings.filter(e => e.status === 'PENDING');
        
        if (pendingEarnings.length === 0) return false;
        
        const selected = this.selectedEarnings();
        return pendingEarnings.every(earning => selected.some(e => e.id === earning.id));
    }

    /**
     * Verifica si alguna ganancia pendiente de un lavador está seleccionada
     */
    isWasherPartiallySelected(washerId: string): boolean {
        const grouped = this.groupedEarnings();
        const washerEarnings = grouped.get(washerId) || [];
        const pendingEarnings = washerEarnings.filter(e => e.status === 'PENDING');
        
        if (pendingEarnings.length === 0) return false;
        
        const selected = this.selectedEarnings();
        const selectedCount = pendingEarnings.filter(earning => 
            selected.some(e => e.id === earning.id)
        ).length;
        
        return selectedCount > 0 && selectedCount < pendingEarnings.length;
    }

    // Métodos específicos para cada filtro para evitar llamadas múltiples
    onStatusFilterChange(value: 'PENDING' | 'PAID' | 'CANCELLED' | null) {
        // Evitar cambios durante carga inicial o si el valor es el mismo
        if (this.isInitialLoad || this.statusFilter() === value) return;
        this.statusFilter.set(value);
        this.onFilterChange();
    }

    onWasherFilterChange(value: string | null) {
        // Los lavadores no pueden cambiar el filtro de lavador (solo ven sus propias ganancias)
        if (this.isWasher()) return;
        // Evitar cambios durante carga inicial o si el valor es el mismo
        if (this.isInitialLoad) return;
        const newValue = value === null ? null : value;
        if (this.washerFilter() === newValue) return;
        this.washerFilter.set(newValue);
        this.onFilterChange();
    }

    onStartDateChange(value: Date | null) {
        // Evitar cambios durante carga inicial o si el valor es el mismo
        if (this.isInitialLoad) return;
        if (this.startDate()?.getTime() === value?.getTime()) return;
        this.startDate.set(value);
        this.onFilterChange();
    }

    onEndDateChange(value: Date | null) {
        // Evitar cambios durante carga inicial o si el valor es el mismo
        if (this.isInitialLoad) return;
        if (this.endDate()?.getTime() === value?.getTime()) return;
        this.endDate.set(value);
        this.onFilterChange();
    }
}

