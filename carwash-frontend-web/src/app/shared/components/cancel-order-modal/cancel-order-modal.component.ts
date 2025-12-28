import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { Order } from '../../interfaces/order.interface';

@Component({
    selector: 'app-cancel-order-modal',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        ButtonModule,
        InputTextareaModule
    ],
    templateUrl: './cancel-order-modal.component.html',
    styleUrl: './cancel-order-modal.component.css'
})
export class CancelOrderModalComponent {
    visible = input.required<boolean>();
    order = input<Order | null>(null);
    
    onCancel = output<{ order: Order; reason: string }>();
    onClose = output<void>();

    cancellationReason = signal<string>('');

    onVisibleChange(visible: boolean) {
        if (!visible) {
            this.cancellationReason.set('');
            this.onClose.emit();
        }
    }

    confirmCancel() {
        const order = this.order();
        const reason = this.cancellationReason().trim();
        
        if (!order || !reason) {
            return;
        }

        this.onCancel.emit({ order, reason });
    }

    canConfirm(): boolean {
        return this.cancellationReason().trim().length > 0;
    }
}

