import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

export type GraphEvent =
    | { type: 'node:add'; node: any }
    | { type: 'node:update'; id: string; patch: any }
    | { type: 'node:remove'; id: string }
    | { type: 'edge:add'; edge: { source: string; target: string } }
    | { type: 'edge:remove'; edge: { source: string; target: string } };

export class WebSocketManager {
    private wss: WebSocketServer;
    private clients: Set<WebSocket> = new Set();

    constructor(server: Server) {
        this.wss = new WebSocketServer({ server });

        this.wss.on('connection', (ws: WebSocket) => {
            console.log('New WebSocket client connected');
            this.clients.add(ws);

            ws.on('close', () => {
                console.log('WebSocket client disconnected');
                this.clients.delete(ws);
            });

            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.clients.delete(ws);
            });

            // Send initial connection success message
            ws.send(JSON.stringify({ type: 'connected', message: 'Connected to graph service' }));
        });

        console.log('WebSocket server initialized');
    }

    /**
     * Broadcast an event to all connected clients
     */
    broadcast(event: GraphEvent): void {
        const message = JSON.stringify(event);
        let successCount = 0;
        let failCount = 0;

        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(message);
                    successCount++;
                } catch (error) {
                    console.error('Error sending message to client:', error);
                    failCount++;
                }
            }
        });

        console.log(`Broadcasted ${event.type} to ${successCount} clients (${failCount} failed)`);
    }

    /**
     * Get the number of connected clients
     */
    getClientCount(): number {
        return this.clients.size;
    }

    /**
     * Close all connections and shut down the WebSocket server
     */
    close(): void {
        this.clients.forEach((client) => {
            client.close();
        });
        this.wss.close();
        console.log('WebSocket server closed');
    }
}
