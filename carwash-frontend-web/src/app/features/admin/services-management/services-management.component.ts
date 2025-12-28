import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { ServiceService, Service } from '../../../core/services/service.service';
import { CategoryService } from '../../../core/services/category.service';

@Component({
    selector: 'app-services-management',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        DialogModule,
        InputTextModule,
        InputTextareaModule,
        InputNumberModule,
        DropdownModule,
        ToastModule,
        TagModule,
        ConfirmDialogModule,
        CheckboxModule,
        TooltipModule
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './services-management.component.html',
    styleUrl: './services-management.component.css'
})
export class ServicesManagementComponent implements OnInit {
    private serviceService = inject(ServiceService);
    private categoryService = inject(CategoryService);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);

    services = signal<Service[]>([]);
    filteredServices = signal<Service[]>([]);
    loading = signal(false);
    displayDialog = signal(false);
    selectedService = signal<Service | null>(null);
    isEditMode = signal(false);
    selectedCategoryFilter = signal<string | null>(null); // null = todas las categorías

    vehicleCategories = signal<Array<{ label: string; value: string; id: string }>>([]);

    formData = signal({
        name: '',
        description: '',
        categoryTargetId: '',
        price: 0,
        commissionPercentage: 0,
        active: true
    });

    ngOnInit() {
        this.loadCategories();
        this.loadServices();
    }

    loadCategories() {
        this.categoryService.getCategories(true).subscribe({
            next: (categories) => {
                this.vehicleCategories.set(
                    categories.map(cat => ({
                        label: cat.name,
                        value: cat.code,
                        id: cat.id
                    }))
                );
                // Si no hay categoría seleccionada, seleccionar la primera
                if (this.vehicleCategories().length > 0 && !this.formData().categoryTargetId) {
                    this.formData.update(data => ({
                        ...data,
                        categoryTargetId: this.vehicleCategories()[0].id
                    }));
                }
            },
            error: (err) => {
                console.error('Error loading categories', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar las categorías de vehículos'
                });
            }
        });
    }

    loadServices() {
        this.loading.set(true);
        const categoryId = this.selectedCategoryFilter();
        this.serviceService.getServices(false, categoryId || undefined).subscribe({
            next: (services) => {
                this.services.set(services);
                this.applyFilters();
                this.loading.set(false);
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar los servicios'
                });
                this.loading.set(false);
            }
        });
    }

    applyFilters() {
        let filtered = [...this.services()];
        
        // Filtrar por categoría si está seleccionada
        const categoryFilter = this.selectedCategoryFilter();
        if (categoryFilter) {
            filtered = filtered.filter(service => 
                service.categoryTargetId === categoryFilter
            );
        }
        
        this.filteredServices.set(filtered);
    }

    onCategoryFilterChange(categoryId: string | null) {
        this.selectedCategoryFilter.set(categoryId);
        this.loadServices(); // Recargar servicios con el nuevo filtro
    }

    openNew() {
        this.selectedService.set(null);
        this.isEditMode.set(false);
        const todosCategory = this.vehicleCategories().find(cat => cat.value === 'TODOS');
        const firstCategoryId = todosCategory?.id || (this.vehicleCategories().length > 0 ? this.vehicleCategories()[0].id : '');
        this.formData.set({
            name: '',
            description: '',
            categoryTargetId: firstCategoryId,
            price: 0,
            commissionPercentage: 0,
            active: true
        });
        this.displayDialog.set(true);
    }

    editService(service: Service) {
        this.selectedService.set(service);
        this.isEditMode.set(true);
        this.formData.set({
            name: service.name,
            description: service.description || '',
            categoryTargetId: service.categoryTargetId || '',
            price: Number(service.price),
            commissionPercentage: Number(service.commissionPercentage),
            active: service.active
        });
        this.displayDialog.set(true);
    }

    saveService() {
        const data = this.formData();
        
        if (!data.name || !data.categoryTargetId || data.price <= 0 || data.commissionPercentage < 0 || data.commissionPercentage > 100) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validación',
                detail: 'Por favor complete todos los campos correctamente'
            });
            return;
        }

        // Preparar datos para enviar al backend
        const serviceData: any = {
            name: data.name,
            description: data.description || undefined, // Solo incluir si tiene valor
            categoryTargetId: data.categoryTargetId,
            price: data.price,
            commissionPercentage: data.commissionPercentage,
            active: data.active
        };

        if (this.isEditMode() && this.selectedService()) {
            // Update
            this.serviceService.updateService(this.selectedService()!.id, serviceData).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Servicio actualizado correctamente'
                    });
                    this.displayDialog.set(false);
                    this.loadServices();
                },
                error: (err) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: err.error?.error || 'Error al actualizar el servicio'
                    });
                }
            });
        } else {
            // Create
            this.serviceService.createService(serviceData).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Servicio creado correctamente'
                    });
                    this.displayDialog.set(false);
                    this.loadServices();
                },
                error: (err) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: err.error?.error || 'Error al crear el servicio'
                    });
                }
            });
        }
    }

    deleteService(service: Service) {
        this.confirmationService.confirm({
            message: `¿Está seguro de eliminar el servicio "${service.name}"?`,
            header: 'Confirmar Eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.serviceService.deleteService(service.id).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Éxito',
                            detail: 'Servicio eliminado correctamente'
                        });
                        this.loadServices();
                    },
                    error: (err) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: err.error?.error || 'Error al eliminar el servicio'
                        });
                    }
                });
            }
        });
    }

    toggleActive(service: Service) {
        const newActiveState = !service.active;
        this.serviceService.updateService(service.id, { active: newActiveState }).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: `Servicio ${newActiveState ? 'activado' : 'desactivado'} correctamente`
                });
                this.loadServices();
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al actualizar el estado del servicio'
                });
            }
        });
    }

    getCategoryLabel(service: Service): string {
        // Preferir categoryTargetRef si está disponible
        if (service.categoryTargetRef) {
            return service.categoryTargetRef.name;
        }
        // Fallback a buscar por código
        const cat = this.vehicleCategories().find((c: { label: string; value: string }) => c.value === service.categoryTarget);
        return cat?.label || service.categoryTarget;
    }

    calculateCommission(price: number | string, percentage: number | string): number {
        const priceNum = typeof price === 'string' ? parseFloat(price) : price;
        const percentageNum = typeof percentage === 'string' ? parseFloat(percentage.toString()) : percentage;
        return (priceNum * percentageNum) / 100;
    }

    // Métodos auxiliares para actualizar formData
    updateFormName(value: string) {
        this.formData.update(f => ({ ...f, name: value }));
    }

    updateFormDescription(value: string) {
        this.formData.update(f => ({ ...f, description: value }));
    }

    updateFormCategory(value: string) {
        this.formData.update(f => ({ ...f, categoryTargetId: value }));
    }

    updateFormPrice(value: string | number | null) {
        const numValue = value === null || value === undefined ? 0 : (typeof value === 'string' ? parseFloat(value) : value);
        this.formData.update(f => ({ ...f, price: numValue || 0 }));
    }

    updateFormCommission(value: string | number | null) {
        const numValue = value === null || value === undefined ? 0 : (typeof value === 'string' ? parseFloat(value) : value);
        this.formData.update(f => ({ ...f, commissionPercentage: numValue || 0 }));
    }

    updateFormActive(checked: boolean) {
        this.formData.update(f => ({ ...f, active: checked }));
    }

    getFilterOptions() {
        return [
            { label: 'Todas las categorías', value: null },
            ...this.vehicleCategories().map(cat => ({ label: cat.label, value: cat.id }))
        ];
    }
}

