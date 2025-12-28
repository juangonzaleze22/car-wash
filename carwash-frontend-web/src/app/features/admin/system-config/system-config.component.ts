import { Component, OnInit, inject, signal, effect, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ConfigService } from '../../../core/services/config.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-system-config',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    CardModule,
    InputTextModule,
    InputTextareaModule,
    ButtonModule,
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <div class="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] p-4 lg:p-8">
      <!-- Header Section -->
      <div class="max-w-7xl mx-auto mb-10">
        <div class="relative overflow-hidden bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700">
          <div class="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl"></div>
          <div class="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div class="flex items-center gap-5">
              <div class="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-none">
                <i class="pi pi-sliders-h text-2xl text-white"></i>
              </div>
              <div>
                <h1 class="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Configuración del Centro</h1>
                <p class="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-2 mt-1">
                  <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Panel administrativo de parámetros operativos
                </p>
              </div>
            </div>
            <div class="flex gap-3">
              <div class="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center gap-3">
                <i class="pi pi-shield text-blue-600 dark:text-blue-400"></i>
                <span class="text-sm font-bold text-blue-700 dark:text-blue-300">Modo Administrador</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        <!-- Left Side: Operations -->
        <div class="xl:col-span-1 space-y-8">
          <!-- Delivery Fee Card -->
          <div class="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden transition-all hover:shadow-xl">
            <div class="p-6 border-b border-gray-50 dark:border-gray-700 flex items-center gap-3 bg-gray-50/50 dark:bg-gray-900/30">
              <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <i class="pi pi-truck"></i>
              </div>
              <h3 class="font-bold text-gray-800 dark:text-white">Logística & Delivery</h3>
            </div>
            <div class="p-8 space-y-6">
              <p class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Establece el recargo base que se aplicará a todas las órdenes solicitadas a través de la aplicación móvil.
              </p>
              
              <div class="space-y-3">
                <label for="deliveryFee" class="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Tarifa de Servicio (USD)</label>
                <div class="relative group">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                    <span class="font-bold font-mono">$</span>
                  </div>
                  <input 
                    id="deliveryFee" 
                    type="number" 
                    [(ngModel)]="deliveryFeeValue" 
                    class="w-full pl-10 pr-4 py-4 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-bold text-xl rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 outline-none transition-all shadow-inner"
                    placeholder="0.00"
                    step="0.01">
                </div>
              </div>

              <p-button 
                label="Actualizar Tarifas" 
                icon="pi pi-check" 
                (onClick)="saveDeliveryFee()"
                [loading]="loading()"
                styleClass="w-full py-4 font-bold shadow-lg shadow-blue-200 dark:shadow-none rounded-2xl bg-blue-600 hover:bg-blue-700 border-none transition-all transform active:scale-[0.98]">
              </p-button>
            </div>
          </div>

          <!-- Quick Info/Status -->
          <div class="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
            <div class="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                <i class="pi pi-info-circle text-[180px]"></i>
            </div>
            <div class="relative z-10 space-y-4">
                <h4 class="font-bold text-xl flex items-center gap-2">
                    <i class="pi pi-lightbulb"></i>
                    Dato Técnico
                </h4>
                <p class="text-indigo-100 text-sm leading-relaxed opacity-90">
                    Las coordenadas del local se utilizan para calcular dinámicamente el radio de cobertura y la viabilidad de los servicios a domicilio.
                </p>
            </div>
          </div>
        </div>

        <!-- Right Side: Location (Larger) -->
        <div class="xl:col-span-2">
          <div class="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden h-full flex flex-col transition-all hover:shadow-xl">
            <div class="p-6 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/30">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <i class="pi pi-map-marker"></i>
                </div>
                <h3 class="font-bold text-gray-800 dark:text-white">Ubicación de Sede</h3>
              </div>
              <div class="flex items-center gap-2 px-3 py-1 bg-white dark:bg-gray-900 rounded-full border border-gray-100 dark:border-gray-700 shadow-sm">
                <div class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span class="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Live Map Sync</span>
              </div>
            </div>

            <div class="p-8 flex flex-col flex-1 gap-8">
              <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
                <!-- Inputs Section -->
                <div class="lg:col-span-5 space-y-6 flex flex-col justify-between">
                  <div class="space-y-6">
                    <div class="space-y-3">
                        <label class="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Dirección Oficial</label>
                        <textarea 
                            pInputTextarea 
                            [(ngModel)]="localAddress" 
                            rows="4"
                            placeholder="Ej: Av. Principal, Mezzanina 2, Local 12..."
                            class="w-full p-4 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white rounded-2xl border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-800 outline-none transition-all shadow-inner resize-none font-medium"></textarea>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-2">
                            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Latitud</label>
                            <div class="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-300 font-mono">
                                {{ localLat().toFixed(6) }}
                            </div>
                        </div>
                        <div class="space-y-2">
                            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Longitud</label>
                            <div class="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-300 font-mono">
                                {{ localLng().toFixed(6) }}
                            </div>
                        </div>
                    </div>
                  </div>

                  <p-button 
                    label="Guardar Configuración Física" 
                    icon="pi pi-save" 
                    (onClick)="saveLocation()"
                    [loading]="loadingLocation()"
                    styleClass="w-full py-4 font-bold shadow-lg shadow-indigo-200 dark:shadow-none rounded-2xl bg-indigo-600 hover:bg-indigo-700 border-none transition-all transform active:scale-[0.98]">
                  </p-button>
                </div>

                <!-- Map Section -->
                <div class="lg:col-span-7 flex flex-col gap-3">
                  <div class="relative flex-1 min-h-[350px] group rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-gray-800">
                    <div id="config-map" class="absolute inset-0 z-0"></div>
                    <div class="absolute bottom-4 left-4 right-4 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-xl pointer-events-none transform translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <p class="text-[11px] font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2">
                            <i class="pi pi-info-circle text-blue-500"></i>
                            PIN INTERACTIVO: Arrastra el marcador o haz clic para precisar.
                        </p>
                    </div>
                  </div>
                  <div class="flex justify-between items-center px-1">
                      <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                          <i class="pi pi-globe text-blue-400"></i>
                          Leaflet Precision Engine
                      </p>
                      <button 
                        (click)="getCurrentLocation()" 
                        class="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 transition-colors">
                          <i class="pi pi-compass"></i>
                          RE-DETECTAR GPS
                      </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <p-toast></p-toast>
  `
})
export class SystemConfigComponent implements OnInit, AfterViewInit, OnDestroy {
  private configService = inject(ConfigService);
  private messageService = inject(MessageService);

  deliveryFeeValue: number = 0;
  localAddress: string = '';
  localLat = signal<number>(0);
  localLng = signal<number>(0);

  loading = signal(false);
  loadingLocation = signal(false);
  detectingLocation = signal(false);

  private map?: L.Map;
  private marker?: L.Marker;

  constructor() {
    effect(() => {
      const lat = this.localLat();
      const lng = this.localLng();
      if (this.map && this.marker && lat !== 0 && lng !== 0) {
        const pos = L.latLng(lat, lng);
        this.map.setView(pos, 15);
        this.marker.setLatLng(pos);
      }
    });
  }

  ngOnInit() {
    this.loadConfigs();
  }

  ngAfterViewInit() {
    this.initMap();
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  loadConfigs() {
    this.configService.getConfigs().subscribe({
      next: (configs: any[]) => {
        const feeConfig = configs.find(c => c.key === 'DELIVERY_FEE');
        const addrConfig = configs.find(c => c.key === 'LOCAL_ADDRESS');
        const latConfig = configs.find(c => c.key === 'LOCAL_LATITUDE');
        const lngConfig = configs.find(c => c.key === 'LOCAL_LONGITUDE');

        if (feeConfig) this.deliveryFeeValue = parseFloat(feeConfig.value);
        if (addrConfig) this.localAddress = addrConfig.value;
        if (latConfig) this.localLat.set(parseFloat(latConfig.value));
        if (lngConfig) this.localLng.set(parseFloat(lngConfig.value));

        // Siempre intentar obtener ubicación actual al cargar según requerimiento del usuario
        this.getCurrentLocation();
        this.updateMapPosition();
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las configuraciones'
        });
      }
    });
  }

  private initMap() {
    const lat = this.localLat() || 10.4806;
    const lng = this.localLng() || -66.9036;
    const initialPos: L.LatLngExpression = [lat, lng];

    this.map = L.map('config-map').setView(initialPos, 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.marker = L.marker(initialPos, {
      draggable: true
    }).addTo(this.map);

    this.marker.on('dragend', (event) => {
      const pos = event.target.getLatLng();
      this.localLat.set(pos.lat);
      this.localLng.set(pos.lng);
    });

    this.map.on('click', (event) => {
      const pos = event.latlng;
      this.localLat.set(pos.lat);
      this.localLng.set(pos.lng);
      if (this.marker) {
        this.marker.setLatLng(pos);
      }
    });

    // Asegurar que el mapa se renderice bien después de un breve delay
    setTimeout(() => {
      this.map?.invalidateSize();
    }, 300);
  }

  private updateMapPosition() {
    if (this.map && this.marker) {
      const pos = L.latLng(this.localLat(), this.localLng());
      this.marker.setLatLng(pos);
    }
  }

  getCurrentLocation() {
    if (!navigator.geolocation) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No compatible',
        detail: 'El navegador no soporta geolocalización'
      });
      return;
    }

    this.detectingLocation.set(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('Location success:', latitude, longitude);
        this.localLat.set(latitude);
        this.localLng.set(longitude);
        this.detectingLocation.set(false);
        this.messageService.add({
          severity: 'info',
          summary: 'Ubicación detectada',
          detail: 'Se ha centrado el mapa en tu posición actual.'
        });
      },
      (error) => {
        this.detectingLocation.set(false);
        console.error('Error getting location', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo obtener la ubicación actual. Verifica los permisos.'
        });
      },
      { enableHighAccuracy: true }
    );
  }

  saveDeliveryFee() {
    this.loading.set(true);
    this.configService.updateConfig('DELIVERY_FEE', {
      value: this.deliveryFeeValue.toString(),
      description: 'Costo base de delivery para solicitudes de lavado a domicilio'
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Configuración guardada',
          detail: 'El costo de delivery ha sido actualizado correctamente.'
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar la configuración'
        });
      }
    });
  }

  saveLocation() {
    this.loadingLocation.set(true);

    const requests = [
      this.configService.updateConfig('LOCAL_ADDRESS', { value: this.localAddress, description: 'Dirección física del negocio' }),
      this.configService.updateConfig('LOCAL_LATITUDE', { value: this.localLat().toString(), description: 'Latitud de ubicación del negocio' }),
      this.configService.updateConfig('LOCAL_LONGITUDE', { value: this.localLng().toString(), description: 'Longitud de ubicación del negocio' })
    ];

    import('rxjs').then(({ forkJoin }) => {
      forkJoin(requests).subscribe({
        next: (results: any[]) => {
          this.loadingLocation.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Ubicación guardada',
            detail: 'La ubicación del local ha sido actualizada correctamente.'
          });
        },
        error: () => {
          this.loadingLocation.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron guardar algunos parámetros de ubicación'
          });
        }
      });
    });
  }
}
