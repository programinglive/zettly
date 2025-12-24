import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';

export interface TodoNode {
    id: string;
    title: string;
    status: 'open' | 'completed' | 'archived';
    priority?: string;
    importance?: string;
    type: 'todo' | 'note';
    updatedAt: string;
    x?: number;
    y?: number;
}

export interface TodoEdge {
    source: string;
    target: string;
}

export class GraphManager {
    private graph: Graph;

    constructor() {
        this.graph = new Graph({ multi: false, allowSelfLoops: false });
    }

    /**
     * Add or update a node in the graph
     */
    addOrUpdateNode(node: TodoNode): void {
        const { id, x, y, ...attributes } = node;

        if (this.graph.hasNode(id)) {
            // Update existing node
            this.graph.mergeNodeAttributes(id, attributes);

            // Update position if provided
            if (x !== undefined && y !== undefined) {
                this.graph.setNodeAttribute(id, 'x', x);
                this.graph.setNodeAttribute(id, 'y', y);
            }
        } else {
            // Add new node
            this.graph.addNode(id, {
                ...attributes,
                x: x ?? Math.random() * 1000,
                y: y ?? Math.random() * 1000,
            });
        }
    }

    /**
     * Remove a node from the graph
     */
    removeNode(nodeId: string): void {
        if (this.graph.hasNode(nodeId)) {
            this.graph.dropNode(nodeId);
        }
    }

    /**
     * Add an edge between two nodes
     */
    addEdge(source: string, target: string): void {
        // Ensure both nodes exist
        if (!this.graph.hasNode(source) || !this.graph.hasNode(target)) {
            console.warn(`Cannot add edge: source ${source} or target ${target} does not exist`);
            return;
        }

        // Check if edge already exists
        if (!this.graph.hasEdge(source, target)) {
            this.graph.addEdge(source, target);
        }
    }

    /**
     * Remove an edge between two nodes
     */
    removeEdge(source: string, target: string): void {
        if (this.graph.hasEdge(source, target)) {
            this.graph.dropEdge(source, target);
        }
    }

    /**
     * Get a subgraph centered on a node with a given depth
     */
    getSubgraph(centerId: string, depth: number = 2): { nodes: TodoNode[]; edges: TodoEdge[] } {
        if (!this.graph.hasNode(centerId)) {
            return { nodes: [], edges: [] };
        }

        const visitedNodes = new Set<string>();
        const nodesToVisit: Array<{ id: string; currentDepth: number }> = [{ id: centerId, currentDepth: 0 }];

        // BFS to find all nodes within depth
        while (nodesToVisit.length > 0) {
            const { id, currentDepth } = nodesToVisit.shift()!;

            if (visitedNodes.has(id) || currentDepth > depth) {
                continue;
            }

            visitedNodes.add(id);

            if (currentDepth < depth) {
                // Add neighbors to visit
                this.graph.forEachNeighbor(id, (neighbor) => {
                    if (!visitedNodes.has(neighbor)) {
                        nodesToVisit.push({ id: neighbor, currentDepth: currentDepth + 1 });
                    }
                });
            }
        }

        // Collect nodes
        const nodes: TodoNode[] = Array.from(visitedNodes).map((nodeId) => {
            const attributes = this.graph.getNodeAttributes(nodeId);
            return {
                id: nodeId,
                ...attributes,
            } as TodoNode;
        });

        // Collect edges between visited nodes
        const edges: TodoEdge[] = [];
        this.graph.forEachEdge((edge, attributes, source, target) => {
            if (visitedNodes.has(source) && visitedNodes.has(target)) {
                edges.push({ source, target });
            }
        });

        return { nodes, edges };
    }

    /**
     * Get all nodes and edges
     */
    getAllGraph(): { nodes: TodoNode[]; edges: TodoEdge[] } {
        const nodes: TodoNode[] = this.graph.mapNodes((nodeId, attributes) => ({
            id: nodeId,
            ...attributes,
        })) as TodoNode[];

        const edges: TodoEdge[] = this.graph.mapEdges((edge, attributes, source, target) => ({
            source,
            target,
        }));

        return { nodes, edges };
    }

    /**
     * Apply ForceAtlas2 layout to compute node positions
     */
    applyLayout(iterations: number = 100): void {
        const settings = forceAtlas2.inferSettings(this.graph);
        forceAtlas2.assign(this.graph, { iterations, settings });
    }

    /**
     * Clear all nodes and edges
     */
    clear(): void {
        this.graph.clear();
    }

    /**
     * Get the underlying graph instance
     */
    getGraph(): Graph {
        return this.graph;
    }
}
