import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class WebSocketService {
    private socket: Socket;
    private readonly URL = 'http://localhost:3000';

    constructor() {
        this.socket = io(this.URL);

        this.socket.on('connect', () => {
            console.log('Connected to WebSocket server');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket server');
        });
    }

    listen<T>(eventName: string): Observable<T> {
        return new Observable<T>((subscriber) => {
            this.socket.on(eventName, (data: T) => {
                subscriber.next(data);
            });
        });
    }

    emit(eventName: string, data: any) {
        this.socket.emit(eventName, data);
    }
}
