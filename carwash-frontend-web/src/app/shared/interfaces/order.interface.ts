export interface Order {
    id: number;
    uuid: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    cancellationReason?: string | null;
    vehicle: {
        plate: string;
        category: string;
        client: {
            name: string;
            phone: string;
        };
    };
    supervisor?: {
        id: string;
        username: string;
    };
    items: Array<{
        service: {
            name: string;
        };
        assignedWasher: {
            id: string;
            username: string;
        } | null;
    }>;
    payments?: Array<{
        amount: number;
        currency: string;
        method: string;
        exchangeRate?: number;
        amountUSD?: number;
        reference?: string;
        createdAt?: string;
        cashier: {
            username: string;
        } | null;
    }>;
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

