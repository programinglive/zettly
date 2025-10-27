import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, RefreshCw } from 'lucide-react';

export default function SystemStatus() {
    const [status, setStatus] = useState({
        version: import.meta.env.VITE_APP_VERSION || '0.5.13',
        websocket: { status: 'checking', message: 'Testing...' },
        pusher: { status: 'checking', message: 'Testing...' },
        authentication: { status: 'checking', message: 'Testing...' },
        algolia: { status: 'checking', message: 'Testing...' },
        environment: { status: 'checking', message: 'Testing...' }
    });
    const [isExpanded, setIsExpanded] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const checkWebSocket = () => {
        if (!window.Echo) {
            return { status: 'error', message: 'Echo not initialized' };
        }
        
        try {
            const connectionState = window.Echo.connector.pusher.connection.state;
            if (connectionState === 'connected') {
                return { status: 'success', message: 'Connected to Pusher' };
            } else {
                return { status: 'error', message: `State: ${connectionState}` };
            }
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    };

    const checkPusher = () => {
        try {
            const pusherKey = import.meta.env.VITE_PUSHER_APP_KEY;
            const pusherCluster = import.meta.env.VITE_PUSHER_APP_CLUSTER;
            
            if (!pusherKey) {
                return { status: 'error', message: 'Pusher key missing' };
            }
            
            if (!pusherCluster) {
                return { status: 'warning', message: 'Pusher cluster missing' };
            }
            
            return { status: 'success', message: `Key: ${pusherKey.substring(0, 8)}...` };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    };

    const checkAuthentication = () => {
        try {
            const page = window.__inertia_page;
            const isAuthenticated = Boolean(page?.props?.auth?.user);
            
            if (isAuthenticated) {
                return { status: 'success', message: `Logged in as ${page.props.auth.user.name}` };
            } else {
                return { status: 'warning', message: 'Not authenticated' };
            }
        } catch (error) {
            return { status: 'error', message: 'Cannot determine auth status' };
        }
    };

    const checkAlgolia = () => {
        try {
            const algoliaAppId = import.meta.env.VITE_ALGOLIA_APP_ID;
            const algoliaSearchKey = import.meta.env.VITE_ALGOLIA_SEARCH_KEY;
            
            if (!algoliaAppId || !algoliaSearchKey) {
                return { status: 'warning', message: 'Algolia not configured' };
            }
            
            return { status: 'success', message: `App ID: ${algoliaAppId}` };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    };

    const checkEnvironment = () => {
        try {
            const env = import.meta.env.MODE;
            const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
            
            return { status: 'info', message: `${env} at ${appUrl}` };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    };

    const runChecks = async () => {
        setIsRefreshing(true);
        
        const newStatus = {
            version: import.meta.env.VITE_APP_VERSION || '0.5.13',
            websocket: checkWebSocket(),
            pusher: checkPusher(),
            authentication: checkAuthentication(),
            algolia: checkAlgolia(),
            environment: checkEnvironment()
        };
        
        setStatus(newStatus);
        setIsRefreshing(false);
    };

    useEffect(() => {
        runChecks();
        
        // Set up WebSocket listener to update status in real-time
        if (window.Echo) {
            const updateWebSocketStatus = () => {
                setStatus(prev => ({
                    ...prev,
                    websocket: checkWebSocket()
                }));
            };
            
            window.Echo.connector.pusher.connection.bind('connected', updateWebSocketStatus);
            window.Echo.connector.pusher.connection.bind('disconnected', updateWebSocketStatus);
            window.Echo.connector.pusher.connection.bind('error', updateWebSocketStatus);
            
            return () => {
                window.Echo.connector.pusher.connection.unbind('connected', updateWebSocketStatus);
                window.Echo.connector.pusher.connection.unbind('disconnected', updateWebSocketStatus);
                window.Echo.connector.pusher.connection.unbind('error', updateWebSocketStatus);
            };
        }
    }, []);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'success':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'error':
                return <XCircle className="h-4 w-4 text-red-500" />;
            case 'warning':
                return <AlertCircle className="h-4 w-4 text-yellow-500" />;
            case 'info':
            case 'checking':
            default:
                return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'success':
                return 'text-green-600 dark:text-green-400';
            case 'error':
                return 'text-red-600 dark:text-red-400';
            case 'warning':
                return 'text-yellow-600 dark:text-yellow-400';
            case 'info':
            case 'checking':
            default:
                return 'text-blue-600 dark:text-blue-400';
        }
    };

    const allChecksPass = Object.values(status).every(
        item => typeof item === 'object' ? item.status === 'success' || item.status === 'info' : true
    );

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700">
                {/* Status Summary */}
                <div className="flex items-center gap-2 p-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                    {getStatusIcon(allChecksPass ? 'success' : 'warning')}
                    <span className="text-sm font-medium">
                        System Status: {allChecksPass ? 'Healthy' : 'Issues Detected'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        v{status.version}
                    </span>
                    <RefreshCw 
                        className={`h-4 w-4 text-gray-400 ml-2 ${isRefreshing ? 'animate-spin' : ''}`} 
                        onClick={(e) => {
                            e.stopPropagation();
                            runChecks();
                        }}
                    />
                </div>

                {/* Detailed Status */}
                {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-slate-700 p-3 space-y-2">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">System Dependencies</div>
                        
                        <div className="flex items-center gap-2 text-xs">
                            {getStatusIcon(status.websocket.status)}
                            <span className="font-medium">WebSocket:</span>
                            <span className={getStatusColor(status.websocket.status)}>
                                {status.websocket.message}
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs">
                            {getStatusIcon(status.pusher.status)}
                            <span className="font-medium">Pusher:</span>
                            <span className={getStatusColor(status.pusher.status)}>
                                {status.pusher.message}
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs">
                            {getStatusIcon(status.authentication.status)}
                            <span className="font-medium">Authentication:</span>
                            <span className={getStatusColor(status.authentication.status)}>
                                {status.authentication.message}
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs">
                            {getStatusIcon(status.algolia.status)}
                            <span className="font-medium">Algolia:</span>
                            <span className={getStatusColor(status.algolia.status)}>
                                {status.algolia.message}
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs">
                            {getStatusIcon(status.environment.status)}
                            <span className="font-medium">Environment:</span>
                            <span className={getStatusColor(status.environment.status)}>
                                {status.environment.message}
                            </span>
                        </div>
                        
                        <div className="mt-3 pt-2 border-t border-gray-200 dark:border-slate-700">
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <Info className="h-3 w-3" />
                                <span>Click refresh to recheck all systems</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
