import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CategoryService, VehicleCategory, CreateCategoryDto, UpdateCategoryDto } from '../../../core/services/category.service';

@Component({
    selector: 'app-categories-management',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        DialogModule,
        InputTextModule,
        InputTextareaModule,
        ToastModule,
        TagModule,
        ConfirmDialogModule,
        TooltipModule,
        CheckboxModule
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './categories-management.component.html',
    styleUrl: './categories-management.component.css'
})
export class CategoriesManagementComponent implements OnInit {
    private categoryService = inject(CategoryService);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);

    categories = signal<VehicleCategory[]>([]);
    loading = signal(false);
    displayDialog = signal(false);
    selectedCategory = signal<VehicleCategory | null>(null);
    isEditMode = signal(false);

    formData = signal<CreateCategoryDto>({
        name: '',
        code: '',
        description: '',
        active: true
    });

    ngOnInit() {
        this.loadCategories();
    }

    loadCategories() {
        this.loading.set(true);
        this.categoryService.getCategories().subscribe({
            next: (categories) => {
                this.categories.set(categories);
                this.loading.set(false);
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar las categorías'
                });
                this.loading.set(false);
            }
        });
    }

    openNew() {
        this.selectedCategory.set(null);
        this.isEditMode.set(false);
        this.formData.set({
            name: '',
            code: '',
            description: '',
            active: true
        });
        this.displayDialog.set(true);
    }

    editCategory(category: VehicleCategory) {
        this.selectedCategory.set(category);
        this.isEditMode.set(true);
        this.formData.set({
            name: category.name,
            code: category.code,
            description: category.description || '',
            active: category.active
        });
        this.displayDialog.set(true);
    }

    saveCategory() {
        const formData = this.formData();
        
        if (!formData.name || formData.name.trim().length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validación',
                detail: 'El nombre es requerido'
            });
            return;
        }

        if (!formData.code || formData.code.trim().length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validación',
                detail: 'El código es requerido'
            });
            return;
        }

        if (this.isEditMode() && this.selectedCategory()) {
            const updateData: UpdateCategoryDto = {
                name: formData.name,
                code: formData.code,
                description: formData.description,
                active: formData.active
            };

            this.categoryService.updateCategory(this.selectedCategory()!.id, updateData).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Categoría actualizada exitosamente'
                    });
                    this.displayDialog.set(false);
                    this.loadCategories();
                },
                error: (err) => {
                    const errorMessage = err.error?.error || 'Error al actualizar la categoría';
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: errorMessage,
                        life: 5000
                    });
                }
            });
        } else {
            const createData: CreateCategoryDto = {
                name: formData.name,
                code: formData.code,
                description: formData.description,
                active: formData.active !== undefined ? formData.active : true
            };

            this.categoryService.createCategory(createData).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Categoría creada exitosamente'
                    });
                    this.displayDialog.set(false);
                    this.loadCategories();
                },
                error: (err) => {
                    const errorMessage = err.error?.error || 'Error al crear la categoría';
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: errorMessage,
                        life: 5000
                    });
                }
            });
        }
    }

    deleteCategory(category: VehicleCategory) {
        const vehicleCount = category._count?.vehicles || 0;
        const serviceCount = category._count?.services || 0;

        if (vehicleCount > 0 || serviceCount > 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'No se puede eliminar',
                detail: `Esta categoría tiene ${vehicleCount} vehículo(s) y ${serviceCount} servicio(s) asociados`
            });
            return;
        }

        this.confirmationService.confirm({
            message: `¿Está seguro de eliminar la categoría "${category.name}"?`,
            header: 'Confirmar Eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.categoryService.deleteCategory(category.id).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Éxito',
                            detail: 'Categoría eliminada exitosamente'
                        });
                        this.loadCategories();
                    },
                    error: (err) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: err.error?.error || 'Error al eliminar la categoría'
                        });
                    }
                });
            }
        });
    }

    updateFormName(value: string) {
        this.formData.update(data => ({ ...data, name: value }));
    }

    updateFormCode(value: string) {
        this.formData.update(data => ({ ...data, code: value.toUpperCase() }));
    }

    updateFormDescription(value: string) {
        this.formData.update(data => ({ ...data, description: value }));
    }

    updateFormActive(value: boolean) {
        this.formData.update(data => ({ ...data, active: value }));
    }
}

