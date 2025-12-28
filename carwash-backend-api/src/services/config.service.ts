import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getConfig = async (key: string) => {
    return prisma.systemConfig.findUnique({
        where: { key }
    });
};

export const getAllConfigs = async () => {
    return prisma.systemConfig.findMany({
        orderBy: { key: 'asc' }
    });
};

export const updateConfig = async (key: string, value: string, description?: string) => {
    return prisma.systemConfig.upsert({
        where: { key },
        update: { value, description },
        create: { key, value, description }
    });
};

export const getDeliveryFee = async (): Promise<number> => {
    const config = await getConfig('DELIVERY_FEE');
    return config ? parseFloat(config.value) : 0;
};
