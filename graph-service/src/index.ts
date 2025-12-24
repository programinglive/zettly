import express, { Request, Response } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { GraphManager, TodoNode } from './graph.js';
import { WebSocketManager } from './websocket.js';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize graph and WebSocket managers
const graphManager = new GraphManager();
const wsManager = new WebSocketManager(server);

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow localhost and zettly.test domains
        const allowedOrigins = [
            'http://localhost:8000',
            'https://localhost:8000',
            'http://zettly.test',
            'https://zettly.test',
            'https://zettly.programinglive.com',
            /^https?:\/\/.*\.zettly\.test$/
        ];

        const isAllowed = allowedOrigins.some(allowed => {
            if (allowed instanceof RegExp) {
                return allowed.test(origin);
            }
            return allowed === origin;
        });

        if (isAllowed) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        service: 'zettly-graph-service',
        clients: wsManager.getClientCount(),
        timestamp: new Date().toISOString(),
    });
});

// Get subgraph endpoint
app.get('/graph', (req: Request, res: Response) => {
    const centerId = req.query.center as string;
    const depth = parseInt(req.query.depth as string) || 2;

    if (!centerId) {
        // Return all graph if no center specified
        const allGraph = graphManager.getAllGraph();
        return res.json(allGraph);
    }

    const subgraph = graphManager.getSubgraph(centerId, depth);
    res.json(subgraph);
});

// Sync endpoint - receives events from Laravel
app.post('/sync', (req: Request, res: Response) => {
    const { type, data } = req.body;

    try {
        switch (type) {
            case 'node:add':
            case 'node:update': {
                const node: TodoNode = data;
                graphManager.addOrUpdateNode(node);

                // Broadcast to WebSocket clients
                if (type === 'node:add') {
                    wsManager.broadcast({ type: 'node:add', node });
                } else {
                    wsManager.broadcast({ type: 'node:update', id: node.id, patch: node });
                }
                break;
            }

            case 'node:remove': {
                const { id } = data;
                graphManager.removeNode(id);
                wsManager.broadcast({ type: 'node:remove', id });
                break;
            }

            case 'edge:add': {
                const { source, target } = data;
                graphManager.addEdge(source, target);
                wsManager.broadcast({ type: 'edge:add', edge: { source, target } });
                break;
            }

            case 'edge:remove': {
                const { source, target } = data;
                graphManager.removeEdge(source, target);
                wsManager.broadcast({ type: 'edge:remove', edge: { source, target } });
                break;
            }

            case 'bulk:sync': {
                // Bulk sync for initial load
                const { nodes, edges } = data;

                // Clear existing graph
                graphManager.clear();

                // Add all nodes
                nodes.forEach((node: TodoNode) => {
                    graphManager.addOrUpdateNode(node);
                });

                // Add all edges
                edges.forEach(({ source, target }: { source: string; target: string }) => {
                    graphManager.addEdge(source, target);
                });

                // Apply layout if nodes don't have positions
                const hasPositions = nodes.some((n: TodoNode) => n.x !== undefined && n.y !== undefined);
                if (!hasPositions && nodes.length > 0) {
                    console.log('Applying ForceAtlas2 layout...');
                    graphManager.applyLayout(150);
                }

                console.log(`Bulk sync completed: ${nodes.length} nodes, ${edges.length} edges`);
                break;
            }

            default:
                return res.status(400).json({ error: 'Unknown sync type' });
        }

        res.json({ success: true, type });
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Graph service running on http://localhost:${PORT}`);
    console.log(`📊 WebSocket server ready for connections`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    wsManager.close();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
