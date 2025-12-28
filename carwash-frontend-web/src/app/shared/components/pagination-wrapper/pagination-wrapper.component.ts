import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaginatorModule } from 'primeng/paginator';
import { Pagination } from '../../interfaces/order.interface';

@Component({
    selector: 'app-pagination-wrapper',
    standalone: true,
    imports: [
        CommonModule,
        PaginatorModule
    ],
    templateUrl: './pagination-wrapper.component.html',
    styleUrl: './pagination-wrapper.component.css'
})
export class PaginationWrapperComponent {
    pagination = input.required<Pagination>();
    rowsPerPageOptions = input<number[]>([10, 20, 50, 100]);
    showCurrentPageReport = input<boolean>(true);
    currentPageReportTemplate = input<string>('Mostrando {first} a {last} de {totalRecords} registros');
    
    onPageChange = output<any>();

    get first(): number {
        return (this.pagination().page - 1) * this.pagination().limit;
    }
}

