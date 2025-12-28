import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs/operators';

export interface Product {
  id: string;
  name: string;
  description?: string;
  unit: string;
  minStock: number;
  currentStock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  movements?: StockMovement[];
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'IN' | 'OUT' | 'ADJUST' | 'DAILY_CHECK';
  quantity: number;
  previousStock: number;
  newStock: number;
  notes?: string;
  createdAt: string;
  createdById?: string;
  createdBy?: {
    name: string;
    username: string;
  };
  expense?: {
      id: string;
      description: string;
  };
}

export interface CreateProductDto {
  name: string;
  description?: string;
  unit: string;
  minStock: number;
  currentStock?: number;
  isActive?: boolean;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  unit?: string;
  minStock?: number;
  isActive?: boolean;
}

export interface StockAdjustmentDto {
  productId: string;
  quantity: number;
  type: 'IN' | 'OUT' | 'ADJUST';
  notes?: string;
}

export interface DailyInventoryItem {
  productId: string;
  actualStock: number;
}

export interface DailyInventoryCheckDto {
  items: DailyInventoryItem[];
  notes?: string;
}

export interface KardexResponse {
    data: StockMovement[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) {}

  getProducts(activeOnly: boolean = false): Observable<Product[]> {
    let params = new HttpParams();
    if (activeOnly) {
      params = params.set('active', 'true');
    }
    return this.http.get<Product[]>(this.apiUrl, { params }).pipe(
      map(products => products.map(p => ({
        ...p,
        currentStock: Number(p.currentStock),
        minStock: Number(p.minStock)
      })))
    );
  }

  getProductById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`).pipe(
      map(p => ({
        ...p,
        currentStock: Number(p.currentStock),
        minStock: Number(p.minStock)
      }))
    );
  }

  getProductKardex(id: string, page: number = 1, limit: number = 20): Observable<KardexResponse> {
    const params = new HttpParams()
        .set('page', page.toString())
        .set('limit', limit.toString());
    return this.http.get<KardexResponse>(`${this.apiUrl}/${id}/kardex`, { params }).pipe(
        map(res => ({
            ...res,
            data: res.data.map(m => ({
                ...m,
                quantity: Number(m.quantity),
                previousStock: Number(m.previousStock),
                newStock: Number(m.newStock)
            }))
        }))
    );
  }

  createProduct(data: CreateProductDto): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, data);
  }

  updateProduct(id: string, data: UpdateProductDto): Observable<Product> {
    return this.http.patch<Product>(`${this.apiUrl}/${id}`, data);
  }

  createStockAdjustment(data: StockAdjustmentDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/adjustment`, data);
  }

  submitDailyCheck(data: DailyInventoryCheckDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/daily-check`, data);
  }

  checkLowStock(): Observable<number> {
    // Obtenemos solo los activos y filtramos en frontend
    return this.getProducts(true).pipe(
      map(products => products.filter(p => p.currentStock <= p.minStock).length)
    );
  }
}
