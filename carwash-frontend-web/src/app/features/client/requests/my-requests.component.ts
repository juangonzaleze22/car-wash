import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
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
import { TooltipModule } from 'primeng/tooltip';
import * as L from 'leaflet';

@Component({
    selector: 'app-my-requests',
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
        TooltipModule
    ],
    providers: [MessageService],
    template: `
        <div class="p-4 min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <p-toast></p-toast>
            
            <div class="mb-6 flex justify-between items-center">
                <div>
                    <h1 class="text-2xl font-bold text-gray-800 dark:text-white mb-1">Mis Solicitudes</h1>
                    <p class="text-sm text-gray-500 dark:text-gray-400">Historial de lavados a domicilio</p>
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
                        <i class="pi pi-history"></i>
                        HISTORIAL DE LAVADOS
                    </h3>
                    <span class="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-1 rounded border border-gray-200 dark:border-gray-600">
                        {{ requests().length }} registros
                    </span>
                </div>

                <div class="overflow-x-auto">
                    <p-table 
                        [value]="requests()" 
                        [loading]="loading()" 
                        responsiveLayout="scroll" 
                        [rows]="10" 
                        [paginator]="true"
                        styleClass="p-datatable-striped p-datatable-sm">
                        <ng-template pTemplate="header">
                            <tr class="bg-gray-100 dark:bg-gray-700">
                                <th class="py-3 px-4 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Fecha</th>
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
                                <td class="py-3 px-4">
                                    <span class="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">{{ request.vehicle?.plate }}</span>
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
                                        (onClick)="viewDetail(request)">
                                    </p-button>
                                </td>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="emptymessage">
                            <tr>
                                <td colspan="6" class="py-12 text-center text-gray-400 font-medium">
                                    <i class="pi pi-inbox text-4xl mb-4 block opacity-20"></i>
                                    Aún no has realizado ninguna solicitud de lavado.
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            </div>

            <!-- Detail Dialog -->
            <p-dialog 
                [(visible)]="displayDetail" 
                [modal]="true" 
                [style]="{width: '95vw', maxWidth: '600px', maxHeight: '90vh'}"
                [draggable]="false"
                [resizable]="false"
                [closable]="false"
                [showHeader]="false"
                styleClass="p-0 overflow-hidden rounded-xl request-detail-dialog"
                (onHide)="cleanupMap()">
                
                @if (selectedRequest(); as req) {
                    <div class="flex flex-col bg-gray-50 dark:bg-gray-900 h-full transition-colors duration-300">
                        <!-- Custom Header -->
                        <div class="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-800 px-6 py-4 border-b-2 border-indigo-200 dark:border-gray-700 flex justify-between items-center sticky top-0 z-50 shadow-sm">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                    <i class="pi pi-file text-indigo-600 dark:text-indigo-400"></i>
                                </div>
                                <div>
                                    <h2 class="text-lg font-bold text-gray-900 dark:text-white m-0">Solicitud Detallada</h2>
                                    <p class="text-[10px] text-gray-500 dark:text-gray-400 m-0 uppercase font-black">{{ req.createdAt | date:'dd MMMM yyyy HH:mm' }}</p>
                                </div>
                            </div>
                            
                            <button 
                                pButton 
                                type="button" 
                                icon="pi pi-times" 
                                class="p-button-rounded p-button-text p-button-secondary !w-9 !h-9 !p-0 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
                                (click)="displayDetail = false">
                            </button>
                        </div>

                        <div class="p-6 overflow-y-auto custom-scrollbar">
                            <div class="space-y-6">
                                <div class="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                     <div class="flex flex-col">
                                        <span class="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Vehículo</span>
                                        <span class="text-xl font-black font-mono text-gray-900 dark:text-white">{{ req.vehicle?.plate }}</span>
                                    </div>
                                    <p-tag [value]="req.status" [severity]="getStatusSeverity(req.status)" styleClass="font-bold text-[10px] uppercase px-3"></p-tag>
                                </div>

                                <div class="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <h4 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 pb-2 border-b border-gray-50 dark:border-gray-700 flex items-center gap-2">
                                        <i class="pi pi-list text-indigo-500"></i>
                                        Resumen de Servicios
                                    </h4>
                                    <div class="space-y-2">
                                        @for (s of req.services; track s.serviceId) {
                                            <div class="flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                                <span class="text-sm font-bold text-gray-700 dark:text-gray-200">{{ s.name }}</span>
                                                <span class="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">{{ s.price | usdCurrency }}</span>
                                            </div>
                                        }
                                    </div>
                                    <div class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
                                        <div class="flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase">
                                            <span>Subtotal Servicios</span>
                                            <span>{{ (req.totalAmount - req.deliveryFee) | usdCurrency }}</span>
                                        </div>
                                        <div class="flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase">
                                            <span>Recargo Delivery</span>
                                            <span>{{ req.deliveryFee | usdCurrency }}</span>
                                        </div>
                                        <div class="flex justify-between items-center pt-2">
                                            <span class="text-sm font-black text-gray-900 dark:text-white uppercase">Monto Total</span>
                                            <span class="text-2xl font-black text-indigo-600">{{ req.totalAmount | usdCurrency }}</span>
                                        </div>
                                    </div>
                                </div>

                                @if (req.status === 'REJECTED' && req.cancellationReason) {
                                    <div class="bg-red-50 dark:bg-red-900/20 p-5 rounded-xl border border-red-200 dark:border-red-800 shadow-sm">
                                        <h4 class="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <i class="pi pi-exclamation-triangle"></i>
                                            Nota del Supervisor
                                        </h4>
                                        <p class="text-sm font-bold text-red-700 dark:text-red-300 italic m-0">"{{ req.cancellationReason }}"</p>
                                    </div>
                                }

                                <div class="space-y-3">
                                    <h4 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <i class="pi pi-map-marker text-red-500"></i>
                                        Punto de Recogida
                                    </h4>
                                    <div id="clientMap" class="h-48 w-full rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden pointer-events-none"></div>
                                    <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <p class="text-xs font-medium text-gray-600 dark:text-gray-400 m-0 italic text-center">"{{ req.address }}"</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                }
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
        }
    `]
})
export class MyWashRequestsComponent implements OnInit, OnDestroy {
    private washRequestService = inject(WashRequestService);
    private messageService = inject(MessageService);
    private wsService = inject(WebSocketService);

    requests = signal<DeliveryRequest[]>([]);
    loading = signal(true);
    displayDetail = false;
    selectedRequest = signal<DeliveryRequest | null>(null);

    private map?: L.Map;

    ngOnInit() {
        this.loadRequests();
        this.setupSocket();
    }

    ngOnDestroy() {
        this.cleanupMap();
    }

    loadRequests() {
        this.loading.set(true);
        this.washRequestService.getMyRequests().subscribe({
            next: (data) => {
                this.requests.set(data);
                this.loading.set(false);
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar tus solicitudes' });
                this.loading.set(false);
            }
        });
    }

    setupSocket() {
        this.wsService.listen<any>('delivery-requests:updated').subscribe((updated) => {
            const current = this.requests();
            const index = current.findIndex(r => r.id === updated.id);
            if (index !== -1) {
                const newList = [...current];
                newList[index] = updated;
                this.requests.set(newList);

                if (this.selectedRequest()?.id === updated.id) {
                    this.selectedRequest.set(updated);
                }

                this.messageService.add({
                    severity: updated.status === 'ACCEPTED' ? 'success' : 'warn',
                    summary: 'Estado de Solicitud',
                    detail: `Tu solicitud para ${updated.vehicle.plate} ha sido ${updated.status}.`
                });
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
            case 'CANCELLED': return 'danger';
            default: return 'secondary';
        }
    }

    viewDetail(request: DeliveryRequest) {
        this.selectedRequest.set(request);
        this.displayDetail = true;
        setTimeout(() => this.initMap(), 100);
    }

    initMap() {
        const req = this.selectedRequest();
        if (!req) return;
        this.cleanupMap();

        this.map = L.map('clientMap', {
            zoomControl: false,
            attributionControl: false
        }).setView([req.latitude, req.longitude], 16);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
        L.marker([req.latitude, req.longitude]).addTo(this.map);
    }

    cleanupMap() {
        if (this.map) {
            this.map.remove();
            this.map = undefined;
        }
    }
}
