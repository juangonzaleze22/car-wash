import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductService, Product, StockMovement } from '../../../core/services/product.service';

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-products-management',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule,
    TableModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    InputTextareaModule,
    DropdownModule,
    CheckboxModule,
    TagModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './products-management.component.html',
  styleUrls: ['./products-management.component.css']
})
export class ProductsManagementComponent implements OnInit {
  products: Product[] = [];
  loading = false;
  showModal = false;
  showHistoryModal = false;
  isEditing = false;
  
  // Kardex Pagination
  kardexLoading = false;
  kardexPage = 1;
  kardexLimit = 10;
  kardexTotal = 0;
  
  // Filtros
  activeFilter = 0; 
  activeFilterOptions = [
    { label: 'Todos', value: null },
    { label: 'Activos', value: true },
    { label: 'Inactivos', value: false }
  ];
  selectedActiveFilter: boolean | null = null;

  productForm: FormGroup;
  selectedProduct: Product | null = null;
  productMovements: StockMovement[] = [];

  // Opciones para dropdown de unidades
  unitOptions = [
    { label: 'Unidad', value: 'UNIDAD' },
    { label: 'Litro', value: 'LITRO' },
    { label: 'Galón', value: 'GALON' },
    { label: 'Caja', value: 'CAJA' },
    { label: 'Metro', value: 'METRO' },
    { label: 'Paquete', value: 'PAQUETE' }
  ];

  constructor(
    private productService: ProductService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      unit: ['UNIDAD', Validators.required],
      minStock: [5, [Validators.required, Validators.min(0)]],
      currentStock: [0, [Validators.min(0)]],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts() {
    this.loading = true;
    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products = this.filterProducts(data);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading products', err);
        this.messageService.add({severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los productos'});
        this.loading = false;
      }
    });
  }

  filterProducts(allProducts: Product[]): Product[] {
    if (this.selectedActiveFilter === null) return allProducts;
    return allProducts.filter(p => p.isActive === this.selectedActiveFilter);
  }

  onActiveFilterChange(value: boolean | null) {
    this.selectedActiveFilter = value;
    this.loadProducts();
  }

  openCreateModal() {
    this.isEditing = false;
    this.selectedProduct = null;
    this.productForm.reset({
      unit: 'UNIDAD',
      minStock: 5,
      currentStock: 0,
      isActive: true
    });
    this.productForm.get('currentStock')?.enable();
    this.showModal = true;
  }

  openEditModal(product: Product) {
    this.isEditing = true;
    this.selectedProduct = product;
    this.productForm.patchValue({
      name: product.name,
      description: product.description,
      unit: product.unit,
      minStock: product.minStock,
      isActive: product.isActive
    });
    this.productForm.get('currentStock')?.disable();
    this.showModal = true;
  }

  onSubmit() {
    if (this.productForm.invalid) {
      this.messageService.add({severity: 'warn', summary: 'Validación', detail: 'Complete los campos requeridos'});
      return;
    }

    const formData = this.productForm.getRawValue();

    if (this.isEditing && this.selectedProduct) {
      this.productService.updateProduct(this.selectedProduct.id, formData).subscribe({
        next: () => {
          this.messageService.add({severity: 'success', summary: 'Éxito', detail: 'Producto actualizado'});
          this.loadProducts();
          this.closeModal();
        },
        error: (err) => this.messageService.add({severity: 'error', summary: 'Error', detail: err.error?.error || 'Error al actualizar'})
      });
    } else {
      this.productService.createProduct(formData).subscribe({
        next: () => {
          this.messageService.add({severity: 'success', summary: 'Éxito', detail: 'Producto creado'});
          this.loadProducts();
          this.closeModal();
        },
        error: (err) => this.messageService.add({severity: 'error', summary: 'Error', detail: err.error?.error || 'Error al crear'})
      });
    }
  }

  closeModal() {
    this.showModal = false;
    this.productForm.reset();
  }

  viewHistory(product: Product) {
    this.selectedProduct = product;
    this.kardexPage = 1;
    this.loadKardex();
    this.showHistoryModal = true;
  }

  loadKardex() {
    if (!this.selectedProduct) return;
    
    this.kardexLoading = true;
    this.productService.getProductKardex(this.selectedProduct.id, this.kardexPage, this.kardexLimit).subscribe({
      next: (response) => {
        this.productMovements = response.data;
        this.kardexTotal = response.meta.total;
        this.kardexLoading = false;
      },
      error: (err) => {
        this.messageService.add({severity: 'error', summary: 'Error', detail: 'No se pudo cargar el historial'});
        this.kardexLoading = false;
      }
    });
  }

  onKardexPageChange(event: any) {
    this.kardexPage = (event.first / event.rows) + 1;
    this.kardexLimit = event.rows;
    this.loadKardex();
  }

  closeHistoryModal() {
    this.showHistoryModal = false;
    this.productMovements = [];
  }

  getMovementSeverity(type: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' | undefined {
    switch (type) {
      case 'IN': return 'success';
      case 'OUT': return 'danger';
      case 'ADJUST': return 'warning';
      case 'DAILY_CHECK': return 'info';
      default: return 'secondary';
    }
  }

  getMovementLabel(type: string): string {
      switch (type) {
          case 'IN': return 'COMPRA/ENTRADA';
          case 'OUT': return 'USO/SALIDA';
          case 'ADJUST': return 'AJUSTE MANUAL';
          case 'DAILY_CHECK': return 'CIERRE DIARIO';
          default: return type;
      }
  }

  getStockSeverity(product: Product): 'success' | 'warning' | 'danger' | undefined {
    if ((product.currentStock || 0) <= 0) return 'danger';
    if ((product.currentStock || 0) <= product.minStock) return 'warning';
    return 'success';
  }
}
