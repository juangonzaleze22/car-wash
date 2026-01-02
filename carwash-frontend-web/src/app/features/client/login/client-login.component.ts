import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ClientAuthService } from '../../../core/services/client-auth.service';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { InputMaskModule } from 'primeng/inputmask';
import { BrandService } from '../../../core/services/brand.service';

@Component({
    selector: 'app-client-login',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        CardModule,
        InputTextModule,
        InputMaskModule,
        PasswordModule,
        ButtonModule,
        ToastModule
    ],
    providers: [MessageService],
    templateUrl: './client-login.component.html',
    styleUrls: ['./client-login.component.css']
})
export class ClientLoginComponent {
    private fb = inject(FormBuilder);
    private clientAuthService = inject(ClientAuthService);
    private messageService = inject(MessageService);
    brandService = inject(BrandService);

    loginForm = this.fb.group({
        phone: ['', [Validators.required, Validators.minLength(10)]],
        password: ['', Validators.required]
    });

    loading = false;

    /**
     * Limpia el teléfono removiendo caracteres de formato (paréntesis, espacios, guiones)
     * Ejemplo: "(0414) 575 7263" -> "04145757263"
     */
    cleanPhoneNumber(phone: string): string {
        if (!phone) return '';
        // Remover todos los caracteres que no sean números
        return phone.replace(/\D/g, '');
    }

    onSubmit() {
        if (this.loginForm.valid) {
            this.loading = true;
            // Limpiar el teléfono antes de enviarlo (quitar formato visual)
            const cleanPhone = this.cleanPhoneNumber(this.loginForm.value.phone || '');
            this.clientAuthService.login({ phone: cleanPhone, password: this.loginForm.value.password || '' }).subscribe({
                next: () => {
                    this.loading = false;
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Bienvenido',
                        detail: 'Has iniciado sesión correctamente'
                    });
                },
                error: (err) => {
                    this.loading = false;
                    const errorMessage = err.error?.error || 'Error al iniciar sesión';
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: errorMessage
                    });
                }
            });
        }
    }
}

