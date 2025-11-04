import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, Activity } from 'lucide-react';

export default function ReorderDebug() {
    const [logs, setLogs] = useState([]);
    const [isMonitoring, setIsMonitoring] = useState(true);
    const [dragEvents, setDragEvents] = useState(0);
    const [reorderRequests, setReorderRequests] = useState(0);

    useEffect(() => {
        console.log('🔍 ReorderDebug component mounted');
        addLog('🔍 Debug panel initialized', 'info');

        // Intercept native drag events (for dnd-kit)
        const handleDragStart = (e) => {
            console.log('🎯 Native drag started');
            setDragEvents(prev => prev + 1);
            addLog('🎯 Drag started', 'info');
        };

        const handleDragEnd = (e) => {
            console.log('🎯 Native drag ended');
            addLog('🎯 Drag ended', 'info');
        };

        // Intercept pointer events (dnd-kit uses these)
        const handlePointerDown = (e) => {
            if (e.target?.closest('[class*="cursor-grab"]')) {
                console.log('🎯 Pointer down on draggable');
                setDragEvents(prev => prev + 1);
                addLog('🎯 Drag started (pointer)', 'info');
            }
        };

        // Intercept router.post
        if (window.router) {
            const originalPost = window.router.post;
            window.router.post = function(url, data, options) {
                if (url === '/todos/reorder') {
                    setReorderRequests(prev => prev + 1);
                    console.log('📤 Reorder request:', { column: data.column, ids: data.todo_ids });
                    addLog(
                        `📤 Reorder request: column=${data.column}, ids=[${data.todo_ids.join(',')}]`,
                        'request'
                    );

                    // Wrap onError to log errors
                    const originalOnError = options?.onError;
                    if (originalOnError) {
                        options.onError = function(errors) {
                            console.error('❌ Reorder error:', errors);
                            addLog(`❌ Reorder error: ${JSON.stringify(errors)}`, 'error');
                            return originalOnError.call(this, errors);
                        };
                    }

                    // Wrap onSuccess to log success
                    const originalOnSuccess = options?.onSuccess;
                    if (originalOnSuccess) {
                        options.onSuccess = function(page) {
                            console.log('✅ Reorder successful');
                            addLog('✅ Reorder successful', 'success');
                            return originalOnSuccess.call(this, page);
                        };
                    }
                }
                return originalPost.call(this, url, data, options);
            };
            console.log('✓ Router.post intercepted');
        }

        document.addEventListener('dragstart', handleDragStart);
        document.addEventListener('dragend', handleDragEnd);
        document.addEventListener('pointerdown', handlePointerDown);

        return () => {
            document.removeEventListener('dragstart', handleDragStart);
            document.removeEventListener('dragend', handleDragEnd);
            document.removeEventListener('pointerdown', handlePointerDown);
        };
    }, []);

    const addLog = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [
            { message, type, timestamp, id: Date.now() },
            ...prev.slice(0, 49), // Keep last 50 logs
        ]);
    };

    const getLogIcon = (type) => {
        switch (type) {
            case 'success':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'error':
                return <XCircle className="w-4 h-4 text-red-500" />;
            case 'request':
                return <Activity className="w-4 h-4 text-blue-500" />;
            default:
                return <AlertCircle className="w-4 h-4 text-gray-500" />;
        }
    };

    return (
        <div className="fixed bottom-4 right-4 w-96 max-h-96 bg-slate-900 text-white rounded-lg shadow-lg border border-slate-700 flex flex-col z-50">
            {/* Header */}
            <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
                <h3 className="font-semibold text-sm">🔍 Reorder Debug</h3>
                <button
                    onClick={() => setIsMonitoring(!isMonitoring)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        isMonitoring
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                >
                    {isMonitoring ? 'Monitoring' : 'Paused'}
                </button>
            </div>

            {/* Stats */}
            <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 grid grid-cols-2 gap-2 text-xs">
                <div>
                    <span className="text-gray-400">Drag Events:</span>
                    <span className="ml-2 font-semibold text-blue-400">{dragEvents}</span>
                </div>
                <div>
                    <span className="text-gray-400">Reorder Requests:</span>
                    <span className="ml-2 font-semibold text-blue-400">{reorderRequests}</span>
                </div>
            </div>

            {/* Logs */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 text-xs font-mono">
                {logs.length === 0 ? (
                    <div className="text-gray-500 text-center py-8">
                        <p>No logs yet</p>
                        <p className="text-xs mt-2">Try dragging a todo card</p>
                    </div>
                ) : (
                    logs.map(log => (
                        <div key={log.id} className="flex gap-2 items-start">
                            {getLogIcon(log.type)}
                            <div className="flex-1">
                                <div className="text-gray-300">{log.message}</div>
                                <div className="text-gray-600 text-xs">{log.timestamp}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="bg-slate-800 px-4 py-2 border-t border-slate-700 flex gap-2">
                <button
                    onClick={() => setLogs([])}
                    className="flex-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs transition-colors"
                >
                    Clear Logs
                </button>
                <button
                    onClick={() => {
                        addLog('Manual test triggered', 'info');
                        console.log('Check browser console for more details');
                    }}
                    className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors"
                >
                    Test
                </button>
            </div>
        </div>
    );
}
