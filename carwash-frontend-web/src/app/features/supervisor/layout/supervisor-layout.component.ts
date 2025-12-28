import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ButtonModule } from 'primeng/button';
import { SidebarModule } from 'primeng/sidebar';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { AppHeaderComponent } from '../../../shared/components/app-header/app-header.component';

@Component({
  selector: 'app-supervisor-layout',
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
    AppHeaderComponent
  ],
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
            <i class="pi pi-car text-2xl text-blue-600"></i>
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
          <a routerLink="/supervisor/dashboard" routerLinkActive="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" class="p-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 no-underline flex items-center gap-2 transition-colors cursor-pointer" (click)="closeSidebarOnMobile()">
            <i class="pi pi-th-large"></i>
            <span class="font-medium">Patio Dashboard</span>
          </a>
          <a routerLink="/supervisor/check-in" routerLinkActive="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" class="p-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 no-underline flex items-center gap-2 transition-colors cursor-pointer" (click)="closeSidebarOnMobile()">
            <i class="pi pi-plus-circle"></i>
            <span class="font-medium">Nuevo Ingreso</span>
          </a>
          <a routerLink="/supervisor/orders" routerLinkActive="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" class="p-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-800 no-underline flex items-center gap-2 transition-colors cursor-pointer" (click)="closeSidebarOnMobile()">
            <i class="pi pi-list"></i>
            <span class="font-medium">Registro de Órdenes</span>
          </a>
          <a routerLink="/supervisor/requests" routerLinkActive="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" class="p-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-800 no-underline flex items-center gap-2 transition-colors cursor-pointer" (click)="closeSidebarOnMobile()">
            <i class="pi pi-map-marker"></i>
            <span class="font-medium">Solicitudes</span>
          </a>
          <a routerLink="/supervisor/inventory" routerLinkActive="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" class="p-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-800 no-underline flex items-center gap-2 transition-colors cursor-pointer" (click)="closeSidebarOnMobile()">
            <i class="pi pi-box"></i>
            <span class="font-medium">Cierre de Inventario</span>
          </a>
          <a routerLink="/supervisor/daily-report" routerLinkActive="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" class="p-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-800 no-underline flex items-center gap-2 transition-colors cursor-pointer" (click)="closeSidebarOnMobile()">
            <i class="pi pi-file-excel"></i>
            <span class="font-medium">Cierre de Caja</span>
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
            <p-avatar icon="pi pi-user" shape="circle" styleClass="bg-blue-600 text-white"></p-avatar>
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
    </div>
  `
})
export class SupervisorLayoutComponent {
  authService = inject(AuthService);
  themeService = inject(ThemeService);
  sidebarVisible = signal(false);

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
}