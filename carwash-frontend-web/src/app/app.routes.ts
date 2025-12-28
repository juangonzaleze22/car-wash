import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { SupervisorLayoutComponent } from './features/supervisor/layout/supervisor-layout.component';
import { CashierLayoutComponent } from './features/cashier/layout/cashier-layout.component';
import { AdminLayoutComponent } from './features/admin/layout/admin-layout.component';
import { PatioDashboardComponent } from './features/supervisor/dashboard/patio-dashboard.component';
import { CheckInComponent } from './features/supervisor/check-in/check-in.component';
import { POSComponent } from './features/cashier/pos/pos.component';
import { OrdersTableComponent } from './features/orders/orders-table/orders-table.component';
import { ServicesManagementComponent } from './features/admin/services-management/services-management.component';
import { WashersManagementComponent } from './features/admin/washers-management/washers-management.component';
import { WasherLayoutComponent } from './features/washer/layout/washer-layout.component';
import { WasherDashboardComponent } from './features/washer/dashboard/washer-dashboard.component';
import { AdminDashboardComponent } from './features/admin/dashboard/admin-dashboard.component';
import { WasherEarningsComponent } from './features/admin/washer-earnings/washer-earnings.component';
import { ExpensesManagementComponent } from './features/admin/expenses-management/expenses-management.component';
import { VehiclesManagementComponent } from './features/admin/vehicles-management/vehicles-management.component';
import { CategoriesManagementComponent } from './features/admin/categories-management/categories-management.component';
import { DailyReportComponent } from './features/admin/daily-report/daily-report.component';
import { ProductsManagementComponent } from './features/admin/products-management/products-management.component';
import { InventoryCheckComponent } from './features/supervisor/inventory-check/inventory-check.component';
import { ClientLoginComponent } from './features/client/login/client-login.component';
import { ClientLayoutComponent } from './features/client/layout/client-layout.component';
import { ClientDashboardComponent } from './features/client/dashboard/client-dashboard.component';
import { ClientOrdersComponent } from './features/client/orders/client-orders.component';
import { ClientVehiclesComponent } from './features/client/vehicles/client-vehicles.component';
import { ClientServicesComponent } from './features/client/services/client-services.component';
import { ClientPromotionsComponent } from './features/client/promotions/client-promotions.component';
import { WashRequestFormComponent } from './features/client/request-wash/wash-request-form.component';
import { RequestManagementComponent } from './features/supervisor/manage-requests/manage-requests.component';
import { SystemConfigComponent } from './features/admin/system-config/system-config.component';
import { MyWashRequestsComponent } from './features/client/requests/my-requests.component';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
    },
    {
        path: 'login',
        component: LoginComponent
    },
    {
        path: 'supervisor',
        component: SupervisorLayoutComponent,
        children: [
            {
                path: 'dashboard',
                component: PatioDashboardComponent
            },
            {
                path: 'check-in',
                component: CheckInComponent
            },
            {
                path: 'orders',
                component: OrdersTableComponent
            },
            {
                path: 'daily-report',
                component: DailyReportComponent
            },
            {
                path: 'inventory',
                component: InventoryCheckComponent
            },
            {
                path: 'requests',
                component: RequestManagementComponent
            }
        ]
    },
    {
        path: 'cashier',
        component: CashierLayoutComponent,
        children: [
            {
                path: 'pos',
                component: POSComponent
            },
            {
                path: 'orders',
                component: OrdersTableComponent
            },
            {
                path: 'daily-report',
                component: DailyReportComponent
            }
        ]
    },
    {
        path: 'admin',
        component: AdminLayoutComponent,
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            },
            {
                path: 'dashboard',
                component: AdminDashboardComponent
            },
            {
                path: 'services',
                component: ServicesManagementComponent
            },
            {
                path: 'washers',
                component: WashersManagementComponent
            },
            {
                path: 'washer-earnings',
                component: WasherEarningsComponent
            },
            {
                path: 'expenses',
                component: ExpensesManagementComponent
            },
            {
                path: 'vehicles',
                component: VehiclesManagementComponent
            },
            {
                path: 'categories',
                component: CategoriesManagementComponent
            },
            {
                path: 'check-in',
                component: CheckInComponent
            },
            {
                path: 'orders',
                component: OrdersTableComponent
            },
            {
                path: 'daily-report',
                component: DailyReportComponent
            },
            {
                path: 'products',
                component: ProductsManagementComponent
            },
            {
                path: 'requests',
                component: RequestManagementComponent
            },
            {
                path: 'config',
                component: SystemConfigComponent
            }
        ]
    },
    {
        path: 'washer',
        component: WasherLayoutComponent,
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            },
            {
                path: 'dashboard',
                component: WasherDashboardComponent
            },
            {
                path: 'earnings',
                component: OrdersTableComponent // Por ahora usar el mismo componente, después crear uno específico
            }
        ]
    },
    {
        path: 'client',
        component: ClientLayoutComponent,
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            },
            {
                path: 'dashboard',
                component: ClientDashboardComponent
            },
            {
                path: 'orders',
                component: ClientOrdersComponent
            },
            {
                path: 'vehicles',
                component: ClientVehiclesComponent
            },
            {
                path: 'services',
                component: ClientServicesComponent
            },
            {
                path: 'promotions',
                component: ClientPromotionsComponent
            },
            {
                path: 'request-wash',
                component: WashRequestFormComponent
            },
            {
                path: 'requests',
                component: MyWashRequestsComponent
            }
        ]
    },
    {
        path: 'client/login',
        component: ClientLoginComponent
    }
];
