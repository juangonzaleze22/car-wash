import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BrandService } from '../../../core/services/brand.service';

@Component({
    selector: 'app-brand-logo',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <a [routerLink]="homeLink" class="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer text-decoration-none">
      @if (brandService.businessLogo()) {
        <img [src]="brandService.businessLogo()" class="w-36 h-12 object-contain" alt="Logo">
      } @else {
        <div class="flex items-center gap-2">
            <i [class]="'pi text-blue-500 text-2xl ' + fallbackIcon"></i>
            <span class="font-bold text-xl text-gray-800 dark:text-white">{{ brandService.businessName() }}</span>
        </div>
      }
    </a>
  `
})
export class BrandLogoComponent {
    @Input({ required: true }) homeLink!: string;
    @Input() fallbackIcon: string = 'pi-car';
    brandService = inject(BrandService);
}
