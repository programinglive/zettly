import React, { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';

function PusherTest() {
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [messages, setMessages] = useState([]);
    const [testResult, setTestResult] = useState(null);

    useEffect(() => {
        if (!window.Echo) {
            setConnectionStatus('error');
            setTestResult('❌ Echo not loaded - check WebSocket configuration');
            return;
        }

        // Test connection to Pusher
        try {
            const pusher = window.Echo.connector.pusher;

            pusher.connection.bind('connected', () => {
                setConnectionStatus('connected');
                setTestResult('✅ Successfully connected to Pusher!');
            });

            pusher.connection.bind('disconnected', () => {
                setConnectionStatus('disconnected');
            });

            pusher.connection.bind('error', (err) => {
                setConnectionStatus('error');
                setTestResult(`❌ Connection error: ${err.error.data.message}`);
            });

            // Listen to a test channel
            const channel = window.Echo.channel('test-channel');

            channel.listen('TestEvent', (e) => {
                setMessages(prev => [...prev, `Received: ${JSON.stringify(e)}`]);
            });

            return () => {
                channel.stopListening('TestEvent');
                window.Echo.leaveChannel('test-channel');
            };
        } catch (error) {
            setConnectionStatus('error');
            setTestResult(`❌ Error: ${error.message}`);
        }
    }, []);

    const testBroadcast = async () => {
        try {
            const response = await axios.post('/test/pusher/broadcast');

            const result = response.data;

            if (result.success) {
                setMessages(prev => [...prev, `✅ Broadcast sent: ${result.message}`]);
            } else {
                setMessages(prev => [...prev, `❌ Broadcast failed: ${result.message}`]);
            }
        } catch (error) {
            setMessages(prev => [...prev, `❌ Error: ${error.message}`]);
        }
    };

    return (
        <AppLayout>
            <Head title="Pusher Connection Test" />

            <div className="max-w-4xl mx-auto p-6">
                <h1 className="text-3xl font-bold mb-6">Pusher WebSocket Test</h1>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' :
                                connectionStatus === 'disconnected' ? 'bg-gray-400' :
                                    'bg-red-500'
                            }`} />
                        <span className="capitalize">{connectionStatus}</span>
                    </div>
                    {testResult && (
                        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
                            <pre className="text-sm">{testResult}</pre>
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Test Broadcast</h2>
                    <button
                        onClick={testBroadcast}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                        Send Test Broadcast
                    </button>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Messages</h2>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {messages.length === 0 ? (
                            <p className="text-gray-500">No messages yet...</p>
                        ) : (
                            messages.map((msg, i) => (
                                <div key={i} className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                                    {msg}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

export default PusherTest;
