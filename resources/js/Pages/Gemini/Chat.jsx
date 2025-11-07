import React, { useState } from 'react';
import axios from 'axios';
import { Head } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

export default function Chat({ auth }) {
    const [message, setMessage] = useState('');
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;

        const userMessage = { role: 'user', text: message };
        setHistory(prev => [...prev, userMessage]);
        setLoading(true);
        setMessage('');

        try {
            const response = await axios.post(route('gemini.chat'), { message });
            const assistantMessage = { role: 'assistant', text: response.data.response };
            setHistory(prev => [...prev, assistantMessage]);
        } catch (error) {
            const errorMessage = { role: 'assistant', text: 'Sorry, something went wrong.' };
            setHistory(prev => [...prev, errorMessage]);
            console.error("Error sending message:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppLayout
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Gemini Chat</h2>}
        >
            <Head title="Gemini Chat" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            <div className="space-y-4 mb-4" style={{ height: '400px', overflowY: 'auto' }}>
                                {history.map((entry, index) => (
                                    <div key={index} className={`p-2 rounded-lg ${entry.role === 'user' ? 'bg-blue-100 text-right' : 'bg-gray-100'}`}>
                                        <strong>{entry.role === 'user' ? 'You' : 'Gemini'}:</strong>
                                        <p style={{ whiteSpace: 'pre-wrap' }}>{entry.text}</p>
                                    </div>
                                ))}
                                {loading && <div className="p-2 rounded-lg bg-gray-100"><strong>Gemini:</strong> Thinking...</div>}
                            </div>
                            <form onSubmit={sendMessage}>
                                <div className="flex items-center">
                                    <input
                                        type="text"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-lg"
                                        placeholder="Ask something about your to-dos..."
                                        disabled={loading}
                                    />
                                    <button type="submit" className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-lg" disabled={loading}>
                                        Send
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
