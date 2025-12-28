import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateLocationDto {
    clientId: string;
    name: string;
    address?: string;
    latitude: number;
    longitude: number;
}

export class ClientLocationService {
    static async create(data: CreateLocationDto) {
        return prisma.clientLocation.create({
            data: {
                clientId: data.clientId,
                name: data.name,
                address: data.address || '',
                latitude: data.latitude,
                longitude: data.longitude
            }
        });
    }

    static async listByClient(clientId: string) {
        return prisma.clientLocation.findMany({
            where: { clientId },
            orderBy: { createdAt: 'desc' }
        });
    }

    static async delete(id: string, clientId: string) {
        return prisma.clientLocation.delete({
            where: {
                id,
                clientId // Garantizar que pertenezca al cliente
            }
        });
    }
}
