import React, { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Play, TestTube } from 'lucide-react';

export default function WebSocketTest() {
    const page = usePage();
    const [testResults, setTestResults] = useState({});
    const [isRunning, setIsRunning] = useState(false);

    const version = page?.props?.appVersion ?? import.meta.env.VITE_APP_VERSION ?? 'unknown';

    const runTest = async (testName, testFunction) => {
        setTestResults(prev => ({ ...prev, [testName]: { status: 'running', message: 'Testing...' } }));
        
        try {
            const result = await testFunction();
            setTestResults(prev => ({ ...prev, [testName]: result }));
        } catch (error) {
            setTestResults(prev => ({ 
                ...prev, 
                [testName]: { status: 'error', message: error.message } 
            }));
        }
    };

    const testServerConfig = async () => {
        const response = await fetch('/test-broadcasting');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        
        return {
            status: data.pusher_configured ? 'success' : 'warning',
            message: `v${data.app_version}, Pusher: ${data.pusher_configured ? '✓' : '✗'}`,
            details: data
        };
    };

    const testAuthEndpoint = async () => {
        const response = await fetch('/test-broadcasting-auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
            },
            body: JSON.stringify({
                socket_id: 'test.socket.id',
                channel_name: 'private-drawings.1'
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        return {
            status: data.auth ? 'success' : 'error',
            message: data.auth ? 'Auth successful' : 'Auth failed',
            details: data
        };
    };

    const testRealBroadcastingAuth = async () => {
        const response = await fetch('/broadcasting/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
            },
            body: JSON.stringify({
                socket_id: 'test.socket.id',
                channel_name: 'private-drawings.1'
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.text();
        
        if (data.trim() === '') {
            return {
                status: 'error',
                message: 'Empty response - this is the main issue!',
                details: { response: 'empty_string', headers: response.headers }
            };
        }
        
        try {
            const jsonData = JSON.parse(data);
            return {
                status: jsonData.auth ? 'success' : 'error',
                message: jsonData.auth ? 'Real auth successful' : 'Real auth failed',
                details: jsonData
            };
        } catch (e) {
            return {
                status: 'error',
                message: 'Non-JSON response',
                details: { response: data.substring(0, 200), error: e.message }
            };
        }
    };

    const testWebSocketConnection = async () => {
        if (!window.Echo) {
            return {
                status: 'error',
                message: 'Echo not initialized'
            };
        }
        
        try {
            const connectionState = window.Echo.connector.pusher.connection.state;
            return {
                status: connectionState === 'connected' ? 'success' : 'warning',
                message: `State: ${connectionState}`
            };
        } catch (error) {
            return {
                status: 'error',
                message: error.message
            };
        }
    };

    const testChannelSubscription = async () => {
        if (!window.Echo) {
            return {
                status: 'error',
                message: 'Echo not initialized'
            };
        }
        
        return new Promise((resolve) => {
            const testChannel = window.Echo.private('test-channel');
            
            const timeout = setTimeout(() => {
                testChannel.unsubscribe();
                resolve({
                    status: 'error',
                    message: 'Subscription timeout'
                });
            }, 5000);
            
            // This will be called when subscription succeeds or fails
            testChannel.subscribed(() => {
                clearTimeout(timeout);
                testChannel.unsubscribe();
                resolve({
                    status: 'success',
                    message: 'Channel subscription successful'
                });
            });
            
            testChannel.subscriptionError((error) => {
                clearTimeout(timeout);
                testChannel.unsubscribe();
                resolve({
                    status: 'error',
                    message: `Subscription error: ${error?.message || 'Unknown error'}`
                });
            });
        });
    };

    const runAllTests = async () => {
        setIsRunning(true);
        
        await runTest('server', testServerConfig);
        await runTest('auth', testAuthEndpoint);
        await runTest('realAuth', testRealBroadcastingAuth);
        await runTest('websocket', testWebSocketConnection);
        await runTest('channel', testChannelSubscription);
        
        setIsRunning(false);
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'success':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'error':
                return <XCircle className="h-4 w-4 text-red-500" />;
            case 'warning':
                return <AlertCircle className="h-4 w-4 text-yellow-500" />;
            case 'running':
                return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
            default:
                return <AlertCircle className="h-4 w-4 text-gray-500" />;
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
            case 'running':
                return 'text-blue-600 dark:text-blue-400';
            default:
                return 'text-gray-600 dark:text-gray-400';
        }
    };

    useEffect(() => {
        runAllTests();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <TestTube className="h-6 w-6 text-blue-500" />
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    WebSocket Integration Test
                                </h1>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    v{version}
                                </span>
                            </div>
                            <button
                                onClick={runAllTests}
                                disabled={isRunning}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
                                {isRunning ? 'Running Tests...' : 'Run All Tests'}
                            </button>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            This page helps diagnose WebSocket authentication issues. Click "Run All Tests" to check each component.
                        </div>

                        {Object.entries(testResults).map(([testName, result]) => (
                            <div key={testName} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    {getStatusIcon(result.status)}
                                    <span className="font-medium capitalize text-gray-900 dark:text-white">
                                        {testName === 'server' ? 'Server Configuration' :
                                         testName === 'auth' ? 'Test Auth Endpoint' :
                                         testName === 'realAuth' ? 'Real Broadcasting Auth' :
                                         testName === 'websocket' ? 'WebSocket Connection' :
                                         testName === 'channel' ? 'Channel Subscription' : testName}
                                    </span>
                                    <span className={`text-sm ${getStatusColor(result.status)}`}>
                                        {result.message}
                                    </span>
                                </div>
                                
                                {result.details && (
                                    <details className="mt-2">
                                        <summary className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer">
                                            View Details
                                        </summary>
                                        <pre className="mt-2 text-xs bg-gray-100 dark:bg-slate-700 p-3 rounded overflow-auto">
                                            {JSON.stringify(result.details, null, 2)}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        ))}

                        {Object.keys(testResults).length === 0 && (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                Click "Run All Tests" to start diagnostics
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
