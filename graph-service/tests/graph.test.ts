import { describe, it, expect, beforeEach } from 'vitest';
import { GraphManager } from '../src/graph.js';

describe('GraphManager', () => {
    let graphManager: GraphManager;

    beforeEach(() => {
        graphManager = new GraphManager();
    });

    describe('Node Operations', () => {
        it('should add a new node', () => {
            graphManager.addOrUpdateNode({
                id: '1',
                title: 'Test Todo',
                status: 'open',
                type: 'todo',
                updatedAt: new Date().toISOString(),
            });

            const graph = graphManager.getAllGraph();
            expect(graph.nodes).toHaveLength(1);
            expect(graph.nodes[0].id).toBe('1');
            expect(graph.nodes[0].title).toBe('Test Todo');
        });

        it('should update an existing node', () => {
            graphManager.addOrUpdateNode({
                id: '1',
                title: 'Original Title',
                status: 'open',
                type: 'todo',
                updatedAt: new Date().toISOString(),
            });

            graphManager.addOrUpdateNode({
                id: '1',
                title: 'Updated Title',
                status: 'completed',
                type: 'todo',
                updatedAt: new Date().toISOString(),
            });

            const graph = graphManager.getAllGraph();
            expect(graph.nodes).toHaveLength(1);
            expect(graph.nodes[0].title).toBe('Updated Title');
            expect(graph.nodes[0].status).toBe('completed');
        });

        it('should remove a node', () => {
            graphManager.addOrUpdateNode({
                id: '1',
                title: 'Test Todo',
                status: 'open',
                type: 'todo',
                updatedAt: new Date().toISOString(),
            });

            graphManager.removeNode('1');

            const graph = graphManager.getAllGraph();
            expect(graph.nodes).toHaveLength(0);
        });

        it('should not error when removing non-existent node', () => {
            expect(() => graphManager.removeNode('999')).not.toThrow();
        });
    });

    describe('Edge Operations', () => {
        beforeEach(() => {
            // Add two nodes for edge tests
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
        });

        it('should add an edge between two nodes', () => {
            graphManager.addEdge('1', '2');

            const graph = graphManager.getAllGraph();
            expect(graph.edges).toHaveLength(1);
            expect(graph.edges[0]).toEqual({ source: '1', target: '2' });
        });

        it('should not add duplicate edges', () => {
            graphManager.addEdge('1', '2');
            graphManager.addEdge('1', '2');

            const graph = graphManager.getAllGraph();
            expect(graph.edges).toHaveLength(1);
        });

        it('should remove an edge', () => {
            graphManager.addEdge('1', '2');
            graphManager.removeEdge('1', '2');

            const graph = graphManager.getAllGraph();
            expect(graph.edges).toHaveLength(0);
        });

        it('should not error when removing non-existent edge', () => {
            expect(() => graphManager.removeEdge('1', '2')).not.toThrow();
        });

        it('should not add edge if source node does not exist', () => {
            graphManager.addEdge('999', '2');

            const graph = graphManager.getAllGraph();
            expect(graph.edges).toHaveLength(0);
        });

        it('should not add edge if target node does not exist', () => {
            graphManager.addEdge('1', '999');

            const graph = graphManager.getAllGraph();
            expect(graph.edges).toHaveLength(0);
        });
    });

    describe('Subgraph Operations', () => {
        beforeEach(() => {
            // Create a small network: 1 -> 2 -> 3 -> 4
            ['1', '2', '3', '4', '5'].forEach((id) => {
                graphManager.addOrUpdateNode({
                    id,
                    title: `Todo ${id}`,
                    status: 'open',
                    type: 'todo',
                    updatedAt: new Date().toISOString(),
                });
            });

            graphManager.addEdge('1', '2');
            graphManager.addEdge('2', '3');
            graphManager.addEdge('3', '4');
            // Node 5 is isolated
        });

        it('should get subgraph with depth 1', () => {
            const subgraph = graphManager.getSubgraph('2', 1);

            expect(subgraph.nodes).toHaveLength(3); // 2, 1, 3
            expect(subgraph.edges).toHaveLength(2); // 1-2, 2-3
        });

        it('should get subgraph with depth 2', () => {
            const subgraph = graphManager.getSubgraph('2', 2);

            expect(subgraph.nodes).toHaveLength(4); // 2, 1, 3, 4
            expect(subgraph.edges).toHaveLength(3); // 1-2, 2-3, 3-4
        });

        it('should return empty subgraph for non-existent node', () => {
            const subgraph = graphManager.getSubgraph('999', 2);

            expect(subgraph.nodes).toHaveLength(0);
            expect(subgraph.edges).toHaveLength(0);
        });

        it('should return only center node for isolated node', () => {
            const subgraph = graphManager.getSubgraph('5', 2);

            expect(subgraph.nodes).toHaveLength(1);
            expect(subgraph.nodes[0].id).toBe('5');
            expect(subgraph.edges).toHaveLength(0);
        });
    });

    describe('Clear Operation', () => {
        it('should clear all nodes and edges', () => {
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
            graphManager.addEdge('1', '2');

            graphManager.clear();

            const graph = graphManager.getAllGraph();
            expect(graph.nodes).toHaveLength(0);
            expect(graph.edges).toHaveLength(0);
        });
    });
});
