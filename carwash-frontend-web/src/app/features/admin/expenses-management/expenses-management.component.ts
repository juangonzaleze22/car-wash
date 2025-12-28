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
import { TooltipModule } from 'primeng/tooltip';
import { CalendarModule } from 'primeng/calendar';
import { ExpenseService, Expense, ExpenseCategory, RecurrenceFrequency, CreateExpenseDto, UpdateExpenseDto } from '../../../core/services/expense.service';
import { ProductService, Product } from '../../../core/services/product.service';

@Component({
    selector: 'app-expenses-management',
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
        TooltipModule,
        CalendarModule
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './expenses-management.component.html',
    styleUrl: './expenses-management.component.css'
})
export class ExpensesManagementComponent implements OnInit {
    private expenseService = inject(ExpenseService);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);
    private productService = inject(ProductService);

    expenses = signal<Expense[]>([]);
    products = signal<Product[]>([]);
    loading = signal(false);
    displayDialog = signal(false);
    selectedExpense = signal<Expense | null>(null);
    isEditMode = signal(false);
    totalRecords = signal(0);
    page = signal(1);
    limit = signal(20);
    selectedCategory = signal<ExpenseCategory | undefined>(undefined);
    dateRange = signal<Date[] | null>(null);
    showOnlyRecurring = signal<boolean | undefined>(undefined);
    recurringExpensesTotal = signal<number>(0);
    recurringExpensesCount = signal<number>(0);

    // Formulario extendido para incluir productos
    selectedProductId = signal<string | null>(null);
    productQuantity = signal<number>(0);

    expenseCategories = [
        { label: 'Alquiler', value: ExpenseCategory.RENT },
        { label: 'Productos', value: ExpenseCategory.PRODUCTS },
        { label: 'Servicios', value: ExpenseCategory.UTILITIES },
        { label: 'Salarios', value: ExpenseCategory.SALARIES },
        { label: 'Mantenimiento', value: ExpenseCategory.MAINTENANCE },
        { label: 'Marketing', value: ExpenseCategory.MARKETING },
        { label: 'Otros', value: ExpenseCategory.OTHER }
    ];

    categoryFilterOptions = [
        { label: 'Todas', value: undefined },
        ...this.expenseCategories
    ];

    currencies = [
        { label: 'USD', value: 'USD' },
        { label: 'VES', value: 'VES' }
    ];

    recurrenceFrequencies = [
        { label: 'Semanal', value: RecurrenceFrequency.WEEKLY },
        { label: 'Mensual', value: RecurrenceFrequency.MONTHLY },
        { label: 'Trimestral', value: RecurrenceFrequency.QUARTERLY },
        { label: 'Anual', value: RecurrenceFrequency.YEARLY }
    ];

    pendingRecurringExpenses = signal<Expense[]>([]);
    recurrenceStartDateModel = signal<Date | null>(null);

    formData = signal<CreateExpenseDto>({
        description: '',
        category: ExpenseCategory.OTHER,
        amount: 0,
        currency: 'USD',
        exchangeRate: undefined,
        notes: '',
        isRecurring: false,
        recurrenceFrequency: undefined,
        recurrenceStartDate: undefined
    });

    ngOnInit() {
        this.loadExpenses();
        this.loadPendingRecurringExpenses();
        this.calculateRecurringExpensesTotal();
        this.loadProducts();
    }

    loadProducts() {
        this.productService.getProducts(true).subscribe({
            next: (data) => this.products.set(data),
            error: (err) => console.error('Error loading products', err)
        });
    }

    loadPendingRecurringExpenses() {
        this.expenseService.getPendingRecurringExpenses().subscribe({
            next: (response) => {
                this.pendingRecurringExpenses.set(response.expenses);
            },
            error: (err) => {
                console.error('Error al cargar gastos recurrentes pendientes:', err);
            }
        });
    }

    loadExpenses() {
        this.loading.set(true);
        const params: any = {
            page: this.page(),
            limit: this.limit()
        };

        if (this.selectedCategory()) {
            params.category = this.selectedCategory();
        }

        if (this.dateRange() && this.dateRange()!.length === 2) {
            params.startDate = this.dateRange()![0].toISOString().split('T')[0];
            params.endDate = this.dateRange()![1].toISOString().split('T')[0];
        }

        if (this.showOnlyRecurring() !== undefined) {
            params.isRecurring = this.showOnlyRecurring();
        }

        this.expenseService.getExpenses(params).subscribe({
            next: (response) => {
                this.expenses.set(response.expenses);
                this.totalRecords.set(response.pagination.total);
                this.calculateRecurringExpensesTotal();
                this.loading.set(false);
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar los gastos'
                });
                this.loading.set(false);
            }
        });
    }

    onPageChange(event: any) {
        this.page.set(event.page + 1);
        this.limit.set(event.rows);
        this.loadExpenses();
    }

    onCategoryFilterChange() {
        this.page.set(1);
        this.loadExpenses();
    }

    onDateRangeChange() {
        this.page.set(1);
        this.loadExpenses();
        this.calculateRecurringExpensesTotal();
    }

    clearFilters() {
        this.selectedCategory.set(undefined);
        this.dateRange.set(null);
        this.showOnlyRecurring.set(undefined);
        this.page.set(1);
        this.loadExpenses();
    }

    onRecurringFilterChange() {
        this.page.set(1);
        this.loadExpenses();
    }

    calculateRecurringExpensesTotal() {
        const params: any = {
            page: 1,
            limit: 1000, 
            isRecurring: true
        };

        if (this.dateRange() && this.dateRange()!.length === 2) {
            params.startDate = this.dateRange()![0].toISOString().split('T')[0];
            params.endDate = this.dateRange()![1].toISOString().split('T')[0];
        }

        this.expenseService.getExpenses(params).subscribe({
            next: (response) => {
                const recurringExpenses = response.expenses.filter(e => e.isRecurring);
                const total = recurringExpenses.reduce((sum, expense) => sum + expense.amountUSD, 0);
                this.recurringExpensesTotal.set(total);
                this.recurringExpensesCount.set(recurringExpenses.length);
            },
            error: (err) => {
                console.error('Error al calcular total de gastos recurrentes:', err);
            }
        });
    }

    openNew() {
        this.selectedExpense.set(null);
        this.isEditMode.set(false);
        this.formData.set({
            description: '',
            category: ExpenseCategory.OTHER,
            amount: 0,
            currency: 'USD',
            exchangeRate: undefined,
            notes: '',
            isRecurring: false,
            recurrenceFrequency: undefined,
            recurrenceStartDate: undefined
        });
        this.selectedProductId.set(null);
        this.productQuantity.set(0);
        this.recurrenceStartDateModel.set(null);
        this.displayDialog.set(true);
    }

    editExpense(expense: Expense) {
        this.selectedExpense.set(expense);
        this.isEditMode.set(true);
        this.formData.set({
            description: expense.description,
            category: expense.category,
            amount: Number(expense.amount),
            currency: expense.currency as 'USD' | 'VES',
            exchangeRate: expense.exchangeRate ? Number(expense.exchangeRate) : undefined,
            notes: expense.notes || '',
            isRecurring: expense.isRecurring || false,
            recurrenceFrequency: expense.recurrenceFrequency,
            recurrenceStartDate: expense.recurrenceStartDate
        });
        // Nota: En edición NO permitimos cambiar el producto vinculado por seguridad,
        // solo se puede ajustar manualmente en el inventario.
        this.selectedProductId.set(null); 
        this.productQuantity.set(0);

        if (expense.recurrenceStartDate) {
            this.recurrenceStartDateModel.set(new Date(expense.recurrenceStartDate));
        } else {
            this.recurrenceStartDateModel.set(null);
        }
        this.displayDialog.set(true);
    }

    saveExpense() {
        const data = this.formData();
        
        if (!data.description || data.amount <= 0) {
            this.messageService.add({severity: 'warn', summary: 'Validación', detail: 'Por favor complete descripción y monto'});
            return;
        }

        if (data.category === 'PRODUCTS' && !this.isEditMode() && (!this.selectedProductId() || this.productQuantity() <= 0)) {
            this.messageService.add({severity: 'warn', summary: 'Validación', detail: 'Seleccione un producto y cantidad válida'});
            return;
        }

        if (this.isEditMode() && this.selectedExpense()) {
            // Update
            const updateData: UpdateExpenseDto = { ...data };
            this.expenseService.updateExpense(this.selectedExpense()!.id, updateData).subscribe({
                next: () => {
                    this.messageService.add({severity: 'success', summary: 'Éxito', detail: 'Gasto actualizado'});
                    this.displayDialog.set(false);
                    this.loadExpenses();
                },
                error: (err) => this.messageService.add({severity: 'error', summary: 'Error', detail: err.error?.error})
            });
        } else {
            // Create
            this.expenseService.createExpense(data).subscribe({
                next: (createdExpense: Expense) => {
                    // Si es categoría PRODUCTOS, crear movimiento de inventario automáticamente
                    if (data.category === 'PRODUCTS' && this.selectedProductId()) {
                        this.createStockEntry(createdExpense.id);
                    } else {
                        this.finishCreate();
                    }
                },
                error: (err) => this.messageService.add({severity: 'error', summary: 'Error', detail: err.error?.error})
            });
        }
    }

    createStockEntry(expenseId: string) {
        if (!this.selectedProductId()) return;
        
        this.productService.createStockAdjustment({
            productId: this.selectedProductId()!,
            quantity: this.productQuantity(),
            type: 'IN',
            notes: `Compra registrada en Gasto #${expenseId.substring(0,8)}`
        }).subscribe({
            next: () => {
                this.messageService.add({severity: 'success', summary: 'Inventario', detail: 'Stock actualizado correctamente'});
                this.finishCreate();
            },
            error: (err) => {
                console.error('Error stock', err);
                this.messageService.add({severity: 'warn', summary: 'Aviso', detail: 'Gasto creado, pero falló actualizar inventario'});
                this.finishCreate();
            }
        });
    }

    finishCreate() {
        this.messageService.add({severity: 'success', summary: 'Éxito', detail: 'Gasto creado correctamente'});
        this.displayDialog.set(false);
        this.loadExpenses();
        this.loadPendingRecurringExpenses();
    }

    deleteExpense(expense: Expense) {
        this.confirmationService.confirm({
            message: `¿Está seguro de eliminar el gasto "${expense.description}"?`,
            header: 'Confirmar Eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.expenseService.deleteExpense(expense.id).subscribe({
                    next: () => {
                        this.messageService.add({severity: 'success', summary: 'Éxito', detail: 'Gasto eliminado'});
                        this.loadExpenses();
                    },
                    error: (err) => this.messageService.add({severity: 'error', summary: 'Error', detail: err.error?.error})
                });
            }
        });
    }

    // Helpers
    getCategoryLabel(category: ExpenseCategory): string { return this.expenseService.getCategoryLabel(category); }
    
    formatCurrency(amount: number | string, currency: string): string {
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        return new Intl.NumberFormat('es-VE', {
            style: 'currency',
            currency: currency === 'USD' ? 'USD' : 'VES',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(numAmount);
    }

    calculateUSDEquivalent(amount: number, exchangeRate?: number): number {
        if (!exchangeRate || exchangeRate <= 0) return 0;
        return amount / exchangeRate;
    }

    hasValidExchangeRate(): boolean {
        const data = this.formData();
        return data.amount > 0 && !!data.exchangeRate && data.exchangeRate > 0;
    }

    updateFormDescription(value: string) { this.formData.update(f => ({ ...f, description: value })); }
    
    updateFormCategory(value: ExpenseCategory) { 
        this.formData.update(f => ({ ...f, category: value })); 
        // Si cambia a PRODUCTS, asegurar que el usuario sepa que debe llenar los campos extra
    }
    
    updateFormAmount(value: string | number | null) {
        const numValue = value === null || value === undefined ? 0 : (typeof value === 'string' ? parseFloat(value) : value);
        this.formData.update(f => ({ ...f, amount: numValue || 0 }));
    }

    updateFormCurrency(value: 'USD' | 'VES') {
        this.formData.update(f => ({ ...f, currency: value }));
        if (value === 'USD') this.formData.update(f => ({ ...f, exchangeRate: undefined }));
    }

    updateFormExchangeRate(value: string | number | null) {
        const numValue = value === null || value === undefined ? undefined : (typeof value === 'string' ? parseFloat(value) : value);
        this.formData.update(f => ({ ...f, exchangeRate: numValue }));
    }

    updateFormNotes(value: string) { this.formData.update(f => ({ ...f, notes: value })); }

    updateFormIsRecurring(checked: boolean) {
        this.formData.update(f => ({ ...f, isRecurring: checked, recurrenceFrequency: checked ? f.recurrenceFrequency : undefined }));
    }

    updateFormRecurrenceFrequency(value: RecurrenceFrequency | undefined) {
        this.formData.update(f => ({ ...f, recurrenceFrequency: value }));
    }

    updateFormRecurrenceStartDate(value: Date | null) {
        this.recurrenceStartDateModel.set(value);
        this.formData.update(f => ({ ...f, recurrenceStartDate: value ? value.toISOString().split('T')[0] : undefined }));
    }

    generateNextRecurringExpense(expense: Expense) {
        this.expenseService.generateNextRecurringExpense(expense.id).subscribe({
            next: (response) => {
                this.messageService.add({severity: 'success', summary: 'Éxito', detail: response.message});
                this.loadExpenses();
                this.loadPendingRecurringExpenses();
            },
            error: (err) => this.messageService.add({severity: 'error', summary: 'Error', detail: err.error?.error})
        });
    }

    getRecurrenceLabel(frequency?: RecurrenceFrequency): string {
        if (!frequency) return '';
        return this.expenseService.getRecurrenceLabel(frequency);
    }

    isDueTodayOrPast(nextDueDate?: string): boolean {
        if (!nextDueDate) return false;
        const dueDate = new Date(nextDueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate <= today;
    }

    // Product helper
    updateSelectedProduct(productId: string) {
        this.selectedProductId.set(productId);
        const product = this.products().find(p => p.id === productId);
        if (product) {
            // Autocompletar descripción si está vacía
            if (!this.formData().description) {
                this.updateFormDescription(`Compra de ${product.name}`);
            }
        }
    }
}
