import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, Product } from '../../../core/services/product.service';
import { Router } from '@angular/router';

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TagModule } from 'primeng/tag';

interface InventoryItem extends Product {
  actualStockInput?: number;
}

@Component({
  selector: 'app-inventory-check',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    TableModule,
    ButtonModule,
    InputNumberModule,
    InputTextareaModule,
    CardModule,
    MessageModule,
    ToastModule,
    ConfirmDialogModule,
    TagModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './inventory-check.component.html',
  styleUrls: ['./inventory-check.component.css']
})
export class InventoryCheckComponent implements OnInit {
  products: InventoryItem[] = [];
  loading = false;
  submitting = false;
  notes: string = '';
  lastCheckDate: Date | null = null;
  currentDate = new Date();

  constructor(
    private productService: ProductService,
    private router: Router,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts() {
    this.loading = true;
    this.productService.getProducts(true).subscribe({
      next: (data) => {
        this.products = data.map(p => ({
          ...p,
          actualStockInput: p.currentStock
        }));
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading products', err);
        this.messageService.add({severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los productos'});
        this.loading = false;
      }
    });
  }

  confirmSubmit() {
    this.confirmationService.confirm({
      message: '¿Estás seguro de cerrar el inventario? Esto registrará ajustes automáticos por diferencias.',
      header: 'Confirmar Cierre de Inventario',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.submitInventory();
      }
    });
  }

  submitInventory() {
    this.submitting = true;

    const items = this.products
      .filter(p => p.actualStockInput !== undefined && p.actualStockInput !== null)
      .map(p => ({
        productId: p.id,
        actualStock: p.actualStockInput!
      }));

    this.productService.submitDailyCheck({
      items,
      notes: this.notes
    }).subscribe({
      next: (res) => {
        this.messageService.add({severity: 'success', summary: 'Éxito', detail: `Inventario actualizado. ${res.adjustmentsCount} ajustes realizados.`});
        this.submitting = false;
        setTimeout(() => {
            this.router.navigate(['/supervisor/dashboard']);
        }, 1500);
      },
      error: (err) => {
        console.error(err);
        this.messageService.add({severity: 'error', summary: 'Error', detail: err.error?.error || 'Error desconocido al guardar inventario'});
        this.submitting = false;
      }
    });
  }

  getDifference(product: InventoryItem): number {
    if (product.actualStockInput === undefined || product.actualStockInput === null) return 0;
    return product.actualStockInput - product.currentStock;
  }
}
