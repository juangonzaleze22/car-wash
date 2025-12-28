import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ClientAuthService } from '../../../core/services/client-auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ButtonModule } from 'primeng/button';
import { SidebarModule } from 'primeng/sidebar';
import { AvatarModule } from 'primeng/avatar';
import { ClientHeaderComponent } from '../../../shared/components/client-header/client-header.component';

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ButtonModule,
    SidebarModule,
    AvatarModule,
    ClientHeaderComponent
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
          <a routerLink="/client/dashboard" routerLinkActive="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" class="p-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 no-underline flex items-center gap-2 transition-colors cursor-pointer" (click)="closeSidebarOnMobile()">
            <i class="pi pi-home"></i>
            <span class="font-medium">Mi Dashboard</span>
          </a>
          <a routerLink="/client/orders" routerLinkActive="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" class="p-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 no-underline flex items-center gap-2 transition-colors cursor-pointer" (click)="closeSidebarOnMobile()">
            <i class="pi pi-list"></i>
            <span class="font-medium">Mis Órdenes</span>
          </a>
          <a routerLink="/client/request-wash" routerLinkActive="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" class="p-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 no-underline flex items-center gap-2 transition-colors cursor-pointer" (click)="closeSidebarOnMobile()">
            <i class="pi pi-map-marker"></i>
            <span class="font-medium">Solicitar Lavado</span>
          </a>
          <a routerLink="/client/vehicles" routerLinkActive="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" class="p-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 no-underline flex items-center gap-2 transition-colors cursor-pointer" (click)="closeSidebarOnMobile()">
            <i class="pi pi-car"></i>
            <span class="font-medium">Mis Vehículos</span>
          </a>
          <a routerLink="/client/services" routerLinkActive="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" class="p-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 no-underline flex items-center gap-2 transition-colors cursor-pointer" (click)="closeSidebarOnMobile()">
            <i class="pi pi-shopping-cart"></i>
            <span class="font-medium">Servicios</span>
          </a>
          <a routerLink="/client/promotions" routerLinkActive="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" class="p-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 no-underline flex items-center gap-2 transition-colors cursor-pointer" (click)="closeSidebarOnMobile()">
            <i class="pi pi-tag"></i>
            <span class="font-medium">Promociones</span>
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
              <span class="font-bold text-sm text-gray-800 dark:text-white">{{ clientAuthService.currentClient()?.name }}</span>
              <span class="text-xs text-gray-500">{{ clientAuthService.currentClient()?.phone }}</span>
            </div>
            <button pButton icon="pi pi-sign-out" class="p-button-text p-button-rounded p-button-danger ml-auto" (click)="clientAuthService.logout()"></button>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <app-client-header [toggleSidebarFn]="toggleSidebar.bind(this)"></app-client-header>
        <div class="flex-1 overflow-auto p-4">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `
})
export class ClientLayoutComponent {
  clientAuthService = inject(ClientAuthService);
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

