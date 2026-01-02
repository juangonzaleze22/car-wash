import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ButtonModule } from 'primeng/button';
import { SidebarModule } from 'primeng/sidebar';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { AppHeaderComponent } from '../../../shared/components/app-header/app-header.component';
import { BrandService } from '../../../core/services/brand.service';
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component';
import { SidebarMenuComponent, MenuItem } from '../../../shared/components/sidebar-menu/sidebar-menu.component';

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
    AppHeaderComponent,
    BrandLogoComponent,
    SidebarMenuComponent
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
          <app-brand-logo homeLink="/supervisor/dashboard"></app-brand-logo>
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
            themeColor="blue" 
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
  brandService = inject(BrandService);
  sidebarVisible = signal(false);

  menuItems = signal<MenuItem[]>([
    { label: 'Patio Dashboard', icon: 'pi pi-th-large', route: '/supervisor/dashboard' },
    { label: 'Nuevo Ingreso', icon: 'pi pi-plus-circle', route: '/supervisor/check-in' },
    { label: 'Registro de Órdenes', icon: 'pi pi-list', route: '/supervisor/orders' },
    { label: 'Solicitudes', icon: 'pi pi-map-marker', route: '/supervisor/requests' },
    { label: 'Cierre de Inventario', icon: 'pi pi-box', route: '/supervisor/inventory' },
    { label: 'Cierre de Caja', icon: 'pi pi-file-excel', route: '/supervisor/daily-report' }
  ]);

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