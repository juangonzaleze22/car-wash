import { Component, inject, signal, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { ToastModule } from 'primeng/toast';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { FileUploadModule } from 'primeng/fileupload';
import { InputMaskModule } from 'primeng/inputmask';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { VehicleService } from '../../../core/services/vehicle.service';
import { CategoryService } from '../../../core/services/category.service';
import { ExchangeRateService } from '../../../core/services/exchange-rate.service';
import { VesCurrencyPipe } from '../../../shared/pipes/ves-currency.pipe';
import { UsdCurrencyPipe } from '../../../shared/pipes/usd-currency.pipe';

@Component({
    selector: 'app-check-in',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        CardModule,
        InputTextModule,
        ButtonModule,
        DropdownModule,
        CheckboxModule,
        InputGroupModule,
        InputGroupAddonModule,
        ToastModule,
        AutoCompleteModule,
        FileUploadModule,
        InputMaskModule,
        VesCurrencyPipe,
        UsdCurrencyPipe
    ],
    providers: [MessageService],
    templateUrl: './check-in.component.html',
    styleUrl: './check-in.component.css'
})
export class CheckInComponent implements OnInit, OnDestroy {
    private fb = inject(FormBuilder);
    private http = inject(HttpClient);
    private messageService = inject(MessageService);
    private authService = inject(AuthService);
    private userService = inject(UserService);
    private vehicleService = inject(VehicleService);
    private categoryService = inject(CategoryService);
    private exchangeRateService = inject(ExchangeRateService);

    vehicleCategories = signal<any[]>([]);

    availableServices = signal<any[]>([]);
    vehicleSuggestions = signal<any[]>([]);
    selectedVehicle = signal<any | null>(null);
    clientSuggestions = signal<any[]>([]);
    selectedClient = signal<any | null>(null);
    uploadedFiles = signal<File[]>([]);
    washers = signal<any[]>([]);
    private imagePreviewUrls: Map<File, string> = new Map();
    @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

    checkInForm = this.fb.group({
        plate: ['', [Validators.required, Validators.minLength(3)]],
        clientPhone: [''],
        clientName: [''],
        categoryId: ['', Validators.required], // Changed to categoryId
        services: [[] as string[], Validators.required],
        assignedWasherId: ['']
    });

    loading = signal(false);
    filteredServices = signal<any[]>([]);
    exchangeRate = signal<number>(0); // Tasa de cambio USD a VES
    loadingExchangeRate = signal(true);

    ngOnInit() {
        // Cargar tasa de cambio
        this.loadExchangeRate();
        
        this.http.get<any[]>('http://localhost:3000/api/services').subscribe({
            next: (services) => {
                this.availableServices.set(services);
                // Filtrar servicios después de cargar categorías
                const categoryId = this.checkInForm.value.categoryId;
                if (categoryId) {
                    this.filterServicesByCategory(categoryId);
                }
            },
            error: (err) => console.error('Error loading services', err)
        });

        this.userService.getWashers().subscribe({
            next: (washers) => this.washers.set(washers),
            error: (err) => console.error('Error loading washers', err)
        });

        this.loadCategories();

        // Escuchar cambios en categoryId para filtrar servicios
        this.checkInForm.get('categoryId')?.valueChanges.subscribe(categoryId => {
            if (categoryId) {
                this.filterServicesByCategory(categoryId);
            }
        });
    }

    loadCategories() {
        this.categoryService.getCategories(true).subscribe({
            next: (categories) => {
                // Filtrar la categoría "TODOS" ya que no es un tipo de vehículo válido
                const vehicleTypes = categories.filter(cat => cat.code !== 'TODOS');
                this.vehicleCategories.set(vehicleTypes);
                // Si no hay categoría seleccionada, seleccionar la primera
                if (vehicleTypes.length > 0 && !this.checkInForm.value.categoryId) {
                    this.checkInForm.patchValue({ categoryId: vehicleTypes[0].id });
                    this.filterServicesByCategory(vehicleTypes[0].id);
                }
            },
            error: (err) => {
                console.error('Error loading categories', err);
            }
        });
    }

    filterServicesByCategory(categoryId: string) {
        if (!categoryId) {
            this.filteredServices.set([]);
            return;
        }
        const category = this.vehicleCategories().find(c => c.id === categoryId);
        if (!category) {
            this.filteredServices.set([]);
            return;
        }
        
        // Buscar la categoría "TODOS"
        const todosCategory = this.vehicleCategories().find(c => c.code === 'TODOS');
        
        // Filtrar servicios que coincidan con la categoría seleccionada O que pertenezcan a "TODOS"
        const filtered = this.availableServices().filter(service => {
            // Si el servicio pertenece a la categoría seleccionada
            if (service.categoryTargetId === categoryId || service.categoryTarget === category.code) {
                return true;
            }
            // Si el servicio pertenece a "TODOS", incluirlo siempre
            if (todosCategory && (service.categoryTargetId === todosCategory.id || service.categoryTarget === 'TODOS')) {
                return true;
            }
            return false;
        });
        this.filteredServices.set(filtered);
    }

    onCategoryChange(categoryId: string) {
        this.checkInForm.patchValue({ categoryId });
        this.filterServicesByCategory(categoryId);
        // Limpiar servicios seleccionados al cambiar categoría
        this.checkInForm.patchValue({ services: [] });
    }

    searchVehicles(event: any) {
        const query = event.query;
        if (query.length < 2) {
            this.vehicleSuggestions.set([]);
            return;
        }

        this.vehicleService.searchVehicles(query).subscribe({
            next: (vehicles) => this.vehicleSuggestions.set(vehicles),
            error: () => this.vehicleSuggestions.set([])
        });
    }

    searchClients(event: any) {
        const query = event.query;
        if (query.length < 2) {
            this.clientSuggestions.set([]);
            return;
        }

        this.http.get<any[]>(`http://localhost:3000/api/clients/search?name=${query}`).subscribe({
            next: (clients) => this.clientSuggestions.set(clients),
            error: () => this.clientSuggestions.set([])
        });
    }

    onVehicleSelect(event: any) {
        const vehicle = event?.value || event;

        if (vehicle && vehicle.plate) {
            this.selectedVehicle.set(vehicle);
            this.selectedClient.set(vehicle.client);

            setTimeout(() => {
                this.checkInForm.patchValue({
                    plate: vehicle.plate,
                    clientPhone: vehicle.client?.phone || '',
                    clientName: vehicle.client?.name || '',
                    categoryId: vehicle.categoryId || vehicle.categoryRef?.id || ''
                });
                // Filtrar servicios si hay categoría
                if (vehicle.categoryId || vehicle.categoryRef?.id) {
                    this.filterServicesByCategory(vehicle.categoryId || vehicle.categoryRef?.id);
                }
            }, 0);
        }
    }

    onClientSelect(event: any) {
        const client = event?.value || event;

        if (client && client.name) {
            this.selectedClient.set(client);

            setTimeout(() => {
                this.checkInForm.patchValue({
                    clientName: client.name,
                    clientPhone: client.phone || ''
                });
            }, 0);
        }
    }

    processFiles(files: File[]) {
        // Filtrar solo imágenes
        const imageFiles = files.filter((file: File) => {
            if (!file.type.startsWith('image/')) {
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Archivo no válido',
                    detail: `${file.name} no es una imagen válida`
                });
                return false;
            }
            // Validar tamaño máximo (5MB)
            if (file.size > 5000000) {
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Archivo muy grande',
                    detail: `${file.name} excede el tamaño máximo de 5MB`
                });
                return false;
            }
            return true;
        });
        
        // Agregar nuevas imágenes a las existentes
        const currentFiles = this.uploadedFiles();
        const newFiles = imageFiles.filter(file => 
            !currentFiles.some(existing => existing.name === file.name && existing.size === file.size)
        );
        
        // Crear preview URLs para nuevas imágenes
        newFiles.forEach((file: File) => {
            if (!this.imagePreviewUrls.has(file)) {
                this.imagePreviewUrls.set(file, URL.createObjectURL(file));
            }
        });
        
        this.uploadedFiles.set([...currentFiles, ...newFiles]);
    }

    onFileInputChange(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const filesArray = Array.from(input.files);
            this.processFiles(filesArray);
            // Resetear el input para permitir seleccionar el mismo archivo nuevamente
            input.value = '';
        }
    }

    openFileDialog() {
        this.fileInputRef?.nativeElement.click();
    }

    onDragOver(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'copy';
        }
    }

    onDragLeave(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        
        if (event.dataTransfer && event.dataTransfer.files) {
            const filesArray = Array.from(event.dataTransfer.files);
            this.processFiles(filesArray);
        }
    }

    removeImage(index: number) {
        const files = [...this.uploadedFiles()];
        const removedFile = files[index];
        files.splice(index, 1);
        
        // Limpiar URL del objeto eliminado
        const url = this.imagePreviewUrls.get(removedFile);
        if (url) {
            URL.revokeObjectURL(url);
            this.imagePreviewUrls.delete(removedFile);
        }
        
        this.uploadedFiles.set(files);
    }

    getImagePreview(file: File): string {
        let url = this.imagePreviewUrls.get(file);
        if (!url) {
            url = URL.createObjectURL(file);
            this.imagePreviewUrls.set(file, url);
        }
        return url;
    }

    ngOnDestroy() {
        // Limpiar todas las URLs de objetos al destruir el componente
        this.imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
        this.imagePreviewUrls.clear();
    }

    isServiceSelected(serviceId: string): boolean {
        const services = this.checkInForm.value.services || [];
        return services.includes(serviceId);
    }

    onServiceClick(serviceId: string) {
        const currentServices = this.checkInForm.value.services || [];
        const isSelected = currentServices.includes(serviceId);
        const updatedServices = isSelected
            ? currentServices.filter((id: string) => id !== serviceId)
            : [...currentServices, serviceId];

        this.checkInForm.patchValue({ services: updatedServices });
    }

    loadExchangeRate() {
        this.loadingExchangeRate.set(true);
        this.exchangeRateService.getUSDExchangeRate().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.exchangeRate.set(response.data.average);
                } else {
                    // Si falla, usar tasa por defecto
                    this.exchangeRate.set(240);
                }
                this.loadingExchangeRate.set(false);
            },
            error: (err) => {
                console.error('Error al cargar tasa de cambio:', err);
                // Si falla, usar tasa por defecto
                this.exchangeRate.set(240);
                this.loadingExchangeRate.set(false);
            }
        });
    }

    /**
     * Convierte un precio en USD a VES según la tasa actual
     */
    convertToVES(usdAmount: number): number {
        const rate = this.exchangeRate();
        if (!rate || rate === 0) return 0;
        return usdAmount * rate;
    }

    // Pipes para formateo de moneda (usando los pipes estándar)
    private vesPipe = new VesCurrencyPipe();
    private usdPipe = new UsdCurrencyPipe();

    /**
     * Formatea un precio en bolívares según el estándar establecido
     * Formato: Bs. X.XXX,XX (con separador de miles y 2 decimales)
     */
    formatVES(vesAmount: number): string {
        return this.vesPipe.transform(vesAmount);
    }

    /**
     * Formatea un precio en USD
     */
    formatUSD(usdAmount: number): string {
        return this.usdPipe.transform(usdAmount);
    }

    getEstimatedTotal(): number {
        const selectedIds = this.checkInForm.value.services || [];
        return this.availableServices()
            .filter(service => selectedIds.includes(service.id))
            .reduce((total, service) => total + Number(service.price), 0);
    }

    getEstimatedTotalVES(): number {
        return this.convertToVES(this.getEstimatedTotal());
    }

    getSelectedServicesCount(): number {
        return (this.checkInForm.value.services || []).length;
    }

    isFormValid(): boolean {
        return this.checkInForm.valid && this.getSelectedServicesCount() > 0;
    }

    /**
     * Limpia el teléfono removiendo caracteres de formato (paréntesis, espacios, guiones)
     * Ejemplo: "(0414) 575 7263" -> "04145757263"
     */
    cleanPhoneNumber(phone: string): string {
        if (!phone) return '';
        // Remover todos los caracteres que no sean números
        return phone.replace(/\D/g, '');
    }

    onSubmit() {
        if (this.checkInForm.valid) {
            this.loading.set(true);
            const supervisorId = this.authService.currentUser()?.id;
            const formData = new FormData();
            const plateValue = this.checkInForm.value.plate || '';
            
            // Convertir categoryId a vehicleType (enum) para el backend
            const categoryId = this.checkInForm.value.categoryId || '';
            const category = this.vehicleCategories().find(c => c.id === categoryId);
            const vehicleType = category?.code || 'AUTO'; // Fallback a AUTO si no se encuentra

            formData.append('plate', plateValue.toUpperCase());
            // Limpiar el teléfono antes de enviarlo (quitar formato visual)
            const cleanPhone = this.cleanPhoneNumber(this.checkInForm.value.clientPhone || '');
            formData.append('clientPhone', cleanPhone);
            formData.append('clientName', this.checkInForm.value.clientName || '');
            formData.append('vehicleType', vehicleType); // Enviar el código del enum
            formData.append('categoryId', categoryId); // También enviar categoryId para compatibilidad futura
            formData.append('services', JSON.stringify(this.checkInForm.value.services));
            formData.append('supervisorId', supervisorId || '');

            if (this.checkInForm.value.assignedWasherId) {
                formData.append('assignedWasherId', this.checkInForm.value.assignedWasherId);
            }

            this.uploadedFiles().forEach((file) => formData.append('images', file));

            this.http.post('http://localhost:3000/api/orders/smart-checkin', formData).subscribe({
                next: () => {
                    this.loading.set(false);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Orden Creada',
                        detail: 'Orden creada exitosamente'
                    });
                    const firstCategoryId = this.vehicleCategories().length > 0 ? this.vehicleCategories()[0].id : '';
                    this.checkInForm.reset({ categoryId: firstCategoryId });
                    this.selectedVehicle.set(null);
                    this.selectedClient.set(null);
                    if (firstCategoryId) {
                        this.filterServicesByCategory(firstCategoryId);
                    }
                    // Limpiar URLs antes de resetear archivos
                    this.uploadedFiles().forEach(file => {
                        const url = this.imagePreviewUrls.get(file);
                        if (url) {
                            URL.revokeObjectURL(url);
                            this.imagePreviewUrls.delete(file);
                        }
                    });
                    this.uploadedFiles.set([]);
                },
                error: (err) => {
                    this.loading.set(false);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: err.error?.error || 'Error al crear la orden'
                    });
                }
            });
        } else {
            this.messageService.add({
                severity: 'warn',
                summary: 'Formulario Incompleto',
                detail: 'Por favor complete todos los campos requeridos'
            });
        }
    }
    assignWasher(washerId: string | null) {
        this.checkInForm.patchValue({ assignedWasherId: washerId });
    }

    onCancel() {
        const firstCategoryId = this.vehicleCategories().length > 0 ? this.vehicleCategories()[0].id : '';
        this.checkInForm.reset({ categoryId: firstCategoryId });
        this.selectedVehicle.set(null);
        this.selectedClient.set(null);
        if (firstCategoryId) {
            this.filterServicesByCategory(firstCategoryId);
        }
        // Limpiar URLs antes de resetear archivos
        this.uploadedFiles().forEach(file => {
            const url = this.imagePreviewUrls.get(file);
            if (url) {
                URL.revokeObjectURL(url);
                this.imagePreviewUrls.delete(file);
            }
        });
        this.uploadedFiles.set([]);
    }

    selectedServices() {
        return this.checkInForm.get('services')?.value || [];
    }

    getServiceById(serviceId: string) {
        return this.availableServices().find(s => s.id === serviceId);
    }
}
