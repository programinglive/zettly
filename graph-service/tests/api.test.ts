import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { GraphManager } from '../src/graph.js';

describe('Graph Service API', () => {
    let app: express.Application;
    let graphManager: GraphManager;

    beforeEach(() => {
        // Create a minimal Express app for testing
        app = express();
        app.use(express.json());
        graphManager = new GraphManager();

        // Health endpoint
        app.get('/health', (req, res) => {
            res.json({ status: 'ok' });
        });

        // Graph endpoint
        app.get('/graph', (req, res) => {
            const allGraph = graphManager.getAllGraph();
            res.json(allGraph);
        });

        // Sync endpoint
        app.post('/sync', (req, res) => {
            const { type, data } = req.body;

            try {
                switch (type) {
                    case 'node:add':
                    case 'node:update':
                        graphManager.addOrUpdateNode(data);
                        break;
                    case 'node:remove':
                        graphManager.removeNode(data.id);
                        break;
                    case 'edge:add':
                        graphManager.addEdge(data.source, data.target);
                        break;
                    case 'edge:remove':
                        graphManager.removeEdge(data.source, data.target);
                        break;
                    case 'bulk:sync':
                        graphManager.clear();
                        data.nodes.forEach((node: any) => graphManager.addOrUpdateNode(node));
                        data.edges.forEach(({ source, target }: any) => graphManager.addEdge(source, target));
                        break;
                    default:
                        return res.status(400).json({ error: 'Unknown sync type' });
                }

                res.json({ success: true, type });
            } catch (error) {
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    });

    afterEach(() => {
        graphManager.clear();
    });

    describe('GET /health', () => {
        it('should return ok status', async () => {
            const response = await request(app).get('/health');
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ status: 'ok' });
        });
    });

    describe('GET /graph', () => {
        it('should return empty graph initially', async () => {
            const response = await request(app).get('/graph');
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ nodes: [], edges: [] });
        });

        it('should return graph with nodes after sync', async () => {
            // Add a node
            await request(app)
                .post('/sync')
                .send({
                    type: 'node:add',
                    data: {
                        id: '1',
                        title: 'Test Todo',
                        status: 'open',
                        type: 'todo',
                        updatedAt: new Date().toISOString(),
                    },
                });

            const response = await request(app).get('/graph');
            expect(response.status).toBe(200);
            expect(response.body.nodes).toHaveLength(1);
            expect(response.body.nodes[0].id).toBe('1');
            expect(response.body.nodes[0].title).toBe('Test Todo');
        });
    });

    describe('POST /sync', () => {
        it('should add a node', async () => {
            const response = await request(app)
                .post('/sync')
                .send({
                    type: 'node:add',
                    data: {
                        id: '1',
                        title: 'Test Todo',
                        status: 'open',
                        type: 'todo',
                        updatedAt: new Date().toISOString(),
                    },
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ success: true, type: 'node:add' });

            const graph = graphManager.getAllGraph();
            expect(graph.nodes).toHaveLength(1);
        });

        it('should update a node', async () => {
            // Add node first
            graphManager.addOrUpdateNode({
                id: '1',
                title: 'Original Title',
                status: 'open',
                type: 'todo',
                updatedAt: new Date().toISOString(),
            });

            // Update node
            const response = await request(app)
                .post('/sync')
                .send({
                    type: 'node:update',
                    data: {
                        id: '1',
                        title: 'Updated Title',
                        status: 'completed',
                        type: 'todo',
                        updatedAt: new Date().toISOString(),
                    },
                });

            expect(response.status).toBe(200);
            const graph = graphManager.getAllGraph();
            expect(graph.nodes[0].title).toBe('Updated Title');
            expect(graph.nodes[0].status).toBe('completed');
        });

        it('should remove a node', async () => {
            // Add node first
            graphManager.addOrUpdateNode({
                id: '1',
                title: 'Test Todo',
                status: 'open',
                type: 'todo',
                updatedAt: new Date().toISOString(),
            });

            const response = await request(app)
                .post('/sync')
                .send({
                    type: 'node:remove',
                    data: { id: '1' },
                });

            expect(response.status).toBe(200);
            const graph = graphManager.getAllGraph();
            expect(graph.nodes).toHaveLength(0);
        });

        it('should add an edge', async () => {
            // Add two nodes first
            graphManager.addOrUpdateNode({
                id: '1',
                title: 'Todo 1',
                status: 'open',
                type: 'todo',
                updatedAt: new Date().toISOString(),
            });
            graphManager.addOrUpdateNode({
                id: '2',
                title: 'Todo 2',
                status: 'open',
                type: 'todo',
                updatedAt: new Date().toISOString(),
            });

            const response = await request(app)
                .post('/sync')
                .send({
                    type: 'edge:add',
                    data: { source: '1', target: '2' },
                });

            expect(response.status).toBe(200);
            const graph = graphManager.getAllGraph();
            expect(graph.edges).toHaveLength(1);
            expect(graph.edges[0]).toEqual({ source: '1', target: '2' });
        });

        it('should perform bulk sync', async () => {
            const response = await request(app)
                .post('/sync')
                .send({
                    type: 'bulk:sync',
                    data: {
                        nodes: [
                            { id: '1', title: 'Todo 1', status: 'open', type: 'todo', updatedAt: new Date().toISOString() },
                            { id: '2', title: 'Todo 2', status: 'completed', type: 'todo', updatedAt: new Date().toISOString() },
                            { id: '3', title: 'Todo 3', status: 'open', type: 'todo', updatedAt: new Date().toISOString() },
                        ],
                        edges: [
                            { source: '1', target: '2' },
                            { source: '2', target: '3' },
                        ],
                    },
                });

            expect(response.status).toBe(200);
            const graph = graphManager.getAllGraph();
            expect(graph.nodes).toHaveLength(3);
            expect(graph.edges).toHaveLength(2);
        });

        it('should return 400 for unknown sync type', async () => {
            const response = await request(app)
                .post('/sync')
                .send({
                    type: 'unknown:type',
                    data: {},
                });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: 'Unknown sync type' });
        });
    });
});
