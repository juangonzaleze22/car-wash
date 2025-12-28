import { Router } from 'express';
import * as AuthController from '../controllers/auth.controller';
import * as OrderController from '../controllers/order.controller';
import * as ServiceController from '../controllers/service.controller';
import * as PaymentController from '../controllers/payment.controller';
import * as VehicleController from '../controllers/vehicle.controller';
import * as ClientController from '../controllers/client.controller';
import * as UserController from '../controllers/user.controller';
import * as WasherController from '../controllers/washer.controller';
import * as KPIController from '../controllers/kpi.controller';
import * as ExpenseController from '../controllers/expense.controller';
import * as CategoryController from '../controllers/category.controller';
import * as ReportController from '../controllers/report.controller';
import * as ProductController from '../controllers/product.controller';
import * as ClientDashboardController from '../controllers/client-dashboard.controller';
import * as ExchangeRateController from '../controllers/exchange-rate.controller';
import * as NotificationController from '../controllers/notification.controller';
import * as DeliveryRequestController from '../controllers/delivery-request.controller';
import * as ClientLocationController from '../controllers/client-location.controller';
import * as ConfigController from '../controllers/config.controller';
import { authenticateToken, requireRole, requireClient } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

// Auth
router.post('/auth/login', AuthController.login);
router.post('/auth/client-login', AuthController.clientLogin);

// Services
router.get(
    '/services',
    authenticateToken,
    ServiceController.getServices
);

router.get(
    '/services/:id',
    authenticateToken,
    requireRole(['ADMIN', 'SUPERVISOR']),
    ServiceController.getServiceById
);

router.post(
    '/services',
    authenticateToken,
    requireRole(['ADMIN']),
    ServiceController.createService
);

router.patch(
    '/services/:id',
    authenticateToken,
    requireRole(['ADMIN']),
    ServiceController.updateService
);

router.delete(
    '/services/:id',
    authenticateToken,
    requireRole(['ADMIN']),
    ServiceController.deleteService
);

// Categories
router.get(
    '/categories',
    authenticateToken,
    CategoryController.getCategories
);

router.get(
    '/categories/:id',
    authenticateToken,
    requireRole(['ADMIN', 'SUPERVISOR']),
    CategoryController.getCategoryById
);

router.post(
    '/categories',
    authenticateToken,
    requireRole(['ADMIN']),
    CategoryController.createCategory
);

router.patch(
    '/categories/:id',
    authenticateToken,
    requireRole(['ADMIN']),
    CategoryController.updateCategory
);

router.delete(
    '/categories/:id',
    authenticateToken,
    requireRole(['ADMIN']),
    CategoryController.deleteCategory
);

// Vehicles
router.get(
    '/vehicles/search',
    authenticateToken,
    VehicleController.searchVehicles
);

router.get(
    '/vehicles',
    authenticateToken,
    requireRole(['ADMIN', 'SUPERVISOR']),
    VehicleController.getVehicles
);

router.get(
    '/vehicles/:id',
    authenticateToken,
    requireRole(['ADMIN', 'SUPERVISOR']),
    VehicleController.getVehicleById
);

router.post(
    '/vehicles',
    authenticateToken,
    requireRole(['ADMIN', 'SUPERVISOR']),
    VehicleController.createVehicle
);

router.patch(
    '/vehicles/:id',
    authenticateToken,
    requireRole(['ADMIN', 'SUPERVISOR']),
    VehicleController.updateVehicle
);

router.delete(
    '/vehicles/:id',
    authenticateToken,
    requireRole(['ADMIN']),
    VehicleController.deleteVehicle
);

// Clients
router.get(
    '/clients/search',
    authenticateToken,
    ClientController.searchClients
);

// Orders
router.post(
    '/orders/smart-checkin',
    authenticateToken,
    requireRole(['SUPERVISOR', 'ADMIN']),
    upload.array('images', 5), // Allow up to 5 images
    OrderController.createSmartOrder
);

router.get(
    '/orders/dashboard',
    authenticateToken,
    requireRole(['SUPERVISOR', 'ADMIN', 'CASHIER']),
    OrderController.getOrders
);

router.get(
    '/orders',
    authenticateToken,
    requireRole(['SUPERVISOR', 'ADMIN', 'CASHIER', 'WASHER']),
    OrderController.getOrdersPaginated
);

router.patch(
    '/orders/:id/status',
    authenticateToken,
    requireRole(['SUPERVISOR', 'ADMIN']),
    OrderController.updateOrderStatus
);

router.delete(
    '/orders/:id',
    authenticateToken,
    requireRole(['ADMIN']),
    OrderController.deleteOrder
);

// Payment
router.post(
    '/orders/:id/pay',
    authenticateToken,
    requireRole(['CASHIER', 'ADMIN', 'SUPERVISOR']),
    PaymentController.processPayment
);

// Users - Washers Management
router.get(
    '/users/washers',
    authenticateToken,
    requireRole(['ADMIN', 'SUPERVISOR', 'WASHER']),
    UserController.getWashers
);
router.post(
    '/users/washers',
    authenticateToken,
    requireRole(['ADMIN']),
    UserController.createWasher
);
router.patch(
    '/users/washers/:id',
    authenticateToken,
    requireRole(['ADMIN']),
    UserController.updateWasher
);
router.delete(
    '/users/washers/:id',
    authenticateToken,
    requireRole(['ADMIN']),
    UserController.deleteWasher
);

// Washer Earnings
router.get(
    '/washers/earnings',
    authenticateToken,
    requireRole(['ADMIN', 'WASHER']),
    WasherController.getWasherEarnings
);

router.get(
    '/washers/my-earnings',
    authenticateToken,
    requireRole(['WASHER']),
    WasherController.getMyEarnings
);

router.get(
    '/washers/my-earnings/summary',
    authenticateToken,
    requireRole(['WASHER']),
    WasherController.getMyEarningsSummary
);

router.get(
    '/washers/:id/earnings',
    authenticateToken,
    requireRole(['ADMIN']),
    WasherController.getWasherEarningsById
);

router.get(
    '/washers/earnings/summary',
    authenticateToken,
    requireRole(['ADMIN']),
    WasherController.getAllWashersEarningsSummary
);

router.post(
    '/washers/earnings/mark-as-paid',
    authenticateToken,
    requireRole(['ADMIN']),
    WasherController.markEarningsAsPaid
);

// KPIs
router.get(
    '/kpi/washer',
    authenticateToken,
    requireRole(['WASHER']),
    KPIController.getWasherKPIs
);

router.get(
    '/kpi/admin',
    authenticateToken,
    requireRole(['ADMIN']),
    KPIController.getAdminKPIs
);

router.get(
    '/kpi/washer/chart-data',
    authenticateToken,
    requireRole(['WASHER']),
    KPIController.getWasherChartData
);

router.get(
    '/kpi/admin/chart-data',
    authenticateToken,
    requireRole(['ADMIN']),
    KPIController.getAdminChartData
);

// Expenses
router.get(
    '/expenses',
    authenticateToken,
    requireRole(['ADMIN', 'SUPERVISOR']),
    ExpenseController.getExpenses
);

router.get(
    '/expenses/summary',
    authenticateToken,
    requireRole(['ADMIN', 'SUPERVISOR']),
    ExpenseController.getExpensesSummary
);

router.get(
    '/expenses/:id',
    authenticateToken,
    requireRole(['ADMIN', 'SUPERVISOR']),
    ExpenseController.getExpenseById
);

router.post(
    '/expenses',
    authenticateToken,
    requireRole(['ADMIN', 'SUPERVISOR']),
    ExpenseController.createExpense
);

router.patch(
    '/expenses/:id',
    authenticateToken,
    requireRole(['ADMIN', 'SUPERVISOR']),
    ExpenseController.updateExpense
);

router.delete(
    '/expenses/:id',
    authenticateToken,
    requireRole(['ADMIN']),
    ExpenseController.deleteExpense
);

router.post(
    '/expenses/:id/generate-next',
    authenticateToken,
    requireRole(['ADMIN', 'SUPERVISOR']),
    ExpenseController.generateNextRecurringExpense
);

router.get(
    '/expenses/recurring/pending',
    authenticateToken,
    requireRole(['ADMIN', 'SUPERVISOR']),
    ExpenseController.getPendingRecurringExpenses
);

router.get(
    '/expenses/recurring/upcoming',
    authenticateToken,
    requireRole(['ADMIN', 'SUPERVISOR']),
    ExpenseController.getUpcomingRecurringExpenses
);

// Reports
router.get(
    '/reports',
    authenticateToken,
    requireRole(['ADMIN', 'SUPERVISOR', 'CASHIER']),
    ReportController.getReport
);

// Products & Inventory
router.get(
    '/products',
    authenticateToken,
    ProductController.getProducts
);

router.get(
    '/products/:id',
    authenticateToken,
    requireRole(['ADMIN', 'SUPERVISOR']),
    ProductController.getProductById
);

router.get(
    '/products/:id/kardex',
    authenticateToken,
    requireRole(['ADMIN', 'SUPERVISOR']),
    ProductController.getProductKardex
);

router.post(
    '/products',
    authenticateToken,
    requireRole(['ADMIN']),
    ProductController.createProduct
);

router.patch(
    '/products/:id',
    authenticateToken,
    requireRole(['ADMIN']),
    ProductController.updateProduct
);

router.post(
    '/products/adjustment',
    authenticateToken,
    requireRole(['ADMIN']),
    ProductController.createStockAdjustment
);

router.post(
    '/products/daily-check',
    authenticateToken,
    requireRole(['SUPERVISOR', 'ADMIN']),
    ProductController.dailyInventoryCheck
);

// Client Dashboard (requires client authentication)
router.get(
    '/client/dashboard',
    authenticateToken,
    requireClient,
    ClientDashboardController.getClientDashboard
);

router.get(
    '/client/orders/:orderId',
    authenticateToken,
    requireClient,
    ClientDashboardController.getClientOrderDetails
);

router.get(
    '/client/services',
    ClientDashboardController.getClientServices
);

router.get(
    '/client/notifications',
    authenticateToken,
    requireClient,
    NotificationController.getClientNotifications
);

router.patch(
    '/client/notifications/:id/read',
    authenticateToken,
    requireClient,
    NotificationController.markNotificationAsRead
);

router.post(
    '/client/vehicles',
    authenticateToken,
    requireClient,
    VehicleController.createClientVehicle
);

// Exchange Rates
router.get(
    '/exchange-rates',
    authenticateToken,
    ExchangeRateController.getExchangeRates
);

router.get(
    '/exchange-rates/usd',
    authenticateToken,
    ExchangeRateController.getUSDExchangeRate
);

router.get(
    '/exchange-rates/eur',
    authenticateToken,
    ExchangeRateController.getEURExchangeRate
);

// Delivery Requests
router.post(
    '/delivery-requests',
    authenticateToken,
    requireClient,
    DeliveryRequestController.createRequest
);

router.get(
    '/delivery-requests/my',
    authenticateToken,
    requireClient,
    DeliveryRequestController.getMyRequests
);

router.get(
    '/delivery-requests/pending',
    authenticateToken,
    requireRole(['ADMIN', 'SUPERVISOR']),
    DeliveryRequestController.getPendingRequests
);

router.get(
    '/delivery-requests/:id',
    authenticateToken,
    DeliveryRequestController.getRequestById
);

router.patch(
    '/delivery-requests/:id/status',
    authenticateToken,
    requireRole(['ADMIN', 'SUPERVISOR']),
    DeliveryRequestController.updateRequestStatus
);

// Client Locations
router.get(
    '/client/locations',
    authenticateToken,
    requireClient,
    ClientLocationController.getMyLocations
);

router.post(
    '/client/locations',
    authenticateToken,
    requireClient,
    ClientLocationController.createLocation
);

router.delete(
    '/client/locations/:id',
    authenticateToken,
    requireClient,
    ClientLocationController.deleteLocation
);

// System Configs
router.get(
    '/configs',
    authenticateToken,
    ConfigController.getConfigs
);

router.get(
    '/configs/delivery-fee',
    authenticateToken,
    ConfigController.getDeliveryFee
);

router.get(
    '/configs/:key',
    authenticateToken,
    ConfigController.getConfigByKey
);

router.patch(
    '/configs/:key',
    authenticateToken,
    requireRole(['ADMIN']),
    ConfigController.updateConfig
);

// Notifications
router.get(
    '/notifications',
    authenticateToken,
    NotificationController.getNotifications
);

router.get(
    '/client/notifications',
    authenticateToken,
    requireClient,
    NotificationController.getClientNotifications
);

router.patch(
    '/notifications/:id/read',
    authenticateToken,
    NotificationController.markNotificationAsRead
);

export default router;
