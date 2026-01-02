import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ProductService } from '../../../core/services/product.service';
import { ButtonModule } from 'primeng/button';
import { SidebarModule } from 'primeng/sidebar';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';
import { AppHeaderComponent } from '../../../shared/components/app-header/app-header.component';
import { BrandService } from '../../../core/services/brand.service';
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component';
import { SidebarMenuComponent, MenuItem } from '../../../shared/components/sidebar-menu/sidebar-menu.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ButtonModule,
    SidebarModule,
    AvatarModule,
    MenuModule,
    TooltipModule,
    BadgeModule,
    AppHeaderComponent,
    BrandLogoComponent,
    SidebarMenuComponent
  ],
  styleUrl: './admin-layout.component.css',
  template: `
    <div class="flex h-screen bg-gray-100 dark:bg-gray-900">
      <!-- Overlay for mobile sidebar -->
      @if (sidebarVisible() && isMobile()) {
        <div class="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" (click)="toggleSidebar()"></div>
      }

      <!-- Sidebar -->
      <div 
        class="w-64 bg-white dark:bg-gray-800 shadow-lg flex flex-col fixed lg:static h-full z-50 transition-transform duration-300"
        [class.translate-x-0]="sidebarVisible() || !isMobile()"
        [class.-translate-x-full]="!sidebarVisible() && isMobile()">
        <div class="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
          <app-brand-logo homeLink="/admin/dashboard" fallbackIcon="pi-shield"></app-brand-logo>
          <button 
            pButton 
            icon="pi pi-times" 
            [text]="true" 
            [rounded]="true"
            class="lg:hidden"
            (click)="toggleSidebar()"></button>
        </div>

        <div class="flex-1 overflow-y-auto">
          <app-sidebar-menu 
            [items]="menuItems()" 
            themeColor="purple" 
            (menuClick)="closeSidebarOnMobile()">
          </app-sidebar-menu>
        </div>

        <div class="p-3 border-t border-gray-200 dark:border-gray-700">
          <!-- Theme Toggle -->
          <div class="mb-3">
            <button pButton 
              [icon]="themeService.isDarkMode() ? 'pi pi-sun' : 'pi pi-moon'" 
              [label]="themeService.isDarkMode() ? 'Modo Claro' : 'Modo Oscuro'"
              class="p-button-outlined w-full" 
              (click)="themeService.toggleTheme()">
            </button>
          </div>
          
          <div class="flex items-center gap-3 p-2">
            <p-avatar icon="pi pi-user" shape="circle" styleClass="bg-purple-600 text-white"></p-avatar>
            <div class="flex flex-col">
              <span class="font-bold text-sm text-gray-800 dark:text-white">{{ authService.currentUser()?.username }}</span>
              <span class="text-xs text-gray-500">{{ authService.currentUser()?.role }}</span>
            </div>
            <button pButton icon="pi pi-sign-out" class="p-button-text p-button-rounded p-button-danger ml-auto" (click)="authService.logout()"></button>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <app-app-header [toggleSidebarFn]="toggleSidebar.bind(this)"></app-app-header>
        <div class="flex-1 overflow-auto p-4">
          <router-outlet></router-outlet>
        </div>
      </div>

      <!-- Floating Action Button for New Order -->
      <div 
        class="fab-button-wrapper"
        pTooltip="Nuevo Ingreso"
        tooltipPosition="left">
        <button 
          (click)="navigateToCheckIn()"
          class="fab-button"
          aria-label="Crear nuevo ingreso">
          <i class="pi pi-plus text-2xl"></i>
        </button>
      </div>
    </div>
  `
})
export class AdminLayoutComponent implements OnInit {
  authService = inject(AuthService);
  themeService = inject(ThemeService);
  productService = inject(ProductService);
  brandService = inject(BrandService);
  router = inject(Router);
  sidebarVisible = signal(false);
  lowStockCount = signal(0);

  menuItems = computed<MenuItem[]>(() => [
    { label: 'Dashboard', icon: 'pi pi-th-large', route: '/admin/dashboard' },
    { label: 'Servicios y % Comisión', icon: 'pi pi-percentage', route: '/admin/services' },
    { label: 'Lavadores', icon: 'pi pi-users', route: '/admin/washers' },
    { label: 'Ganancias Lavadores', icon: 'pi pi-dollar', route: '/admin/washer-earnings' },
    { label: 'Gastos', icon: 'pi pi-money-bill', route: '/admin/expenses' },
    {
      label: 'Productos e Inventario',
      icon: 'pi pi-box',
      route: '/admin/products',
      badge: this.lowStockCount() > 0 ? this.lowStockCount().toString() : undefined
    },
    { label: 'Vehículos', icon: 'pi pi-car', route: '/admin/vehicles' },
    { label: 'Tipo de Vehículo', icon: 'pi pi-tags', route: '/admin/categories' },
    { label: 'Nuevo Ingreso', icon: 'pi pi-plus-circle', route: '/admin/check-in' },
    { label: 'Registro de Órdenes', icon: 'pi pi-list', route: '/admin/orders' },
    { label: 'Solicitudes', icon: 'pi pi-map-marker', route: '/admin/requests' },
    { label: 'Configuración', icon: 'pi pi-cog', route: '/admin/config' },
    { label: 'Reporte Diario', icon: 'pi pi-file-pdf', route: '/admin/daily-report' },
  ]);

  ngOnInit() {
    this.checkStock();
  }

  checkStock() {
    this.productService.checkLowStock().subscribe({
      next: (count) => this.lowStockCount.set(count),
      error: (err) => console.error('Error checking stock', err)
    });
  }

  isMobile(): boolean {
    return window.innerWidth < 992;
  }

  toggleSidebar() {
    this.sidebarVisible.update(v => !v);
  }

  closeSidebarOnMobile() {
    if (this.isMobile()) {
      this.sidebarVisible.set(false);
    }
  }

  navigateToCheckIn() {
    this.router.navigate(['/admin/check-in']);
  }
}