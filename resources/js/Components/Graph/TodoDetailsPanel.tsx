import React from 'react';
import { X } from 'lucide-react';

interface TodoDetailsPanelProps {
    nodeId: string | null;
    onClose: () => void;
}

export default function TodoDetailsPanel({ nodeId, onClose }: TodoDetailsPanelProps) {
    if (!nodeId) return null;

    return (
        <div className="absolute top-0 right-0 w-96 h-full bg-white shadow-2xl border-l border-gray-200 flex flex-col z-10">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Todo Details</h2>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                    aria-label="Close panel"
                >
                    <X className="w-5 h-5 text-gray-500" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Node ID</p>
                        <p className="text-base text-gray-900">{nodeId}</p>
                    </div>

                    <div className="pt-4">
                        <a
                            href={`/todos/${nodeId}`}
                            className="inline-flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            View Full Todo
                        </a>
                    </div>

                    <div className="pt-2 text-sm text-gray-500">
                        <p>Click on the graph to explore connections between todos.</p>
                        <p className="mt-2">Hover over nodes to highlight their neighbors.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
