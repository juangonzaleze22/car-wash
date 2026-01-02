import { Component, inject, signal, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ClientAuthService } from '../../../core/services/client-auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ButtonModule } from 'primeng/button';
import { SidebarModule } from 'primeng/sidebar';
import { AvatarModule } from 'primeng/avatar';
import { ClientHeaderComponent } from '../../../shared/components/client-header/client-header.component';
import { BrandService } from '../../../core/services/brand.service';
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component';
import { SidebarMenuComponent, MenuItem } from '../../../shared/components/sidebar-menu/sidebar-menu.component';

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
    ClientHeaderComponent,
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
        class="bg-white dark:bg-gray-800 shadow-lg flex flex-col fixed lg:static h-full z-50 transition-all duration-300 overflow-hidden"
        [class.w-0]="!sidebarVisible() && !isMobile()"
        [class.w-64]="sidebarVisible() || isMobile()"
        [class.translate-x-0]="sidebarVisible() || !isMobile()"
        [class.-translate-x-full]="!sidebarVisible() && isMobile()"
        [style.width]="(!sidebarVisible() && !isMobile()) ? '0px' : '256px'">

        <div class="w-64 flex flex-col h-full">
          <div class="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 min-w-[256px]">
            <app-brand-logo homeLink="/client/dashboard"></app-brand-logo>
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
                <span class="font-bold text-sm text-gray-800 dark:text-white">{{ clientAuthService.currentClient()?.name }}</span>
                <span class="text-xs text-gray-500">{{ clientAuthService.currentClient()?.phone }}</span>
              </div>
              <button pButton icon="pi pi-sign-out" class="p-button-text p-button-rounded p-button-danger ml-auto" (click)="clientAuthService.logout()"></button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 flex flex-col overflow-hidden transition-all duration-300">
        <app-client-header [toggleSidebarFn]="toggleSidebar.bind(this)"></app-client-header>
        <div class="flex-1 overflow-auto p-4">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `
})
export class ClientLayoutComponent implements OnInit {
  clientAuthService = inject(ClientAuthService);
  themeService = inject(ThemeService);
  brandService = inject(BrandService);
  sidebarVisible = signal(true);

  menuItems = signal<MenuItem[]>([
    { label: 'Mi Dashboard', icon: 'pi pi-home', route: '/client/dashboard' },
    { label: 'Mis Órdenes', icon: 'pi pi-list', route: '/client/orders' },
    { label: 'Solicitar Lavado', icon: 'pi pi-map-marker', route: '/client/request-wash' },
    { label: 'Mis Solicitudes', icon: 'pi pi-history', route: '/client/requests' },
    { label: 'Mis Vehículos', icon: 'pi pi-car', route: '/client/vehicles' },
    { label: 'Servicios', icon: 'pi pi-shopping-cart', route: '/client/services' },
    { label: 'Promociones', icon: 'pi pi-tag', route: '/client/promotions' }
  ]);

  ngOnInit() {
    // Inicializar según el tamaño de pantalla
    if (this.isMobile()) {
      this.sidebarVisible.set(false);
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    // Si entramos en modo móvil, cerramos el sidebar para que no quede el overlay abierto
    if (this.isMobile() && this.sidebarVisible()) {
      this.sidebarVisible.set(false);
    }
  }

  isMobile(): boolean {
    return window.innerWidth < 1024; // Match con breakpoint 'lg' de Tailwind
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
