import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

let io: Server;

export const initSocket = (httpServer: HttpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: "*", // Allow all origins for now, configure as needed
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket: Socket) => {
        console.log('New client connected:', socket.id);

        // Unirse a rooms según el rol del usuario
        socket.on('join:room', (data: { role: string, userId?: string }) => {
            if (data.role === 'ADMIN') {
                socket.join('admin');
                console.log(`Admin joined admin room: ${socket.id}`);
            } else if (data.role === 'WASHER' && data.userId) {
                socket.join(`washer:${data.userId}`);
                console.log(`Washer ${data.userId} joined washer room: ${socket.id}`);
            }
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};
