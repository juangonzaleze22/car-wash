import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { MessageService, ConfirmationService } from 'primeng/api';
import { VehicleService, Vehicle, VehicleCategory, CreateVehicleDto, UpdateVehicleDto, Client } from '../../../core/services/vehicle.service';
import { ClientService } from '../../../core/services/client.service';
import { CategoryService } from '../../../core/services/category.service';

@Component({
    selector: 'app-vehicles-management',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        DialogModule,
        InputTextModule,
        InputTextareaModule,
        DropdownModule,
        ToastModule,
        TagModule,
        ConfirmDialogModule,
        TooltipModule,
        AutoCompleteModule
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './vehicles-management.component.html',
    styleUrl: './vehicles-management.component.css'
})
export class VehiclesManagementComponent implements OnInit {
    private vehicleService = inject(VehicleService);
    private clientService = inject(ClientService);
    private categoryService = inject(CategoryService);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);

    vehicles = signal<Vehicle[]>([]);
    loading = signal(false);
    displayDialog = signal(false);
    selectedVehicle = signal<Vehicle | null>(null);
    isEditMode = signal(false);
    totalRecords = signal(0);
    page = signal(1);
    limit = signal(20);
    selectedCategory = signal<string | undefined>(undefined);
    plateFilter = signal<string>('');

    vehicleCategories = signal<Array<{ label: string; value: string }>>([]);
    categoryFilterOptions = signal<Array<{ label: string; value: string | undefined }>>([]);

    clients = signal<Client[]>([]);
    clientSuggestions = signal<Client[]>([]);
    selectedClient = signal<Client | null>(null);

    formData = signal<CreateVehicleDto>({
        plate: '',
        category: VehicleCategory.AUTO,
        clientId: undefined,
        clientName: '',
        clientPhone: '',
        notes: ''
    });

    ngOnInit() {
        this.loadCategories();
        this.loadVehicles();
        this.loadClients();
    }

    loadCategories() {
        this.categoryService.getCategories(true).subscribe({
            next: (categories) => {
                this.vehicleCategories.set(
                    categories.map(cat => ({
                        label: cat.name,
                        value: cat.code
                    }))
                );
                this.categoryFilterOptions.set([
                    { label: 'Todas', value: undefined },
                    ...this.vehicleCategories()
                ]);
            },
            error: (err) => {
                console.error('Error loading categories', err);
            }
        });
    }

    loadClients() {
        this.clientService.getClients().subscribe({
            next: (clients) => {
                this.clients.set(clients);
            },
            error: (err) => {
                console.error('Error al cargar clientes:', err);
            }
        });
    }

    searchClients(event: any) {
        const query = event.query.toLowerCase();
        const filtered = this.clients().filter(client =>
            client.name.toLowerCase().includes(query) ||
            client.phone.includes(query)
        );
        this.clientSuggestions.set(filtered.slice(0, 10));
    }

    onClientSelect(event: any) {
        const client = event?.value || event;
        if (client && client.id) {
            this.selectedClient.set(client);
            this.formData.update(data => ({
                ...data,
                clientId: client.id,
                clientName: client.name,
                clientPhone: client.phone
            }));
        }
    }

    loadVehicles() {
        this.loading.set(true);
        const params: any = {
            page: this.page(),
            limit: this.limit()
        };

        if (this.selectedCategory()) {
            params.category = this.selectedCategory() as VehicleCategory;
        }

        if (this.plateFilter()) {
            params.plate = this.plateFilter();
        }

        this.vehicleService.getVehicles(params).subscribe({
            next: (response) => {
                this.vehicles.set(response.vehicles);
                this.totalRecords.set(response.pagination.total);
                this.loading.set(false);
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar los vehículos'
                });
                this.loading.set(false);
            }
        });
    }

    onPageChange(event: any) {
        this.page.set(event.page + 1);
        this.limit.set(event.rows);
        this.loadVehicles();
    }

    onCategoryFilterChange() {
        this.page.set(1);
        this.loadVehicles();
    }

    onPlateFilterChange() {
        this.page.set(1);
        this.loadVehicles();
    }

    clearFilters() {
        this.selectedCategory.set(undefined);
        this.plateFilter.set('');
        this.page.set(1);
        this.loadVehicles();
    }

    openNew() {
        this.selectedVehicle.set(null);
        this.selectedClient.set(null);
        this.isEditMode.set(false);
        this.formData.set({
            plate: '',
            category: VehicleCategory.AUTO,
            clientId: undefined,
            clientName: '',
            clientPhone: '',
            notes: ''
        });
        this.displayDialog.set(true);
    }

    editVehicle(vehicle: Vehicle) {
        this.selectedVehicle.set(vehicle);
        this.isEditMode.set(true);
        if (vehicle.client) {
            this.selectedClient.set(vehicle.client);
        }
        this.formData.set({
            plate: vehicle.plate,
            category: vehicle.category,
            clientId: vehicle.clientId,
            clientName: vehicle.client?.name || '',
            clientPhone: vehicle.client?.phone || '',
            notes: vehicle.notes || ''
        });
        this.displayDialog.set(true);
    }

    saveVehicle() {
        const formData = this.formData();
        
        if (!formData.plate || formData.plate.length < 3) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validación',
                detail: 'La placa debe tener al menos 3 caracteres'
            });
            return;
        }

        if (!formData.clientId && (!formData.clientName || !formData.clientPhone)) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validación',
                detail: 'Debe seleccionar un cliente o proporcionar nombre y teléfono'
            });
            return;
        }

        if (this.isEditMode() && this.selectedVehicle()) {
            const updateData: UpdateVehicleDto = {
                plate: formData.plate,
                category: formData.category,
                clientId: formData.clientId,
                notes: formData.notes
            };

            this.vehicleService.updateVehicle(this.selectedVehicle()!.id, updateData).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Vehículo actualizado exitosamente'
                    });
                    this.displayDialog.set(false);
                    this.loadVehicles();
                },
                error: (err) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: err.error?.error || 'Error al actualizar el vehículo'
                    });
                }
            });
        } else {
            const createData: CreateVehicleDto = {
                plate: formData.plate,
                category: formData.category,
                clientId: formData.clientId,
                clientName: formData.clientName,
                clientPhone: formData.clientPhone,
                notes: formData.notes
            };

            this.vehicleService.createVehicle(createData).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Vehículo creado exitosamente'
                    });
                    this.displayDialog.set(false);
                    this.loadVehicles();
                },
                error: (err) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: err.error?.error || 'Error al crear el vehículo'
                    });
                }
            });
        }
    }

    deleteVehicle(vehicle: Vehicle) {
        this.confirmationService.confirm({
            message: `¿Está seguro de eliminar el vehículo con placa ${vehicle.plate}?`,
            header: 'Confirmar Eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.vehicleService.deleteVehicle(vehicle.id).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Éxito',
                            detail: 'Vehículo eliminado exitosamente'
                        });
                        this.loadVehicles();
                    },
                    error: (err) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: err.error?.error || 'Error al eliminar el vehículo'
                        });
                    }
                });
            }
        });
    }

    updateFormPlate(value: string) {
        this.formData.update(data => ({ ...data, plate: value.toUpperCase() }));
    }

    updateFormCategory(category: string) {
        this.formData.update(data => ({ ...data, category: category as VehicleCategory }));
    }

    updateFormClientId(clientId: string | undefined) {
        this.formData.update(data => ({ ...data, clientId }));
        if (clientId) {
            const client = this.clients().find(c => c.id === clientId);
            if (client) {
                this.selectedClient.set(client);
                this.formData.update(d => ({
                    ...d,
                    clientName: client.name,
                    clientPhone: client.phone
                }));
            }
        }
    }

    updateFormClientName(value: string) {
        this.formData.update(data => ({ ...data, clientName: value }));
    }

    updateFormClientPhone(value: string) {
        this.formData.update(data => ({ ...data, clientPhone: value }));
    }

    updateFormNotes(value: string) {
        this.formData.update(data => ({ ...data, notes: value }));
    }

    getCategoryLabel(category: VehicleCategory): string {
        return this.vehicleService.getCategoryLabel(category);
    }

    hasActiveOrders(vehicle: Vehicle): boolean {
        return vehicle.orders?.some(order => 
            order.status !== 'COMPLETED' && order.status !== 'CANCELLED'
        ) || false;
    }
}
// Force recompile 1