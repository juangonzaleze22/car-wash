import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { BadgeModule } from 'primeng/badge';

export interface MenuItem {
  label: string;
  icon: string;
  route: string;
  badge?: string;
  badgeSeverity?: 'success' | 'info' | 'warning' | 'danger';
}

@Component({
  selector: 'app-sidebar-menu',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, BadgeModule],
  template: `
    <div class="flex flex-col gap-1 p-2">
      @for (item of items; track item.route) {
        <a 
          [routerLink]="item.route" 
          routerLinkActive
          #rla="routerLinkActive"
          [class]="rla.isActive ? activeClass : inactiveClass"
          class="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium cursor-pointer group mb-1 no-underline"
          (click)="onItemClick()">
          
          <!-- Icono con escala en hover/active -->
          <i [class]="item.icon" class="text-xl transition-transform duration-200 group-hover:scale-110"></i>
          
          <span class="text-sm font-semibold tracking-wide flex-1">{{ item.label }}</span>

           @if (item.badge) {
            <p-badge [value]="item.badge" [severity]="item.badgeSeverity || 'danger'"></p-badge>
          }
        </a>
      }
    </div>
  `
})
export class SidebarMenuComponent {
  @Input({ required: true }) items: MenuItem[] = [];
  @Input() themeColor: 'blue' | 'purple' | 'green' | 'orange' | 'cyan' = 'blue';
  @Output() menuClick = new EventEmitter<void>();

  // Definición de estilos SÓLIDOS y de ALTO CONTRASTE
  get activeClass(): string {
    const colors = {
      blue: 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none hover:bg-blue-700',
      purple: 'bg-purple-600 text-white shadow-md shadow-purple-200 dark:shadow-none hover:bg-purple-700',
      green: 'bg-green-600 text-white shadow-md shadow-green-200 dark:shadow-none hover:bg-green-700',
      orange: 'bg-orange-600 text-white shadow-md shadow-orange-200 dark:shadow-none hover:bg-orange-700',
      cyan: 'bg-cyan-600 text-white shadow-md shadow-cyan-200 dark:shadow-none hover:bg-cyan-700'
    };
    return colors[this.themeColor] || colors['blue'];
  }

  get inactiveClass(): string {
    return 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white bg-transparent';
  }

  onItemClick() {
    this.menuClick.emit();
  }
}
