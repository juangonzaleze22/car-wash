import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export enum ExpenseCategory {
    RENT = 'RENT',
    PRODUCTS = 'PRODUCTS',
    UTILITIES = 'UTILITIES',
    SALARIES = 'SALARIES',
    MAINTENANCE = 'MAINTENANCE',
    MARKETING = 'MARKETING',
    OTHER = 'OTHER'
}

export enum RecurrenceFrequency {
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
    QUARTERLY = 'QUARTERLY',
    YEARLY = 'YEARLY'
}

export interface Expense {
    id: string;
    description: string;
    category: ExpenseCategory;
    amount: number;
    currency: string;
    exchangeRate?: number;
    amountUSD: number;
    notes?: string;
    createdById: string;
    createdAt: string;
    updatedAt: string;
    isRecurring?: boolean;
    recurrenceFrequency?: RecurrenceFrequency;
    recurrenceStartDate?: string;
    recurrenceTemplateId?: string;
    nextDueDate?: string;
    createdBy?: {
        id: string;
        username: string;
    };
}

export interface CreateExpenseDto {
    description: string;
    category: ExpenseCategory;
    amount: number;
    currency: 'USD' | 'VES';
    exchangeRate?: number;
    notes?: string;
    isRecurring?: boolean;
    recurrenceFrequency?: RecurrenceFrequency;
    recurrenceStartDate?: string;
}

export interface UpdateExpenseDto {
    description?: string;
    category?: ExpenseCategory;
    amount?: number;
    currency?: 'USD' | 'VES';
    exchangeRate?: number;
    notes?: string;
    isRecurring?: boolean;
    recurrenceFrequency?: RecurrenceFrequency;
    recurrenceStartDate?: string;
}

export interface ExpensesResponse {
    expenses: Expense[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface ExpensesSummary {
    totalExpenses: number;
    totalCount: number;
    byCategory: Array<{
        category: ExpenseCategory;
        total: number;
        count: number;
    }>;
}

@Injectable({
    providedIn: 'root'
})
export class ExpenseService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:3000/api/expenses';

    getExpenses(params?: {
        page?: number;
        limit?: number;
        category?: ExpenseCategory;
        startDate?: string;
        endDate?: string;
        isRecurring?: boolean;
    }): Observable<ExpensesResponse> {
        let httpParams = new HttpParams();
        if (params?.page) {
            httpParams = httpParams.set('page', params.page.toString());
        }
        if (params?.limit) {
            httpParams = httpParams.set('limit', params.limit.toString());
        }
        if (params?.category) {
            httpParams = httpParams.set('category', params.category);
        }
        if (params?.startDate) {
            httpParams = httpParams.set('startDate', params.startDate);
        }
        if (params?.endDate) {
            httpParams = httpParams.set('endDate', params.endDate);
        }
        if (params?.isRecurring !== undefined) {
            httpParams = httpParams.set('isRecurring', params.isRecurring.toString());
        }
        return this.http.get<ExpensesResponse>(this.apiUrl, { params: httpParams });
    }

    getExpenseById(id: string): Observable<Expense> {
        return this.http.get<Expense>(`${this.apiUrl}/${id}`);
    }

    createExpense(expense: CreateExpenseDto): Observable<Expense> {
        return this.http.post<Expense>(this.apiUrl, expense);
    }

    updateExpense(id: string, expense: UpdateExpenseDto): Observable<Expense> {
        return this.http.patch<Expense>(`${this.apiUrl}/${id}`, expense);
    }

    deleteExpense(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    getExpensesSummary(params?: {
        startDate?: string;
        endDate?: string;
    }): Observable<ExpensesSummary> {
        let httpParams = new HttpParams();
        if (params?.startDate) {
            httpParams = httpParams.set('startDate', params.startDate);
        }
        if (params?.endDate) {
            httpParams = httpParams.set('endDate', params.endDate);
        }
        return this.http.get<ExpensesSummary>(`${this.apiUrl}/summary`, { params: httpParams });
    }

    getCategoryLabel(category: ExpenseCategory): string {
        const labels: Record<ExpenseCategory, string> = {
            [ExpenseCategory.RENT]: 'Alquiler',
            [ExpenseCategory.PRODUCTS]: 'Productos',
            [ExpenseCategory.UTILITIES]: 'Servicios',
            [ExpenseCategory.SALARIES]: 'Salarios',
            [ExpenseCategory.MAINTENANCE]: 'Mantenimiento',
            [ExpenseCategory.MARKETING]: 'Marketing',
            [ExpenseCategory.OTHER]: 'Otros',
        };
        return labels[category] || category;
    }

    getRecurrenceLabel(frequency: RecurrenceFrequency): string {
        const labels: Record<RecurrenceFrequency, string> = {
            [RecurrenceFrequency.WEEKLY]: 'Semanal',
            [RecurrenceFrequency.MONTHLY]: 'Mensual',
            [RecurrenceFrequency.QUARTERLY]: 'Trimestral',
            [RecurrenceFrequency.YEARLY]: 'Anual',
        };
        return labels[frequency] || frequency;
    }

    generateNextRecurringExpense(id: string): Observable<{ expense: Expense; nextDueDate: string; message: string }> {
        return this.http.post<{ expense: Expense; nextDueDate: string; message: string }>(
            `${this.apiUrl}/${id}/generate-next`,
            {}
        );
    }

    getPendingRecurringExpenses(): Observable<{ expenses: Expense[] }> {
        return this.http.get<{ expenses: Expense[] }>(`${this.apiUrl}/recurring/pending`);
    }

    getUpcomingRecurringExpenses(limit?: number): Observable<{ expenses: Expense[] }> {
        let httpParams = new HttpParams();
        if (limit) {
            httpParams = httpParams.set('limit', limit.toString());
        }
        return this.http.get<{ expenses: Expense[] }>(`${this.apiUrl}/recurring/upcoming`, { params: httpParams });
    }
}

