import { PrismaClient, UserRole, VehicleCategory, ClientType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    // 0. Create Vehicle Categories
    const categories = [
        { name: 'Auto', code: 'AUTO', description: 'Automóvil estándar' },
        { name: 'Moto', code: 'MOTO', description: 'Motocicleta' },
        { name: 'SUV', code: 'SUV', description: 'Vehículo utilitario deportivo' },
        { name: 'Pickup', code: 'PICKUP', description: 'Camioneta pickup' },
        { name: 'Camión', code: 'CAMION', description: 'Camión' },
        { name: 'Todos', code: 'TODOS', description: 'Aplica a todos los tipos de vehículos' },
    ];

    for (const cat of categories) {
        await prisma.vehicleCategoryModel.upsert({
            where: { code: cat.code },
            update: {
                name: cat.name,
                description: cat.description,
                active: true,
            },
            create: cat,
        });
    }

    console.log('Vehicle categories seeded');

    // 1. Create Users
    const password = await bcrypt.hash('123456', 10);

    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {
            name: 'Administrador Principal',
        },
        create: {
            username: 'admin',
            name: 'Administrador Principal',
            password,
            role: UserRole.ADMIN,
        },
    });

    const supervisor = await prisma.user.upsert({
        where: { username: 'supervisor' },
        update: {
            name: 'Supervisor General',
        },
        create: {
            username: 'supervisor',
            name: 'Supervisor General',
            password,
            role: UserRole.SUPERVISOR,
        },
    });

    const cashier = await prisma.user.upsert({
        where: { username: 'cajero' },
        update: {
            name: 'Cajero Principal',
        },
        create: {
            username: 'cajero',
            name: 'Cajero Principal',
            password,
            role: UserRole.CASHIER,
        },
    });

    const washer1 = await prisma.user.upsert({
        where: { username: 'lavador1' },
        update: {
            name: 'Juan Pérez',
        },
        create: {
            username: 'lavador1',
            name: 'Juan Pérez',
            password,
            role: UserRole.WASHER,
        },
    });

    const washer2 = await prisma.user.upsert({
        where: { username: 'lavador2' },
        update: {
            name: 'Carlos Rodríguez',
        },
        create: {
            username: 'lavador2',
            name: 'Carlos Rodríguez',
            password,
            role: UserRole.WASHER,
        },
    });

    console.log({ admin, supervisor, cashier, washer1, washer2 });

    // 2. Create Services (Spanish) - Todos con 20% de comisión
    const services = [
        // Servicios para Auto
        { name: 'Lavado Simple (Auto)', category: VehicleCategory.AUTO, price: 10.00 },
        { name: 'Lavado Premium (Auto)', category: VehicleCategory.AUTO, price: 15.00 },
        { name: 'Lavado Completo (Auto)', category: VehicleCategory.AUTO, price: 20.00 },

        // Servicios para SUV
        { name: 'Lavado Simple (SUV)', category: VehicleCategory.SUV, price: 12.00 },
        { name: 'Lavado Premium (SUV)', category: VehicleCategory.SUV, price: 18.00 },
        { name: 'Lavado Completo (SUV)', category: VehicleCategory.SUV, price: 25.00 },

        // Servicios para Moto
        { name: 'Lavado Moto', category: VehicleCategory.MOTO, price: 8.00 },
        { name: 'Lavado Premium Moto', category: VehicleCategory.MOTO, price: 12.00 },

        // Servicios para Pickup
        { name: 'Lavado Simple (Pickup)', category: VehicleCategory.PICKUP, price: 12.00 },
        { name: 'Lavado Premium (Pickup)', category: VehicleCategory.PICKUP, price: 18.00 },

        // Servicios para Camión
        { name: 'Lavado Simple (Camión)', category: VehicleCategory.CAMION, price: 15.00 },
        { name: 'Lavado Premium (Camión)', category: VehicleCategory.CAMION, price: 25.00 },
    ];

    let createdCount = 0;
    let updatedCount = 0;

    for (const s of services) {
        const existingService = await prisma.serviceCatalog.findFirst({
            where: { name: s.name },
        });

        if (existingService) {
            // Actualizar servicio existente con 20% de comisión
            await prisma.serviceCatalog.update({
                where: { id: existingService.id },
                data: {
                    categoryTarget: s.category,
                    price: s.price,
                    commissionPercentage: 20, // 20% de comisión para todos los servicios
                    active: true, // Asegurar que esté activo
                },
            });
            updatedCount++;
        } else {
            // Crear nuevo servicio con 20% de comisión
            await prisma.serviceCatalog.create({
                data: {
                    name: s.name,
                    categoryTarget: s.category,
                    price: s.price,
                    commissionPercentage: 20, // 20% de comisión para todos los servicios
                    active: true,
                },
            });
            createdCount++;
        }
    }

    console.log(`Services seeded: ${createdCount} created, ${updatedCount} updated`);

    // 3. Create System Configurations
    console.log('Seeding system configurations...');
    await prisma.systemConfig.upsert({
        where: { key: 'DELIVERY_FEE' },
        update: {
            value: '3.00',
            description: 'Costo base de delivery para solicitudes de lavado a domicilio',
        },
        create: {
            key: 'DELIVERY_FEE',
            value: '3.00',
            description: 'Costo base de delivery para solicitudes de lavado a domicilio',
        },
    });

    console.log('✅ Seed completed successfully!');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
