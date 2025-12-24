import React, { useEffect, useRef, useState } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { GraphEvent } from '@/hooks/useGraphWebSocket';

interface SigmaGraphProps {
    graphData: { nodes: any[]; edges: any[] } | null;
    events: GraphEvent[];
    onNodeClick?: (nodeId: string) => void;
    onClearEvents: () => void;
}

export default function SigmaGraph({ graphData, events, onNodeClick, onClearEvents }: SigmaGraphProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sigmaRef = useRef<Sigma | null>(null);
    const graphRef = useRef<Graph | null>(null);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);

    // Initialize Sigma and graph
    useEffect(() => {
        if (!containerRef.current) return;

        const graph = new Graph();
        graphRef.current = graph;

        const sigma = new Sigma(graph, containerRef.current, {
            renderEdgeLabels: false,
            defaultNodeColor: '#6B7280',
            defaultEdgeColor: '#E5E7EB',
            labelSize: 12,
            labelWeight: 'normal',
            labelColor: { color: '#374151' },
            allowInvalidContainer: true,
        });

        sigmaRef.current = sigma;

        // Node click handler
        sigma.on('clickNode', ({ node }) => {
            if (onNodeClick) {
                onNodeClick(node);
            }
        });

        // Hover handlers for ego graph highlighting
        sigma.on('enterNode', ({ node }) => {
            setHoveredNode(node);
        });

        sigma.on('leaveNode', () => {
            setHoveredNode(null);
        });

        return () => {
            sigma.kill();
        };
    }, [onNodeClick]);

    // Load initial graph data
    useEffect(() => {
        if (!graphData || !graphRef.current) return;

        const graph = graphRef.current;
        graph.clear();

        // Add nodes
        graphData.nodes.forEach((node) => {
            if (!graph.hasNode(node.id)) {
                const { type, ...nodeAttributes } = node; // Exclude 'type' to avoid Sigma conflict
                graph.addNode(node.id, {
                    label: node.title,
                    size: 10,
                    color: getNodeColor(node.status),
                    x: node.x ?? Math.random() * 1000,
                    y: node.y ?? Math.random() * 1000,
                    ...nodeAttributes,
                });
            }
        });

        // Add edges
        graphData.edges.forEach((edge) => {
            if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
                if (!graph.hasEdge(edge.source, edge.target)) {
                    graph.addEdge(edge.source, edge.target, {
                        size: 1,
                        color: '#E5E7EB',
                    });
                }
            }
        });

        // Apply layout if nodes don't have positions
        const hasPositions = graphData.nodes.some((n) => n.x !== undefined && n.y !== undefined);
        if (!hasPositions && graphData.nodes.length > 0) {
            const settings = forceAtlas2.inferSettings(graph);
            forceAtlas2.assign(graph, { iterations: 100, settings });
        }

        // Update node sizes based on degree
        graph.forEachNode((node) => {
            const degree = graph.degree(node);
            graph.setNodeAttribute(node, 'size', Math.max(5, Math.min(20, 5 + degree * 2)));
        });

        sigmaRef.current?.refresh();
    }, [graphData]);

    // Apply real-time events
    useEffect(() => {
        if (events.length === 0 || !graphRef.current) return;

        const graph = graphRef.current;

        events.forEach((event) => {
            switch (event.type) {
                case 'node:add':
                    if (event.node && !graph.hasNode(event.node.id)) {
                        const { type, ...nodeAttributes } = event.node; // Exclude 'type' to avoid Sigma conflict
                        graph.addNode(event.node.id, {
                            label: event.node.title,
                            size: 10,
                            color: getNodeColor(event.node.status),
                            x: event.node.x ?? Math.random() * 1000,
                            y: event.node.y ?? Math.random() * 1000,
                            ...nodeAttributes,
                        });
                    }
                    break;

                case 'node:update':
                    if (event.id && event.patch && graph.hasNode(event.id)) {
                        Object.entries(event.patch).forEach(([key, value]) => {
                            if (key === 'status') {
                                graph.setNodeAttribute(event.id!, 'color', getNodeColor(value as string));
                            }
                            if (key === 'title') {
                                graph.setNodeAttribute(event.id!, 'label', value as string);
                            }
                            graph.setNodeAttribute(event.id!, key, value);
                        });
                    }
                    break;

                case 'node:remove':
                    if (event.id && graph.hasNode(event.id)) {
                        graph.dropNode(event.id);
                    }
                    break;

                case 'edge:add':
                    if (event.edge) {
                        const { source, target } = event.edge;
                        if (graph.hasNode(source) && graph.hasNode(target) && !graph.hasEdge(source, target)) {
                            graph.addEdge(source, target, {
                                size: 1,
                                color: '#E5E7EB',
                            });
                        }
                    }
                    break;

                case 'edge:remove':
                    if (event.edge) {
                        const { source, target } = event.edge;
                        if (graph.hasEdge(source, target)) {
                            graph.dropEdge(source, target);
                        }
                    }
                    break;
            }
        });

        sigmaRef.current?.refresh();
        onClearEvents();
    }, [events, onClearEvents]);

    // Highlight neighbors on hover
    useEffect(() => {
        if (!graphRef.current || !sigmaRef.current) return;

        const graph = graphRef.current;
        const sigma = sigmaRef.current;

        if (hoveredNode) {
            const neighbors = new Set(graph.neighbors(hoveredNode));
            neighbors.add(hoveredNode);

            // Reduce opacity of non-neighbor nodes
            sigma.setSetting('nodeReducer', (node, data) => {
                if (neighbors.has(node)) {
                    return { ...data, highlighted: true };
                }
                return { ...data, color: '#D1D5DB', highlighted: false };
            });

            sigma.setSetting('edgeReducer', (edge, data) => {
                if (graph.hasExtremity(edge, hoveredNode)) {
                    return { ...data, color: '#9CA3AF', size: 2 };
                }
                return { ...data, color: '#F3F4F6', hidden: true };
            });
        } else {
            sigma.setSetting('nodeReducer', null);
            sigma.setSetting('edgeReducer', null);
        }

        sigma.refresh();
    }, [hoveredNode]);

    return (
        <div ref={containerRef} className="w-full h-full bg-gray-50 dark:bg-gray-900" style={{ minHeight: '500px' }} />
    );
}

function getNodeColor(status: string): string {
    switch (status) {
        case 'completed':
            return '#10B981'; // green
        case 'archived':
            return '#9CA3AF'; // gray
        case 'open':
        default:
            return '#3B82F6'; // blue
    }
}
