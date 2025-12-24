import React, { useEffect, useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import { Head } from '@inertiajs/react';
import SigmaGraph from '@/Components/Graph/SigmaGraph';
import TodoDetailsPanel from '@/Components/Graph/TodoDetailsPanel';
import { useGraphWebSocket } from '@/hooks/useGraphWebSocket';
import axios from 'axios';

interface GraphIndexProps {
    graphServiceUrl: string;
    wsUrl: string;
}

export default function GraphIndex({ graphServiceUrl, wsUrl }: GraphIndexProps) {
    const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] } | null>(null);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { isConnected, events, clearEvents } = useGraphWebSocket(wsUrl);

    // Fetch initial graph data
    useEffect(() => {
        const fetchGraph = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${graphServiceUrl}/graph`);
                setGraphData(response.data);
                setError(null);
            } catch (err) {
                console.error('Failed to fetch graph data:', err);
                setError('Failed to load graph data. Make sure the graph service is running.');
            } finally {
                setLoading(false);
            }
        };

        fetchGraph();
    }, [graphServiceUrl]);

    return (
        <AppLayout title="Todo Graph">
            <Head title="Todo Graph" />

            <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 pb-10">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
                            Todo Graph
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Visualize connections between your todos and notes
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                {isConnected ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>
                        {graphData && (
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                {graphData.nodes.length} todos, {graphData.edges.length} links
                            </span>
                        )}
                    </div>
                </div>

                {/* Graph Container */}
                <div className="relative w-full h-[calc(100vh-16rem)] bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                            <div className="text-center">
                                <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                                <p className="text-gray-600 dark:text-gray-400">Loading graph...</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                            <div className="text-center max-w-md">
                                <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Run <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">cd graph-service && npm run dev</code> to start the graph service.
                                </p>
                            </div>
                        </div>
                    )}

                    {!loading && !error && graphData && (
                        <>
                            <SigmaGraph
                                graphData={graphData}
                                events={events}
                                onNodeClick={setSelectedNode}
                                onClearEvents={clearEvents}
                            />
                            <TodoDetailsPanel
                                nodeId={selectedNode}
                                onClose={() => setSelectedNode(null)}
                            />
                        </>
                    )}

                    {/* Legend */}
                    {!loading && !error && (
                        <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Legend</h3>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Open</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Completed</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-gray-400" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Archived</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
