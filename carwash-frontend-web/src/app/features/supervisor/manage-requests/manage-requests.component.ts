import { Component, inject, signal, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { WashRequestService, DeliveryRequest } from '../../../core/services/wash-request.service';
import { UsdCurrencyPipe } from '../../../shared/pipes/usd-currency.pipe';
import { WebSocketService } from '../../../core/services/websocket.service';
import { ConfigService } from '../../../core/services/config.service';
import { FormsModule } from '@angular/forms';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TooltipModule } from 'primeng/tooltip';
import * as L from 'leaflet';

@Component({
    selector: 'app-manage-requests',
    standalone: true,
    imports: [
        CommonModule,
        TableModule,
        TagModule,
        ButtonModule,
        CardModule,
        DialogModule,
        ToastModule,
        UsdCurrencyPipe,
        FormsModule,
        InputTextareaModule,
        TooltipModule
    ],
    providers: [MessageService],
    template: `
        <div class="p-4 min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <p-toast></p-toast>
            
            <!-- Header Section -->
            <div class="mb-6 flex justify-between items-center">
                <div>
                    <h1 class="text-2xl font-bold text-gray-800 dark:text-white mb-1">Solicitudes de Lavado</h1>
                    <p class="text-sm text-gray-500 dark:text-gray-400">Gestión de servicios a domicilio en tiempo real</p>
                </div>
                <p-button 
                    icon="pi pi-refresh" 
                    [loading]="loading()" 
                    (onClick)="loadRequests()"
                    [outlined]="true"
                    severity="secondary">
                </p-button>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div class="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50 flex justify-between items-center">
                    <h3 class="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                        <i class="pi pi-map-marker"></i>
                        SOLICITUDES PENDIENTES
                    </h3>
                    <span class="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-1 rounded border border-gray-200 dark:border-gray-600">
                        {{ requests().length }} solicitudes
                    </span>
                </div>

                <div class="overflow-x-auto">
                    <p-table 
                        [value]="requests()" 
                        [loading]="loading()" 
                        responsiveLayout="scroll" 
                        [rows]="10" 
                        [paginator]="true"
                        styleClass="p-datatable-striped p-datatable-sm"
                        [rowHover]="true">
                        <ng-template pTemplate="header">
                            <tr class="bg-gray-100 dark:bg-gray-700">
                                <th class="py-3 px-4 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Fecha</th>
                                <th class="py-3 px-4 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Cliente</th>
                                <th class="py-3 px-4 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Vehículo</th>
                                <th class="py-3 px-4 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Servicios</th>
                                <th class="py-3 px-4 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase text-right">Total</th>
                                <th class="py-3 px-4 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase text-center">Estado</th>
                                <th class="py-3 px-4 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase text-center">Acciones</th>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="body" let-request>
                            <tr class="hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors border-b border-gray-100 dark:border-gray-700">
                                <td class="py-3 px-4">
                                    <div class="flex flex-col">
                                        <span class="font-bold text-sm text-gray-900 dark:text-gray-100">{{ request.createdAt | date:'dd/MM/yy' }}</span>
                                        <span class="text-[10px] text-gray-500 uppercase">{{ request.createdAt | date:'hh:mm a' }}</span>
                                    </div>
                                </td>
                                <td class="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{{ request.client?.name }}</td>
                                <td class="py-3 px-4">
                                    <span class="text-sm font-bold font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">{{ request.vehicle?.plate }}</span>
                                </td>
                                <td class="py-3 px-4">
                                    <div class="flex flex-wrap gap-1">
                                        @for (s of request.services; track s.serviceId) {
                                            <span class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-[9px] font-bold border border-gray-200 dark:border-gray-600">
                                                {{ s.name }}
                                            </span>
                                        }
                                    </div>
                                </td>
                                <td class="py-3 px-4 text-right font-bold text-gray-900 dark:text-white text-sm">{{ request.totalAmount | usdCurrency }}</td>
                                <td class="py-3 px-4 text-center">
                                    <p-tag [value]="request.status" [severity]="getStatusSeverity(request.status)" styleClass="text-[9px] font-bold"></p-tag>
                                </td>
                                <td class="py-3 px-4 text-center">
                                    <p-button 
                                        icon="pi pi-search" 
                                        [rounded]="true" 
                                        [text]="true"
                                        severity="info"
                                        size="small"
                                        pTooltip="Ver Detalle"
                                        tooltipPosition="left"
                                        (onClick)="viewRequest(request)">
                                    </p-button>
                                </td>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="emptymessage">
                            <tr>
                                <td colspan="7" class="py-12 text-center text-gray-400 font-medium">
                                    <i class="pi pi-inbox text-4xl mb-4 block opacity-20"></i>
                                    No hay solicitudes pendientes en este momento.
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            </div>

            <!-- Request Detail Dialog -->
            <p-dialog 
                [(visible)]="displayDetail" 
                [modal]="true" 
                [style]="{width: '95vw', maxWidth: '1000px', maxHeight: '90vh'}"
                [draggable]="false"
                [resizable]="false"
                [closable]="false"
                [showHeader]="false"
                styleClass="p-0 overflow-hidden rounded-xl request-detail-dialog"
                (onHide)="onHideDialog()">
                
                @if (selectedRequest(); as req) {
                    <div class="flex flex-col bg-gray-50 dark:bg-gray-900 h-full transition-colors duration-300">
                        <!-- Custom Header -->
                        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 px-6 py-4 border-b-2 border-blue-200 dark:border-gray-700 flex justify-between items-center sticky top-0 z-50 shadow-sm">
                            <div class="flex items-center gap-4">
                                <div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    <i class="pi pi-map-marker text-blue-600 dark:text-blue-400 text-sm"></i>
                                </div>
                                <div>
                                    <h2 class="text-xl font-bold text-gray-900 dark:text-white m-0">Solicitud #{{ req.id.substring(0,8) }}</h2>
                                    <p class="text-xs text-gray-500 dark:text-gray-400 m-0">Detalles de recogida y servicios</p>
                                </div>
                                <p-tag [value]="req.status" [severity]="getStatusSeverity(req.status)" styleClass="text-xs font-bold uppercase"></p-tag>
                            </div>
                            
                            <button 
                                pButton 
                                type="button" 
                                icon="pi pi-times" 
                                class="p-button-rounded p-button-text p-button-secondary !w-9 !h-9 !p-0 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                (click)="displayDetail = false">
                            </button>
                        </div>

                        <!-- Content -->
                        <div class="p-6 overflow-y-auto custom-scrollbar flex-1">
                            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl mx-auto">
                                <!-- Left Info Panel -->
                                <div class="lg:col-span-5 space-y-6">
                                    <!-- Cliente Segment -->
                                    <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                                        <div class="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                                            <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                                <i class="pi pi-user text-blue-600 dark:text-blue-400 text-sm"></i>
                                            </div>
                                            <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide m-0">Información del Cliente</h3>
                                        </div>
                                        <div class="space-y-4">
                                            <div class="grid grid-cols-2 gap-4">
                                                <div>
                                                    <span class="text-[10px] font-medium text-gray-500 dark:text-gray-400 block mb-1">Nombre Completo</span>
                                                    <span class="text-sm font-bold text-gray-900 dark:text-white">{{ req.client?.name }}</span>
                                                </div>
                                                <div>
                                                    <span class="text-[10px] font-medium text-gray-500 dark:text-gray-400 block mb-1">Teléfono</span>
                                                    <a [href]="'tel:' + req.client?.phone" class="text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                                        <i class="pi pi-phone text-[10px]"></i>
                                                        {{ req.client?.phone }}
                                                    </a>
                                                </div>
                                            </div>
                                            <div>
                                                <span class="text-[10px] font-medium text-gray-500 dark:text-gray-400 block mb-1">Dirección de Recogida</span>
                                                <p class="text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700 italic">
                                                    "{{ req.address }}"
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Vehículo/Servicios Segment -->
                                    <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                                        <div class="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                                            <div class="flex items-center gap-2">
                                                <div class="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                                                    <i class="pi pi-car text-green-600 dark:text-green-400 text-sm"></i>
                                                </div>
                                                <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide m-0">Servicios Solicitados</h3>
                                            </div>
                                            <p-tag [value]="req.vehicle?.category" severity="info" styleClass="text-[10px] uppercase font-bold"></p-tag>
                                        </div>
                                        
                                        <div class="space-y-2 mb-4">
                                            <div class="flex justify-between items-center mb-3">
                                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Vehículo</span>
                                                <span class="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400">{{ req.vehicle?.plate }}</span>
                                            </div>
                                            @for (s of req.services; track s.serviceId) {
                                                <div class="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 border border-gray-100 dark:border-gray-600 flex justify-between items-center">
                                                    <span class="text-sm font-bold text-gray-700 dark:text-gray-200">{{ s.name }}</span>
                                                    <span class="font-mono text-sm font-bold text-green-600 dark:text-green-400">{{ s.price | usdCurrency }}</span>
                                                </div>
                                            }
                                        </div>

                                        <div class="space-y-1.5 pt-4 border-t border-gray-100 dark:border-gray-700">
                                            <div class="flex justify-between items-center text-xs text-gray-500">
                                                <span>Subtotal</span>
                                                <span class="font-bold">{{ (req.totalAmount - req.deliveryFee) | usdCurrency }}</span>
                                            </div>
                                            <div class="flex justify-between items-center text-xs text-gray-500">
                                                <span>Recargo Delivery</span>
                                                <span class="font-bold">{{ req.deliveryFee | usdCurrency }}</span>
                                            </div>
                                            <div class="flex justify-between items-center pt-2">
                                                <span class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Total</span>
                                                <span class="text-xl font-black text-indigo-600 dark:text-indigo-400">{{ req.totalAmount | usdCurrency }}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Action Buttons -->
                                    <div class="flex gap-3 pt-2">
                                        <p-button 
                                            label="Rechazar" 
                                            icon="pi pi-times" 
                                            styleClass="p-button-danger p-button-outlined font-bold flex-1 py-3 rounded-xl" 
                                            (onClick)="showRejectReason(req)">
                                        </p-button>
                                        <p-button 
                                            label="Aceptar Solicitud" 
                                            icon="pi pi-check" 
                                            styleClass="font-bold flex-1 py-3 rounded-xl shadow-lg ring-4 ring-green-600/10" 
                                            severity="success"
                                            (onClick)="acceptRequest(req)">
                                        </p-button>
                                    </div>
                                </div>

                                <!-- Right Map Panel -->
                                <div class="lg:col-span-7 flex flex-col gap-4">
                                    <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1 shadow-sm h-full flex flex-col">
                                        <div class="relative flex-1 min-h-[450px] rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                                            <div id="detailMap" class="absolute inset-0 z-0"></div>
                                            
                                            <div class="absolute bottom-4 left-4 z-[400]">
                                                <div class="bg-green-600/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-[9px] font-black uppercase flex items-center gap-1 shadow-lg">
                                                    <span class="relative flex h-2 w-2">
                                                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-200 opacity-75"></span>
                                                        <span class="relative inline-flex rounded-full h-2 w-2 bg-green-300"></span>
                                                    </span>
                                                    Live Sync
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- Map Footer Legend -->
                                        <div class="mt-3 px-2 py-3 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700 text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                                            <div class="flex items-center gap-2">
                                                <i class="pi pi-map-marker text-blue-500"></i>
                                                <span>Ubicación de Recogida</span>
                                            </div>
                                            <div class="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                                <i class="pi pi-info-circle"></i>
                                                Punto exacto del vehículo
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                }
            </p-dialog>

            <!-- Rejection Reason Dialog -->
            <p-dialog 
                header="Motivo de Rechazo" 
                [(visible)]="displayRejectReason" 
                [modal]="true" 
                [style]="{width: '100%', maxWidth: '450px'}"
                [draggable]="false"
                [resizable]="false"
                styleClass="reason-dialog rounded-xl"
                [closable]="!isRejecting()">
                
                <div class="space-y-4 pt-2">
                    <p class="text-xs text-gray-500 font-medium">Por favor, indica por qué no se puede procesar esta solicitud. El cliente recibirá este mensaje informativo.</p>
                    <textarea 
                        rows="4" 
                        pInputTextarea
                        class="w-full text-sm font-medium"
                        placeholder="Ej: Fuera de horario, motorista no disponible, fuera de zona de cobertura..."
                        [(ngModel)]="rejectionComment"></textarea>
                    
                    <div class="flex gap-2 justify-end">
                        <p-button 
                            label="Cancelar" 
                            icon="pi pi-times"
                            styleClass="p-button-text p-button-secondary font-bold" 
                            (onClick)="displayRejectReason = false"
                            [disabled]="isRejecting()">
                        </p-button>
                        <p-button 
                            label="Confirmar Rechazo" 
                            icon="pi pi-check"
                            styleClass="font-bold" 
                            severity="danger"
                            (onClick)="confirmReject()"
                            [loading]="isRejecting()">
                        </p-button>
                    </div>
                </div>
            </p-dialog>
        </div>
    `,
    styles: [`
        :host ::ng-deep {
            .request-detail-dialog .p-dialog-content {
                background-color: #ffffff !important;
                padding: 0 !important;
            }
            .dark .request-detail-dialog .p-dialog-content {
                background-color: #111827 !important;
            }
            .p-datatable .p-datatable-header {
                background: transparent;
                border: none;
                padding: 0;
            }
        }
    `]
})
export class RequestManagementComponent implements OnInit, AfterViewInit, OnDestroy {
    private washRequestService = inject(WashRequestService);
    private messageService = inject(MessageService);
    private wsService = inject(WebSocketService);
    private configService = inject(ConfigService);
    private http = inject(HttpClient);

    requests = signal<DeliveryRequest[]>([]);
    loading = signal(true);
    displayDetail = false;
    displayRejectReason = false;
    selectedRequest = signal<DeliveryRequest | null>(null);
    rejectionComment = '';
    isRejecting = signal(false);

    private map?: L.Map;
    private markers: L.Marker[] = [];
    private polyline?: L.Polyline;
    private watchId?: number;

    ngOnInit() {
        this.loadRequests();
        this.wsService.listen<any>('delivery-requests:new').subscribe(() => {
            this.loadRequests();
            this.messageService.add({
                severity: 'info',
                summary: 'Nueva Solicitud',
                detail: 'Se ha recibido una nueva solicitud de lavado'
            });
        });
    }

    ngAfterViewInit() { }

    ngOnDestroy() {
        this.cleanupMap();
    }

    loadRequests() {
        this.loading.set(true);
        this.washRequestService.getPendingRequests().subscribe({
            next: (data) => {
                this.requests.set(data);
                this.loading.set(false);
            },
            error: (err: any) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudieron cargar las solicitudes'
                });
                this.loading.set(false);
            }
        });
    }

    getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
        switch (status) {
            case 'PENDING': return 'warning';
            case 'ACCEPTED': return 'success';
            case 'REJECTED': return 'danger';
            case 'IN_PROGRESS': return 'info';
            case 'COMPLETED': return 'success';
            default: return 'secondary';
        }
    }

    viewRequest(request: DeliveryRequest) {
        this.selectedRequest.set(request);
        this.displayDetail = true;
        setTimeout(() => this.initDetailMap(), 100);
    }

    initDetailMap() {
        const req = this.selectedRequest();
        if (!req) return;

        this.cleanupMap();

        const container = document.getElementById('detailMap');
        if (!container) return;

        const clientPos: L.LatLngExpression = [req.latitude, req.longitude];

        this.map = L.map('detailMap', { attributionControl: false }).setView(clientPos, 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

        const clientIcon = L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/2776/2776067.png',
            iconSize: [38, 38],
            iconAnchor: [19, 38]
        });

        const mClient = L.marker(clientPos, { icon: clientIcon }).addTo(this.map).bindPopup('Ubicación del Cliente');
        this.markers.push(mClient);

        // Ajustar vista al marcador
        setTimeout(() => this.map?.invalidateSize(), 200);
    }

    cleanupMap() {
        if (this.map) {
            this.map.remove();
            this.map = undefined;
            this.markers = [];
            this.polyline = undefined;
        }
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = undefined;
        }
    }

    onHideDialog() {
        this.cleanupMap();
    }

    acceptRequest(request: DeliveryRequest) {
        this.washRequestService.updateStatus(request.id, 'ACCEPTED').subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Aceptada',
                    detail: 'Solicitud aceptada y convertida en orden'
                });
                this.displayDetail = false;
                this.loadRequests();
            },
            error: (err: any) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: err.error?.error || 'Error al aceptar la solicitud'
                });
            }
        });
    }

    showRejectReason(request: DeliveryRequest) {
        this.rejectionComment = '';
        this.displayRejectReason = true;
    }

    confirmReject() {
        const req = this.selectedRequest();
        if (!req || !this.rejectionComment.trim()) {
            this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Debes indicar un motivo de rechazo' });
            return;
        }

        this.isRejecting.set(true);
        this.washRequestService.updateStatus(req.id, 'REJECTED', this.rejectionComment).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Rechazada',
                    detail: 'La solicitud ha sido rechazada y el cliente notificado'
                });
                this.displayRejectReason = false;
                this.displayDetail = false;
                this.isRejecting.set(false);
                this.loadRequests();
            },
            error: (err: any) => {
                this.isRejecting.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al rechazar la solicitud'
                });
            }
        });
    }
}
