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
import { BrandService } from '../../../core/services/brand.service';
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
    <div class="p-4 min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <!-- Header Section -->
      <div class="mb-6">
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-black text-gray-900 dark:text-white mb-1 tracking-tight">Configuración del Sistema</h1>
              <p class="text-sm text-gray-500 dark:text-gray-400 font-medium tracking-tight">Administra los parámetros operativos del local</p>
            </div>
            <div class="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <i class="pi pi-shield text-blue-600 dark:text-blue-400 text-sm"></i>
              <span class="text-xs font-bold text-blue-700 dark:text-blue-300">Admin</span>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        <!-- Left Side: Configuration Cards -->
        <div class="xl:col-span-1 space-y-6">
          <!-- Visual Identity Card -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all">
            <div class="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 class="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <i class="pi pi-palette text-purple-500"></i>
                Identidad Visual
              </h3>
            </div>
            <div class="p-6 space-y-4">
              <!-- Business Name -->
              <div class="space-y-2">
                <label for="businessName" class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nombre del Local</label>
                <input 
                  id="businessName" 
                  type="text" 
                  [(ngModel)]="businessNameValue" 
                  class="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                  placeholder="Ej: CarWash Pro">
              </div>

              <!-- Logo Upload -->
              <div class="space-y-2">
                <label class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Logo Empresarial</label>
                <div class="flex flex-col items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-400 transition-colors cursor-pointer" (click)="logoInput.click()">
                  <input #logoInput type="file" (change)="onLogoSelected($event)" accept="image/*" class="hidden">
                  
                  @if (logoPreview()) {
                    <img [src]="logoPreview()" class="h-20 w-auto object-contain rounded-lg mb-2" alt="Logo Preview">
                  } @else if (brandService.businessLogo()) {
                    <img [src]="brandService.businessLogo()" class="h-20 w-auto object-contain rounded-lg mb-2" alt="Logo">
                  } @else {
                    <div class="h-20 w-20 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-2">
                      <i class="pi pi-image text-3xl text-gray-400"></i>
                    </div>
                  }
                  
                  <div class="text-center">
                    <span class="text-xs font-bold text-purple-600 dark:text-purple-400">Cambiar Logo</span>
                    <p class="text-[10px] text-gray-400 mt-1">PNG, JPG, SVG (Máx 2MB)</p>
                  </div>
                </div>
              </div>

              <p-button 
                label="Guardar Identidad" 
                icon="pi pi-save" 
                (onClick)="saveBranding()"
                [loading]="loadingBranding()"
                styleClass="w-full py-3 font-bold rounded-lg bg-purple-600 hover:bg-purple-700 border-none transition-all">
              </p-button>
            </div>
          </div>

          <!-- Delivery Fee Card -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all">
            <div class="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 class="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <i class="pi pi-truck text-blue-500"></i>
                Tarifa de Delivery
              </h3>
            </div>
            <div class="p-6 space-y-4">
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Establece el recargo que se aplicará a las órdenes a domicilio.
              </p>
              
              <div class="space-y-2">
                <label for="deliveryFee" class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tarifa (USD)</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <span class="font-bold">$</span>
                  </div>
                  <input 
                    id="deliveryFee" 
                    type="number" 
                    [(ngModel)]="deliveryFeeValue" 
                    class="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    placeholder="0.00"
                    step="0.01">
                </div>
              </div>

              <p-button 
                label="Actualizar Tarifa" 
                icon="pi pi-check" 
                (onClick)="saveDeliveryFee()"
                [loading]="loading()"
                styleClass="w-full py-3 font-bold rounded-lg bg-blue-600 hover:bg-blue-700 border-none transition-all">
              </p-button>
            </div>
          </div>
        </div>

        <!-- Right Side: Location -->
        <div class="xl:col-span-2">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden h-full flex flex-col hover:shadow-md transition-all">
            <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 class="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <i class="pi pi-map-marker text-indigo-500"></i>
                Ubicación del Local
              </h3>
              <button 
                (click)="getCurrentLocation()" 
                class="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 transition-colors">
                <i class="pi pi-compass"></i>
                Detectar GPS
              </button>
            </div>

            <div class="p-6 flex flex-col flex-1 gap-6">
              <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
                <!-- Inputs Section -->
                <div class="lg:col-span-5 space-y-4 flex flex-col justify-between">
                  <div class="space-y-4">
                    <div class="space-y-2">
                      <label class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dirección</label>
                      <textarea 
                        pInputTextarea 
                        [(ngModel)]="localAddress" 
                        rows="4"
                        placeholder="Av. Principal, Local 12..."
                        class="w-full p-3 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none"></textarea>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                      <div class="space-y-2">
                        <label class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Latitud</label>
                        <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-mono text-gray-700 dark:text-gray-300">
                          {{ localLat().toFixed(6) }}
                        </div>
                      </div>
                      <div class="space-y-2">
                        <label class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Longitud</label>
                        <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-mono text-gray-700 dark:text-gray-300">
                          {{ localLng().toFixed(6) }}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p-button 
                    label="Guardar Ubicación" 
                    icon="pi pi-save" 
                    (onClick)="saveLocation()"
                    [loading]="loadingLocation()"
                    styleClass="w-full py-3 font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 border-none transition-all">
                  </p-button>
                </div>

                <!-- Map Section -->
                <div class="lg:col-span-7 flex flex-col gap-3">
                  <div class="relative flex-1 min-h-[400px] rounded-lg overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
                    <div id="config-map" class="absolute inset-0 z-0"></div>
                  </div>
                  <p class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <i class="pi pi-info-circle text-blue-500"></i>
                    Arrastra el marcador o haz clic en el mapa para ajustar la ubicación
                  </p>
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
  loadingBranding = signal(false);
  detectingLocation = signal(false);

  businessNameValue: string = '';
  selectedLogoFile: File | null = null;
  logoPreview = signal<string | null>(null);

  brandService = inject(BrandService);

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

        const nameConfig = configs.find(c => c.key === 'BUSINESS_NAME');
        if (nameConfig) this.businessNameValue = nameConfig.value;

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

    const pinIcon = L.icon({
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/2776/2776067.png',
      iconSize: [38, 38],
      iconAnchor: [19, 38]
    });

    this.marker = L.marker(initialPos, {
      draggable: true,
      icon: pinIcon
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

  onLogoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        this.messageService.add({
          severity: 'error',
          summary: 'Archivo muy grande',
          detail: 'El logo no debe pesar más de 2MB'
        });
        return;
      }
      this.selectedLogoFile = file;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.logoPreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  saveBranding() {
    this.loadingBranding.set(true);
    const requests: any[] = [];

    if (this.businessNameValue !== this.brandService.businessName()) {
      requests.push(this.configService.updateConfig('BUSINESS_NAME', {
        value: this.businessNameValue,
        description: 'Nombre comercial del establecimiento'
      }));
    }

    if (this.selectedLogoFile) {
      requests.push(this.configService.uploadLogo(this.selectedLogoFile));
    }

    if (requests.length === 0) {
      this.loadingBranding.set(false);
      return;
    }

    import('rxjs').then(({ forkJoin }) => {
      forkJoin(requests).subscribe({
        next: () => {
          this.brandService.loadBranding(); // Recargar señales globales
          this.loadingBranding.set(false);
          this.selectedLogoFile = null;
          this.messageService.add({
            severity: 'success',
            summary: 'Identidad actualizada',
            detail: 'El nombre y logo se han guardado correctamente.'
          });
        },
        error: (err) => {
          this.loadingBranding.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar la identidad visual'
          });
        }
      });
    });
  }
}
