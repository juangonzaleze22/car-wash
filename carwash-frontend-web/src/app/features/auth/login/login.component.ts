import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { BrandService } from '../../../core/services/brand.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        CardModule,
        InputTextModule,
        PasswordModule,
        ButtonModule,
        ToastModule
    ],
    providers: [MessageService],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private messageService = inject(MessageService);
    brandService = inject(BrandService);

    loginForm = this.fb.group({
        username: ['', Validators.required],
        password: ['', Validators.required]
    });

    loading = false;

    onSubmit() {
        if (this.loginForm.valid) {
            this.loading = true;
            this.authService.login(this.loginForm.value).subscribe({
                next: () => {
                    this.loading = false;
                    this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Bienvenido' });
                },
                error: (err) => {
                    this.loading = false;
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Credenciales inválidas' });
                }
            });
        }
    }
}
