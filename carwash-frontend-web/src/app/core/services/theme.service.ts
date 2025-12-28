import { Injectable, signal, effect } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    isDarkMode = signal<boolean>(false);

    constructor() {
        // Load saved theme preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            this.isDarkMode.set(true);
        }

        // Apply theme on initialization
        effect(() => {
            this.applyTheme(this.isDarkMode());
        });
    }

    toggleTheme() {
        this.isDarkMode.update(current => !current);
    }

    private applyTheme(isDark: boolean) {
        const themeLink = document.getElementById('app-theme') as HTMLLinkElement;

        if (!themeLink) {
            console.error('Theme link element not found');
            return;
        }

        if (isDark) {
            themeLink.href = '/node_modules/primeng/resources/themes/lara-dark-blue/theme.css';
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            themeLink.href = '/node_modules/primeng/resources/themes/lara-light-blue/theme.css';
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }
}
