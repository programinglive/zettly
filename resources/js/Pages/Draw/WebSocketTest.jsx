import React, { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Play, TestTube, Copy, Check } from 'lucide-react';

export default function WebSocketTest() {
    const page = usePage();
    const [testResults, setTestResults] = useState({});
    const [isRunning, setIsRunning] = useState(false);
    const [copied, setCopied] = useState(false);

    const version = page?.props?.appVersion ?? import.meta.env.VITE_APP_VERSION ?? 'unknown';

    const copyAllResults = () => {
        const allResults = Object.entries(testResults).map(([testName, result]) => {
            const testDisplayName = testName === 'server' ? 'Server Configuration' :
                                   testName === 'auth' ? 'Test Auth Endpoint' :
                                   testName === 'realAuth' ? 'Real Broadcasting Auth' :
                                   testName === 'websocket' ? 'WebSocket Connection' :
                                   testName === 'channel' ? 'Channel Subscription (Test)' :
                                   testName === 'realDrawing' ? 'Channel Subscription (Real Drawing)' : testName;
            
            let resultText = `${testDisplayName}: ${result.message}\n`;
            if (result.details) {
                resultText += `Details: ${JSON.stringify(result.details, null, 2)}\n`;
            }
            return resultText;
        }).join('\n');

        const fullReport = `WebSocket Integration Test Results - ${new Date().toISOString()}\n` +
                          `Environment: ${testResults.server?.details?.environment?.toUpperCase() || 'UNKNOWN'}\n` +
                          `Version: ${version}\n` +
                          `${'='.repeat(50)}\n${allResults}`;

        navigator.clipboard.writeText(fullReport).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

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
        try {
            const response = await axios.get('/test-broadcasting');
            const data = response.data;
            
            // Check for critical issues
            const issues = [];
            if (data.broadcast_driver !== 'pusher') {
                issues.push(`Broadcast driver is "${data.broadcast_driver}" instead of "pusher"`);
            }
            if (!data.pusher_configured) {
                issues.push('Pusher is not configured');
            }
            if (!data.user_authenticated) {
                issues.push('User is not authenticated');
            }
            
            return {
                status: issues.length > 0 ? 'warning' : 'success',
                message: issues.length > 0 
                    ? `Issues: ${issues.join(', ')}`
                    : `Environment: ${data.environment?.toUpperCase() || 'UNKNOWN'}, Version: ${data.app_version}, Pusher: ✓`,
                details: data,
                issues: issues.length > 0 ? issues : undefined
            };
        } catch (error) {
            return {
                status: 'error',
                message: `Failed to fetch server config: ${error.message}`,
                details: { error: error.message }
            };
        }
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
            const testChannel = window.Echo.private('test.123'); // Echo.private() will add private- prefix
            let subscriptionResolved = false;
            
            const timeout = setTimeout(() => {
                if (!subscriptionResolved) {
                    subscriptionResolved = true;
                    testChannel.unsubscribe();
                    resolve({
                        status: 'error',
                        message: 'Subscription timeout after 5 seconds (this may be normal for test channels)',
                        details: {
                            note: 'Test channels may not work without actual Pusher connection',
                            suggestion: 'Try testing with a real drawing channel instead'
                        }
                    });
                }
            }, 5000);
            
            // Enhanced subscription success handler
            testChannel.subscribed(() => {
                if (!subscriptionResolved) {
                    subscriptionResolved = true;
                    clearTimeout(timeout);
                    console.log('[WebSocket Test] Test channel subscription successful');
                    resolve({
                        status: 'success',
                        message: 'Test channel subscription successful',
                        details: {
                            channel_name: 'private-test.123',
                            note: 'Test channel working correctly'
                        }
                    });
                }
            });
            
            // Enhanced subscription error handler
            testChannel.error((error) => {
                if (!subscriptionResolved) {
                    subscriptionResolved = true;
                    clearTimeout(timeout);
                    console.error('[WebSocket Test] Test channel subscription error:', error);
                    resolve({
                        status: 'error',
                        message: `Channel error: ${error?.message || 'Unknown error'}`,
                        details: {
                            error: error,
                            channel_name: 'private-test.123',
                            suggestion: 'Check browser console for more details'
                        }
                    });
                }
            });
        });
    };

    const testRealDrawingSubscription = async () => {
        if (!window.Echo) {
            return {
                status: 'error',
                message: 'Echo not initialized'
            };
        }
        
        // Get the drawing ID from the page props or use a default
        const drawingId = page?.props?.drawing?.id || 2;
        const channelName = `drawings.${drawingId}`; // Echo.private() will add private- prefix
        
        return new Promise((resolve) => {
            const testChannel = window.Echo.private(channelName);
            let subscriptionResolved = false;
            
            const timeout = setTimeout(() => {
                if (!subscriptionResolved) {
                    subscriptionResolved = true;
                    testChannel.unsubscribe();
                    resolve({
                        status: 'warning',
                        message: `Real drawing subscription timeout after 5 seconds`,
                        details: {
                            channel_name: channelName,
                            drawing_id: drawingId,
                            note: 'This may indicate an issue with the actual drawing channel'
                        }
                    });
                }
            }, 5000);
            
            // Listen for subscription success
            testChannel.subscribed(() => {
                if (!subscriptionResolved) {
                    subscriptionResolved = true;
                    clearTimeout(timeout);
                    testChannel.unsubscribe();
                    resolve({
                        status: 'success',
                        message: `Real drawing channel subscription successful`,
                        details: {
                            channel_name: channelName,
                            drawing_id: drawingId
                        }
                    });
                }
            });
            
            // Listen for subscription errors
            try {
                if (typeof testChannel.subscriptionError === 'function') {
                    testChannel.subscriptionError((error) => {
                        if (!subscriptionResolved) {
                            subscriptionResolved = true;
                            clearTimeout(timeout);
                            testChannel.unsubscribe();
                            resolve({
                                status: 'error',
                                message: `Real drawing subscription error: ${error?.message || 'Unknown error'}`,
                                details: {
                                    channel_name: channelName,
                                    drawing_id: drawingId,
                                    error: error?.message
                                }
                            });
                        }
                    });
                }
            } catch (e) {
                // subscriptionError method not available, continue with timeout
            }
            
            // Also listen for general errors
            try {
                testChannel.error((error) => {
                    if (!subscriptionResolved) {
                        subscriptionResolved = true;
                        clearTimeout(timeout);
                        testChannel.unsubscribe();
                        resolve({
                            status: 'error',
                            message: `Real drawing channel error: ${error?.message || 'Unknown error'}`,
                            details: {
                                channel_name: channelName,
                                drawing_id: drawingId,
                                error: error?.message
                            }
                        });
                    }
                });
            } catch (e) {
                // error method not available, continue with timeout
            }
        });
    };

    const runAllTests = async () => {
        setIsRunning(true);
        
        await runTest('server', testServerConfig);
        await runTest('auth', testAuthEndpoint);
        await runTest('realAuth', testRealBroadcastingAuth);
        await runTest('websocket', testWebSocketConnection);
        await runTest('channel', testChannelSubscription);
        await runTest('realDrawing', testRealDrawingSubscription);
        
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
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={copyAllResults}
                                    disabled={Object.keys(testResults).length === 0}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    {copied ? 'Copied!' : 'Copy Results'}
                                </button>
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
                                         testName === 'channel' ? 'Channel Subscription (Test)' :
                                         testName === 'realDrawing' ? <div className="mb-4">
                                            <svg
                                                className="h-16 w-auto group-hover:scale-110 transition-transform duration-300"
                                                viewBox="0 0 100 32"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                            >
                                                <rect width="32" height="32" rx="6" fill="#FF6B6B"/>
                                                <path
                                                    d="M8 16L12 12L16 16L20 12L24 16"
                                                    stroke="white"
                                                    strokeWidth="2.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                                <path
                                                    d="M8 20L12 16L16 20L20 16L24 20"
                                                    stroke="white"
                                                    strokeWidth="2.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                                <text x="38" y="22" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#FF6B6B">tldraw</text>
                                            </svg>
                                        </div> : testName}
                                    </span>
                                    <span className={`text-sm ${getStatusColor(result.status)}`}>
                                        {result.message}
                                    </span>
                                </div>
                                
                                {result.issues && (
                                    <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                                        <div className="text-sm text-red-700 dark:text-red-300 font-medium">Critical Issues:</div>
                                        <ul className="text-sm text-red-600 dark:text-red-400 list-disc list-inside">
                                            {result.issues.map((issue, index) => (
                                                <li key={index}>{issue}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                
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
