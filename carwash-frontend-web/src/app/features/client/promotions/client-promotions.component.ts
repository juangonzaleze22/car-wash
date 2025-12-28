import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';

@Component({
    selector: 'app-client-promotions',
    standalone: true,
    imports: [
        CommonModule,
        CardModule
    ],
    templateUrl: './client-promotions.component.html',
    styleUrl: './client-promotions.component.css'
})
export class ClientPromotionsComponent {
}

