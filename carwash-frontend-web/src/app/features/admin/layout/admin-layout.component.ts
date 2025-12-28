import { Component, inject, signal, OnInit } from '@angular/core';
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
    AppHeaderComponent
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
          <div class="flex items-center gap-2">
            <i class="pi pi-shield text-2xl text-purple-600"></i>
            <span class="font-bold text-xl text-gray-800 dark:text-white">CarWash Pro</span>
          </div>
          <button 
            pButton 
            icon="pi pi-times" 
            [text]="true" 
            [rounded]="true"
            class="lg:hidden"
            (click)="toggleSidebar()"></button>
        </div>

        <div class="flex-1 p-3 flex flex-col gap-2 overflow-y-auto">
          <a routerLink="/admin/dashboard" routerLinkActive="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" class="p-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 no-underline flex items-center gap-2 transition-colors cursor-pointer" (click)="closeSidebarOnMobile()">
            <i class="pi pi-th-large"></i>
            <span class="font-medium">Dashboard</span>
          </a>
          <a routerLink="/admin/services" routerLinkActive="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" class="p-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 no-underline flex items-center gap-2 transition-colors cursor-pointer" (click)="closeSidebarOnMobile()">
            <i class="pi pi-percentage"></i>
            <span class="font-medium">Servicios y % Comisión</span>
          </a>
          <a routerLink="/admin/washers" routerLinkActive="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" class="p-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 no-underline flex items-center gap-2 transition-colors cursor-pointer" (click)="closeSidebarOnMobile()">
            <i class="pi pi-users"></i>
            <span class="font-medium">Lavadores</span>
          </a>
          <a routerLink="/admin/washer-earnings" routerLinkActive="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" class="p-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 no-underline flex items-center gap-2 transition-colors cursor-pointer" (click)="closeSidebarOnMobile()">
            <i class="pi pi-dollar"></i>
            <span class="font-medium">Ganancias Lavadores</span>
          </a>
          <a routerLink="/admin/expenses" routerLinkActive="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" class="p-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 no-underline flex items-center gap-2 transition-colors cursor-pointer" (click)="closeSidebarOnMobile()">
            <i class="pi pi-money-bill"></i>
            <span class="font-medium">Gastos</span>
          </a>
          <a routerLink="/admin/products" routerLinkActive="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" class="p-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 no-underline flex items-center gap-2 transition-colors cursor-pointer" (click)="closeSidebarOnMobile()">
            <i class="pi pi-box"></i>
            <span class="font-medium">Productos e Inventario</span>
            @if (lowStockCount() > 0) {
              <p-badge [value]="lowStockCount().toString()" severity="danger" styleClass="ml-auto"></p-badge>
            }
          </a>
              <a routerLink="/admin/vehicles" routerLinkActive="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" class="p-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 no-underline flex items-center gap-2 transition-colors cursor-pointer" (click)="closeSidebarOnMobile()">
                <i class="pi pi-car"></i>
                <span class="font-medium">Vehiculos</span>
              </a>
          <a routerLink="/admin/categories" routerLinkActive="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" class="p-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 no-underline flex items-center gap-2 transition-colors cursor-pointer" (click)="closeSidebarOnMobile()">
            <i class="pi pi-tags"></i>
            <span class="font-medium">Tipo de Vehículo</span>
          </a>
          <a routerLink="/admin/check-in" routerLinkActive="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" class="p-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 no-underline flex items-center gap-2 transition-colors cursor-pointer" (click)="closeSidebarOnMobile()">
            <i class="pi pi-plus-circle"></i>
            <span class="font-medium">Nuevo Ingreso</span>
          </a>
          <a routerLink="/admin/orders" routerLinkActive="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" class="p-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 no-underline flex items-center gap-2 transition-colors cursor-pointer" (click)="closeSidebarOnMobile()">
            <i class="pi pi-list"></i>
            <span class="font-medium">Registro de Órdenes</span>
          </a>
          <a routerLink="/admin/requests" routerLinkActive="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" class="p-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 no-underline flex items-center gap-2 transition-colors cursor-pointer" (click)="closeSidebarOnMobile()">
            <i class="pi pi-map-marker"></i>
            <span class="font-medium">Solicitudes</span>
          </a>
          <a routerLink="/admin/config" routerLinkActive="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" class="p-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 no-underline flex items-center gap-2 transition-colors cursor-pointer" (click)="closeSidebarOnMobile()">
            <i class="pi pi-cog"></i>
            <span class="font-medium">Configuración</span>
          </a>
          <a routerLink="/admin/daily-report" routerLinkActive="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" class="p-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 no-underline flex items-center gap-2 transition-colors cursor-pointer" (click)="closeSidebarOnMobile()">
            <i class="pi pi-file-pdf"></i>
            <span class="font-medium">Reporte Diario</span>
          </a>
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
  router = inject(Router);
  sidebarVisible = signal(false);
  lowStockCount = signal(0);

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