import { useEffect, useRef, useState, useCallback } from 'react';

export interface GraphEvent {
    type: 'node:add' | 'node:update' | 'node:remove' | 'edge:add' | 'edge:remove' | 'connected';
    node?: any;
    id?: string;
    patch?: any;
    edge?: { source: string; target: string };
    message?: string;
}

export interface UseGraphWebSocketReturn {
    isConnected: boolean;
    events: GraphEvent[];
    clearEvents: () => void;
}

export function useGraphWebSocket(wsUrl: string): UseGraphWebSocketReturn {
    const [isConnected, setIsConnected] = useState(false);
    const [events, setEvents] = useState<GraphEvent[]>([]);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttempts = useRef(0);

    const connect = useCallback(() => {
        try {
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('WebSocket connected');
                setIsConnected(true);
                reconnectAttempts.current = 0;
            };

            ws.onmessage = (event) => {
                try {
                    const data: GraphEvent = JSON.parse(event.data);

                    if (data.type === 'connected') {
                        console.log('Received connection confirmation');
                        return;
                    }

                    setEvents((prev) => [...prev, data]);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            ws.onclose = () => {
                console.log('WebSocket disconnected');
                setIsConnected(false);
                wsRef.current = null;

                // Attempt to reconnect with exponential backoff
                const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
                reconnectAttempts.current++;

                console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
                reconnectTimeoutRef.current = setTimeout(connect, delay);
            };

            wsRef.current = ws;
        } catch (error) {
            console.error('Error creating WebSocket:', error);
        }
    }, [wsUrl]);

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    const clearEvents = useCallback(() => {
        setEvents([]);
    }, []);

    return { isConnected, events, clearEvents };
}
