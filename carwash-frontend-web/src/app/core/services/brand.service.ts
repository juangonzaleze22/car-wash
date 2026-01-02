import { Injectable, inject, signal } from '@angular/core';
import { ConfigService } from './config.service';

@Injectable({
    providedIn: 'root'
})
export class BrandService {
    private configService = inject(ConfigService);

    // Business identity signals
    businessName = signal<string>('CarWash Pro');
    businessLogo = signal<string>('assets/images/logo.png');

    // Base URL for backend uploads
    private baseUrl = 'http://localhost:3000';

    constructor() {
        this.loadBranding();
    }

    loadBranding() {
        this.configService.getBranding().subscribe({
            next: (configs) => {
                const nameConfig = configs.find(c => c.key === 'BUSINESS_NAME');
                const logoConfig = configs.find(c => c.key === 'BUSINESS_LOGO');

                if (nameConfig) {
                    this.businessName.set(nameConfig.value);
                }

                if (logoConfig) {
                    // Construct full URL for the logo
                    const logoPath = logoConfig.value;
                    const fullLogoUrl = logoPath.startsWith('http')
                        ? logoPath
                        : `${this.baseUrl}${logoPath}`;
                    this.businessLogo.set(fullLogoUrl);
                }
            },
            error: (err) => console.error('Error loading branding configs:', err)
        });
    }

    updateName(newName: string) {
        this.configService.updateConfig('BUSINESS_NAME', {
            value: newName,
            description: 'Nombre comercial del establecimiento'
        }).subscribe({
            next: () => this.businessName.set(newName),
            error: (err) => console.error('Error updating business name:', err)
        });
    }

    updateLogo(file: File) {
        this.configService.uploadLogo(file).subscribe({
            next: (config) => {
                const fullLogoUrl = `${this.baseUrl}${config.value}`;
                this.businessLogo.set(fullLogoUrl);
            },
            error: (err) => console.error('Error uploading logo:', err)
        });
    }
}
