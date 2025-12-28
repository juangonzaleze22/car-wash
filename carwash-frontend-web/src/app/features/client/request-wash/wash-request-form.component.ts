import { Component, inject, signal, OnInit, AfterViewInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { ClientDashboardService } from '../../../core/services/client-dashboard.service';
import { WashRequestService } from '../../../core/services/wash-request.service';
import { ServiceService } from '../../../core/services/service.service';
import { VehicleService } from '../../../core/services/vehicle.service';
import { CategoryService } from '../../../core/services/category.service';
import { ClientLocationService, ClientLocation } from '../../../core/services/client-location.service';
import { ExchangeRateService } from '../../../core/services/exchange-rate.service';
import { ConfigService } from '../../../core/services/config.service';
import { UsdCurrencyPipe } from '../../../shared/pipes/usd-currency.pipe';
import { VesCurrencyPipe } from '../../../shared/pipes/ves-currency.pipe';
import * as L from 'leaflet';

@Component({
    selector: 'app-wash-request-form',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        CardModule,
        ButtonModule,
        DropdownModule,
        InputTextModule,
        InputTextareaModule,
        ToastModule,
        SkeletonModule,
        CheckboxModule,
        DialogModule,
        ConfirmDialogModule,
        UsdCurrencyPipe,
        VesCurrencyPipe
    ],
    providers: [MessageService, ConfirmationService, UsdCurrencyPipe, VesCurrencyPipe],
    template: `
        <div class="p-4 min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <div class="mb-6">
                <h1 class="text-2xl font-bold text-gray-800 dark:text-white mb-1">Solicitar Lavado a Domicilio</h1>
                <p class="text-sm text-gray-500 dark:text-gray-400">Marca tu ubicación y selecciona servicios personalizados</p>
            </div>
            
            <form [formGroup]="requestForm" (ngSubmit)="onSubmit()">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Form Section -->
                    <div class="flex flex-col gap-6">
                        <p-card header="Datos del Servicio">
                            <div class="flex flex-col gap-4">
                                <div class="flex flex-col gap-2">
                                    <div class="flex justify-between items-center">
                                        <label for="vehicle" class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Selecciona tu Vehículo</label>
                                        <button 
                                            pButton 
                                            type="button" 
                                            icon="pi pi-plus" 
                                            label="Nuevo Auto" 
                                            class="p-button-text p-button-sm p-0 h-auto text-blue-600 font-bold text-[10px] uppercase tracking-wider"
                                            (click)="showVehicleDialog.set(true)">
                                        </button>
                                    </div>
                                    <p-dropdown 
                                        [options]="vehicles()" 
                                        formControlName="vehicleId" 
                                        optionLabel="plate" 
                                        optionValue="id"
                                        placeholder="Selecciona un vehículo"
                                        (onChange)="onVehicleChange($event.value)"
                                        styleClass="w-full">
                                        <ng-template let-vehicle pTemplate="item">
                                            <div class="flex flex-col">
                                                <span class="font-bold">{{ vehicle.plate }}</span>
                                                <span class="text-xs text-gray-500">{{ vehicle.categoryRef?.name || vehicle.category }}</span>
                                            </div>
                                        </ng-template>
                                    </p-dropdown>
                                </div>

                                <div class="flex flex-col gap-2">
                                    <label class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Servicios Disponibles</label>
                                    <div class="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded-lg">
                                        @for (service of filteredServices(); track service.id) {
                                            <div 
                                                class="flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer"
                                                [ngClass]="{
                                                    'border-blue-500 bg-blue-50 dark:bg-blue-900/20': isServiceSelected(service.id)
                                                }"
                                                (click)="toggleService(service)">
                                                <div class="flex items-center gap-3">
                                                    <p-checkbox 
                                                        [binary]="true" 
                                                        [ngModel]="isServiceSelected(service.id)" 
                                                        [ngModelOptions]="{standalone: true}"></p-checkbox>
                                                    <div class="flex flex-col">
                                                        <span class="font-medium text-sm">{{ service.name }}</span>
                                                        <span class="text-xs text-gray-500">{{ service.description }}</span>
                                                    </div>
                                                </div>
                                                <div class="flex flex-col items-end">
                                                    <span class="font-bold text-blue-600">{{ service.price | usdCurrency }}</span>
                                                    <span class="text-xs text-gray-500">{{ service.price * exchangeRate() | vesCurrency }}</span>
                                                </div>
                                            </div>
                                        } @empty {
                                            <p class="text-center text-gray-500 p-4">Selecciona un vehículo para ver los servicios</p>
                                        }
                                    </div>
                                </div>

                                <div class="flex flex-col gap-2">
                                    <label for="notes" class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notas Adicionales (Opcional)</label>
                                    <textarea id="notes" pInputTextarea formControlName="notes" rows="3" placeholder="Ej: El auto está en el garage del fondo"></textarea>
                                </div>

                                <div class="mt-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/50 shadow-sm overflow-hidden relative">
                                    <div class="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl"></div>
                                    
                                    <div class="flex flex-col gap-3 relative z-10">
                                        <div class="flex justify-between items-center">
                                            <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                                <i class="pi pi-briefcase text-[10px]"></i>
                                                <span class="text-[11px] font-bold uppercase tracking-widest">Servicios</span>
                                            </div>
                                            <span class="font-semibold text-gray-700 dark:text-gray-200">{{ (totalAmount() - deliveryFee()) | usdCurrency }}</span>
                                        </div>
                                        
                                        <div class="flex justify-between items-center">
                                            <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                                <i class="pi pi-map-marker text-[10px]"></i>
                                                <span class="text-[11px] font-bold uppercase tracking-widest">Tarifa de Envío</span>
                                            </div>
                                            <span class="font-semibold text-gray-700 dark:text-gray-200">{{ deliveryFee() | usdCurrency }}</span>
                                        </div>

                                        <div class="my-1 border-t border-blue-200/50 dark:border-blue-700/30"></div>
                                        
                                        <div class="flex justify-between items-end pt-1">
                                            <div class="flex flex-col gap-0.5">
                                                <span class="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Total Estimado</span>
                                                <div class="flex items-center gap-1.5 text-xs font-medium text-gray-400 dark:text-gray-500">
                                                    <i class="pi pi-info-circle text-[10px]"></i>
                                                    <span>Incluye impuestos</span>
                                                </div>
                                            </div>
                                            <div class="flex flex-col items-end">
                                                <div class="flex items-baseline gap-1">
                                                    <span class="text-3xl font-black text-indigo-600 dark:text-indigo-400 leading-none">{{ totalAmount() | usdCurrency }}</span>
                                                </div>
                                                <div class="mt-1 flex items-center gap-1 px-2 py-0.5 bg-white/60 dark:bg-black/20 rounded-full border border-indigo-100/50 dark:border-indigo-900/30">
                                                    <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400">{{ totalAmount() * exchangeRate() | vesCurrency }}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </p-card>
                    </div>

                    <!-- Map Section -->
                    <div class="flex flex-col gap-6">
                        <p-card header="Ubicación de Lavado">
                            <div class="flex flex-col gap-4">
                                <div class="flex flex-col gap-2">
                                    <label for="savedLocation" class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ubicaciones Guardadas</label>
                                    <p-dropdown 
                                        [options]="savedLocations()" 
                                        [(ngModel)]="selectedLocationIdValue"
                                        [ngModelOptions]="{standalone: true}"
                                        optionLabel="name" 
                                        optionValue="id"
                                        placeholder="Selecciona una ubicación guardada"
                                        (onChange)="onLocationSelect($event.value)"
                                        styleClass="w-full">
                                        <ng-template pTemplate="empty">
                                            <span class="text-xs p-2">No tienes ubicaciones guardadas</span>
                                        </ng-template>
                                    </p-dropdown>
                                </div>

                                <div class="flex flex-col gap-2">
                                    <label for="address" class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dirección Completa</label>
                                    <input id="address" pInputText formControlName="address" placeholder="Av. Principal, Edif. X, Apto Y">
                                </div>

                                <div class="flex items-center gap-2 mt-1">
                                    <p-checkbox formControlName="saveLocation" [binary]="true" label="Guardar esta ubicación"></p-checkbox>
                                    <input 
                                        *ngIf="requestForm.get('saveLocation')?.value"
                                        pInputText 
                                        formControlName="locationName" 
                                        placeholder="Nombre (ej: Casa)"
                                        class="p-inputtext-sm flex-1 ml-2">
                                </div>
                                
                                <div class="relative">
                                    <div id="map" class="h-80 w-full rounded-lg shadow-inner z-10 border border-gray-200 dark:border-gray-700"></div>
                                    
                                    <!-- Botón de mi ubicación -->
                                    <button 
                                        type="button"
                                        (click)="tryGeolocation()"
                                        class="absolute top-2 right-2 z-[1000] bg-white dark:bg-gray-800 p-2 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600 flex items-center justify-center w-10 h-10"
                                        title="Centrar en mi ubicación">
                                        <i class="pi pi-map-marker text-blue-600 dark:text-blue-400 text-lg"></i>
                                    </button>

                                    <div class="absolute bottom-2 right-2 z-20 bg-white/90 dark:bg-black/80 px-2 py-1 rounded text-[10px] text-gray-500">
                                        Haz clic en el mapa para marcar tu ubicación
                                    </div>
                                </div>
                                
                                <p class="text-xs text-gray-500 italic mt-2">
                                    <i class="pi pi-info-circle mr-1"></i>
                                    Por favor, marca en el mapa el punto exacto donde se encuentra el vehículo.
                                </p>
                            </div>
                        </p-card>

                        <div class="flex gap-4 mt-4">
                            <button 
                                pButton 
                                type="button"
                                label="Cancelar" 
                                icon="pi pi-times"
                                class="p-button-outlined p-button-secondary flex-1"
                                (click)="onCancel()"></button>
                            <button 
                                pButton 
                                type="submit"
                                label="Enviar Solicitud" 
                                icon="pi pi-send"
                                class="flex-1 p-button-primary bg-blue-600 border-none hover:bg-blue-700"
                                [loading]="loading()"
                                [disabled]="!isFormValid()"></button>
                        </div>
                    </div>
                </div>
            </form>

            <!-- New Vehicle Dialog -->
            <p-dialog 
                header="Registrar Nuevo Vehículo" 
                [(visible)]="showVehicleDialog" 
                [modal]="true" 
                [style]="{width: '400px'}"
                styleClass="dark:bg-gray-800 border dark:border-gray-700 rounded-xl overflow-hidden shadow-2xl">
                <form [formGroup]="newVehicleForm" (ngSubmit)="onRegisterVehicle()" class="flex flex-col gap-4 py-4">
                    <div class="flex flex-col gap-2">
                        <label for="plate" class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Placa</label>
                        <input id="plate" pInputText formControlName="plate" placeholder="ABC-123" class="w-full">
                    </div>
                    
                    <div class="flex flex-col gap-2">
                        <label for="categoryId" class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Categoría</label>
                        <p-dropdown 
                            id="categoryId"
                            [options]="categories()" 
                            formControlName="categoryId" 
                            optionLabel="name" 
                            optionValue="id"
                            placeholder="Selecciona categoría"
                            styleClass="w-full">
                        </p-dropdown>
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="vNotes" class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notas (Opcional)</label>
                        <textarea id="vNotes" pInputTextarea formControlName="notes" rows="2" placeholder="Ej: Color Gris, Sedan" class="w-full"></textarea>
                    </div>

                    <div class="flex gap-2 mt-4">
                        <button 
                            pButton 
                            type="button" 
                            label="Cancelar" 
                            class="p-button-outlined p-button-secondary flex-1"
                            (click)="showVehicleDialog.set(false)"></button>
                        <button 
                            pButton 
                            type="submit" 
                            label="Registrar" 
                            class="flex-1 p-button-primary"
                            [loading]="registeringVehicle()"
                            [disabled]="newVehicleForm.invalid"></button>
                    </div>
                </form>
            </p-dialog>

            <!-- Confirmation Dialog -->
            <p-confirmDialog [style]="{width: '450px'}"></p-confirmDialog>

            <!-- Success Dialog -->
            <p-dialog 
                header="¡Solicitud Exitosa!" 
                [(visible)]="showSuccessDialog" 
                [modal]="true" 
                [closable]="false"
                [style]="{width: '400px'}"
                styleClass="rounded-xl shadow-2xl">
                <div class="flex flex-col items-center gap-6 py-6 text-center">
                    <div class="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <i class="pi pi-check-circle text-5xl text-green-600"></i>
                    </div>
                    <div class="flex flex-col gap-2">
                        <h2 class="text-xl font-bold text-gray-800 dark:text-white">Orden Procesada</h2>
                        <p class="text-gray-500 dark:text-gray-400">
                            Tu solicitud de lavado ha sido enviada correctamente. Un supervisor la revisará en breve.
                        </p>
                    </div>
                    <button 
                        pButton 
                        type="button" 
                        label="Volver al Dashboard" 
                        icon="pi pi-home" 
                        class="p-button-success w-full"
                        (click)="goToDashboard()"></button>
                </div>
            </p-dialog>
        </div>
    `,
    styles: [`
        :host ::ng-deep .p-card-body {
            padding: 1.5rem;
        }
        #map {
            cursor: crosshair;
        }
    `]
})
export class WashRequestFormComponent implements OnInit, AfterViewInit, OnDestroy {
    private fb = inject(FormBuilder);
    private dashboardService = inject(ClientDashboardService);
    private washRequestService = inject(WashRequestService);
    private serviceService = inject(ServiceService);
    private vehicleService = inject(VehicleService);
    private categoryService = inject(CategoryService);
    private locationService = inject(ClientLocationService);
    private exchangeRateService = inject(ExchangeRateService);
    private configService = inject(ConfigService);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);
    private router = inject(Router);

    requestForm = this.fb.group({
        vehicleId: ['', Validators.required],
        address: [''],
        notes: [''],
        saveLocation: [false],
        locationName: [''],
    });

    newVehicleForm = this.fb.group({
        plate: ['', [Validators.required, Validators.minLength(3)]],
        categoryId: ['', Validators.required],
        notes: [''],
    });

    vehicles = signal<any[]>([]);
    savedLocations = signal<ClientLocation[]>([]);
    selectedLocationIdValue: string | null = null;
    availableServices = signal<any[]>([]);
    filteredServices = signal<any[]>([]);
    selectedServices = signal<any[]>([]);
    totalAmount = signal<number>(0);
    exchangeRate = signal<number>(0);
    deliveryFee = signal<number>(0);
    loading = signal(false);

    // New Vehicle Dialog
    showVehicleDialog = signal(false);
    showSuccessDialog = signal(false);
    categories = signal<any[]>([]);
    registeringVehicle = signal(false);

    private map = signal<L.Map | undefined>(undefined);
    private marker?: L.Marker;
    private location = signal<{ lat: number, lng: number } | null>(null);

    constructor() {
        // Efecto reactivo para centrar el mapa cuando tengamos AMBOS: la ubicación y la instancia del mapa
        effect(() => {
            const loc = this.location();
            const mapInstance = this.map();

            if (loc && mapInstance) {
                console.log('Centrando mapa reactivamente:', loc);
                mapInstance.setView([loc.lat, loc.lng], 16);
                // No actualizamos el signal desde aquí para evitar ciclos
                this.setMarker(loc.lat, loc.lng, false);
                setTimeout(() => mapInstance.invalidateSize(), 200);
            }
        }, { allowSignalWrites: true });
    }

    ngOnInit() {
        this.loadInitialData();
        this.loadSavedLocations();
        this.tryGeolocation(); // Empezar a buscar ubicación lo antes posible
    }

    ngAfterViewInit() {
        this.initMap();
    }

    ngOnDestroy() {
        this.map()?.remove();
    }

    loadInitialData() {
        this.dashboardService.getDashboard().subscribe({
            next: (data) => {
                this.vehicles.set(data.vehicles);
            },
            error: (err) => console.error('Error loading vehicles', err)
        });

        this.serviceService.getPublicServices().subscribe({
            next: (services) => {
                this.availableServices.set(services);
            },
            error: (err) => console.error('Error loading services', err)
        });

        this.exchangeRateService.getUSDExchangeRate().subscribe({
            next: (res) => {
                if (res.success) {
                    this.exchangeRate.set(res.data.average);
                }
            },
            error: (err) => console.error('Error loading exchange rate', err)
        });

        this.categoryService.getCategories(true).subscribe({
            next: (cats) => this.categories.set(cats),
            error: (err) => console.error('Error loading categories', err)
        });

        this.configService.getDeliveryFee().subscribe({
            next: (res) => {
                this.deliveryFee.set(res.deliveryFee);
                this.calculateTotal(); // Recalcular con el fee inicial
            },
            error: (err) => console.error('Error loading delivery fee', err)
        });
    }

    loadSavedLocations() {
        this.locationService.getLocations().subscribe({
            next: (locs) => this.savedLocations.set(locs),
            error: (err) => console.error('Error loading saved locations', err)
        });
    }

    onLocationSelect(locationId: string) {
        const loc = this.savedLocations().find(l => l.id === locationId);
        if (loc) {
            this.requestForm.patchValue({
                address: loc.address
            });
            const lat = Number(loc.latitude);
            const lng = Number(loc.longitude);
            // Actualizamos el signal para que el effect mueva el mapa
            this.setMarker(lat, lng, true);
        }
    }

    initMap() {
        // Coordenadas por defecto (Caracas) - Solo se usan si no hay ubicación detectada
        let lat = 10.4806;
        let lng = -66.9036;

        const currentLoc = this.location();
        if (currentLoc) {
            lat = currentLoc.lat;
            lng = currentLoc.lng;
        }

        const m = L.map('map').setView([lat, lng], currentLoc ? 16 : 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(m);

        m.on('click', (e: L.LeafletMouseEvent) => {
            this.setMarker(e.latlng.lat, e.latlng.lng, true);
        });

        if (currentLoc) {
            this.setMarker(currentLoc.lat, currentLoc.lng, false);
        }

        // Guardar la instancia del mapa en el signal para disparar el efecto
        this.map.set(m);
    }

    tryGeolocation() {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                // Al setear el signal, el effect se encargará de mover el mapa si ya existe
                this.location.set({ lat: latitude, lng: longitude });
            },
            (error) => {
                console.warn('Geolocation failed:', error);
                if (error.code === error.PERMISSION_DENIED) {
                    console.log('Permiso de ubicación denegado por el usuario.');
                } else {
                    this.messageService.add({
                        severity: 'info',
                        summary: 'Ubicación',
                        detail: 'No pudimos obtener tu ubicación. Por favor usa el botón de la mira o selecciónala manualmente.'
                    });
                }
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }

    setMarker(lat: number, lng: number, updateSignal: boolean = true) {
        const mInstance = this.map();
        if (!mInstance) return;

        if (this.marker) {
            this.marker.setLatLng([lat, lng]);
        } else {
            this.marker = L.marker([lat, lng], { draggable: true }).addTo(mInstance);
            this.marker.on('dragend', (e) => {
                const pos = e.target.getLatLng();
                this.location.set({ lat: pos.lat, lng: pos.lng });
            });
        }

        if (updateSignal) {
            this.location.set({ lat, lng });
        }
    }

    onVehicleChange(vehicleId: string) {
        const vehicle = this.vehicles().find(v => v.id === vehicleId);
        if (!vehicle) return;

        const categoryId = vehicle.categoryId || vehicle.categoryRef?.id;

        // Filtrar servicios por categoría del vehículo
        const filtered = this.availableServices().filter(s => {
            return s.categoryTargetId === categoryId || s.categoryTarget === 'TODOS' || s.categoryTarget === vehicle.category;
        });
        this.filteredServices.set(filtered);

        // Limpiar seleccionados al cambiar de vehículo
        this.selectedServices.set([]);
        this.calculateTotal();
    }

    toggleService(service: any) {
        const current = this.selectedServices();
        const index = current.findIndex(s => s.id === service.id);

        if (index > -1) {
            current.splice(index, 1);
        } else {
            current.push(service);
        }

        this.selectedServices.set([...current]);
        this.calculateTotal();
    }

    isServiceSelected(serviceId: string): boolean {
        return this.selectedServices().some(s => s.id === serviceId);
    }

    calculateTotal() {
        const servicesTotal = this.selectedServices().reduce((sum, s) => sum + Number(s.price), 0);
        this.totalAmount.set(servicesTotal + this.deliveryFee());
    }

    isFormValid(): boolean {
        return this.requestForm.valid &&
            this.selectedServices().length > 0 &&
            this.location() !== null;
    }

    onSubmit() {
        if (!this.isFormValid()) return;

        this.confirmationService.confirm({
            message: `¿Estás seguro de que deseas enviar esta solicitud por un total de ${this.usdPipe.transform(this.totalAmount())}?`,
            header: 'Confirmar Solicitud',
            icon: 'pi pi-exclamation-circle',
            acceptLabel: 'Sí, enviar',
            rejectLabel: 'Cancelar',
            acceptButtonStyleClass: 'p-button-primary',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => {
                this.performSubmit();
            }
        });
    }

    private usdPipe = inject(UsdCurrencyPipe);

    private performSubmit() {
        this.loading.set(true);
        const formValue = this.requestForm.value;
        const loc = this.location()!;

        const data = {
            vehicleId: formValue.vehicleId!,
            address: formValue.address!,
            latitude: loc.lat,
            longitude: loc.lng,
            services: this.selectedServices().map(s => ({
                serviceId: s.id,
                name: s.name,
                price: Number(s.price)
            })),
            totalAmount: this.totalAmount(),
            notes: formValue.notes || undefined
        };

        this.washRequestService.createRequest(data).subscribe({
            next: () => {
                // Si el usuario marcó guardar ubicación, la guardamos
                if (formValue.saveLocation && formValue.locationName) {
                    this.locationService.saveLocation({
                        name: formValue.locationName,
                        address: formValue.address!,
                        latitude: data.latitude,
                        longitude: data.longitude
                    }).subscribe();
                }

                this.loading.set(false);
                this.showSuccessDialog.set(true);
            },
            error: (err) => {
                this.loading.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: err.error?.error || 'No se pudo enviar la solicitud'
                });
            }
        });
    }

    goToDashboard() {
        this.showSuccessDialog.set(false);
        this.router.navigate(['/client/dashboard']);
    }

    onCancel() {
        this.router.navigate(['/client/dashboard']);
    }

    onRegisterVehicle() {
        if (this.newVehicleForm.invalid) return;

        this.registeringVehicle.set(true);
        const formValue = this.newVehicleForm.value;

        const data = {
            plate: formValue.plate!.toUpperCase().trim(),
            categoryId: formValue.categoryId!,
            notes: formValue.notes || undefined
        };

        this.vehicleService.createClientVehicle(data as any).subscribe({
            next: (newV) => {
                this.registeringVehicle.set(false);
                this.showVehicleDialog.set(false);
                this.newVehicleForm.reset();
                this.messageService.add({
                    severity: 'success',
                    summary: 'Vehículo Registrado',
                    detail: `El vehículo ${newV.plate} ha sido registrado.`
                });

                // Recargar vehículos y seleccionar el nuevo
                this.dashboardService.getDashboard().subscribe((data) => {
                    this.vehicles.set(data.vehicles);
                    this.requestForm.patchValue({ vehicleId: newV.id });
                    this.onVehicleChange(newV.id);
                });
            },
            error: (err) => {
                this.registeringVehicle.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: err.error?.error || 'No se pudo registrar el vehículo'
                });
            }
        });
    }
}
