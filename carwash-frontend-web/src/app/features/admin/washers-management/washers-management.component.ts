import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { UserService, Washer, CreateWasherDto, UpdateWasherDto } from '../../../core/services/user.service';

@Component({
    selector: 'app-washers-management',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        DialogModule,
        InputTextModule,
        PasswordModule,
        CheckboxModule,
        ToastModule,
        TagModule,
        ConfirmDialogModule,
        TooltipModule
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './washers-management.component.html',
    styleUrl: './washers-management.component.css'
})
export class WashersManagementComponent implements OnInit {
    private userService = inject(UserService);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);

    washers = signal<Washer[]>([]);
    loading = signal(false);
    displayDialog = signal(false);
    selectedWasher = signal<Washer | null>(null);
    isEditMode = signal(false);
    showPassword = signal(false);

    formData = signal({
        username: '',
        name: '',
        password: '',
        active: true
    });

    ngOnInit() {
        this.loadWashers();
    }

    loadWashers() {
        this.loading.set(true);
        this.userService.getWashers(true).subscribe({
            next: (washers) => {
                this.washers.set(washers);
                this.loading.set(false);
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar los lavadores'
                });
                this.loading.set(false);
            }
        });
    }

    openNew() {
        this.selectedWasher.set(null);
        this.isEditMode.set(false);
        this.showPassword.set(true);
        this.formData.set({
            username: '',
            name: '',
            password: '',
            active: true
        });
        this.displayDialog.set(true);
    }

    editWasher(washer: Washer) {
        this.selectedWasher.set(washer);
        this.isEditMode.set(true);
        this.showPassword.set(false);
        this.formData.set({
            username: washer.username,
            name: washer.name || '',
            password: '',
            active: washer.active ?? true
        });
        this.displayDialog.set(true);
    }

    saveWasher() {
        const data = this.formData();
        
        if (!data.username || data.username.length < 3) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validación',
                detail: 'El nombre de usuario debe tener al menos 3 caracteres'
            });
            return;
        }

        if (this.isEditMode() && this.selectedWasher()) {
            // Update
            const updateData: UpdateWasherDto = {
                username: data.username,
                name: data.name || null,
                active: data.active
            };

            // Solo incluir password si se proporcionó uno nuevo
            if (data.password && data.password.length >= 6) {
                updateData.password = data.password;
            } else if (data.password && data.password.length > 0) {
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Validación',
                    detail: 'La contraseña debe tener al menos 6 caracteres'
                });
                return;
            }

            this.userService.updateWasher(this.selectedWasher()!.id, updateData).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Lavador actualizado correctamente'
                    });
                    this.displayDialog.set(false);
                    this.loadWashers();
                },
                error: (err) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: err.error?.error || 'Error al actualizar el lavador'
                    });
                }
            });
        } else {
            // Create
            if (!data.password || data.password.length < 6) {
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Validación',
                    detail: 'La contraseña debe tener al menos 6 caracteres'
                });
                return;
            }

            const createData: CreateWasherDto = {
                username: data.username,
                name: data.name || undefined,
                password: data.password
            };

            this.userService.createWasher(createData).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Lavador creado correctamente'
                    });
                    this.displayDialog.set(false);
                    this.loadWashers();
                },
                error: (err) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: err.error?.error || 'Error al crear el lavador'
                    });
                }
            });
        }
    }

    toggleActive(washer: Washer) {
        const action = washer.active ? 'desactivar' : 'activar';
        this.confirmationService.confirm({
            message: `¿Estás seguro de que deseas ${action} a "${washer.username}"?`,
            header: 'Confirmar acción',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.userService.updateWasher(washer.id, { active: !washer.active }).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Éxito',
                            detail: `Lavador ${action}do correctamente`
                        });
                        this.loadWashers();
                    },
                    error: (err) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: err.error?.error || `Error al ${action} el lavador`
                        });
                    }
                });
            }
        });
    }

    deleteWasher(washer: Washer) {
        this.confirmationService.confirm({
            message: `¿Estás seguro de que deseas desactivar a "${washer.username}"? Esta acción no se puede deshacer.`,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.userService.deleteWasher(washer.id).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Éxito',
                            detail: 'Lavador desactivado correctamente'
                        });
                        this.loadWashers();
                    },
                    error: (err) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: err.error?.error || 'Error al desactivar el lavador'
                        });
                    }
                });
            }
        });
    }
}

