import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { CheckSquare, Plus, ArrowRight } from 'lucide-react';

import AppLayout from '../../Layouts/AppLayout';

export default function Index({ message }) {
    return (
        <AppLayout title="Home">
            <div className="max-w-4xl mx-auto">
                {/* Hero Section */}
                <div className="text-center mb-12">
                    <div className="text-6xl mb-6">📝</div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        Welcome to Todo App
                    </h1>
                    <p className="text-xl text-gray-600 mb-8">
                        {message}
                    </p>
                    <p className="text-lg text-gray-500 mb-8">
                        A modern, beautiful todo application built with React, Inertia.js, and shadcn/ui
                    </p>
                </div>

                {/* Features */}
                <div className="grid md:grid-cols-3 gap-8 mb-12">
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <div className="text-3xl mb-4">✅</div>
                        <h3 className="text-xl font-semibold mb-2">Complete Tasks</h3>
                        <p className="text-gray-600">Mark tasks as complete with a single click</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <div className="text-3xl mb-4">📝</div>
                        <h3 className="text-xl font-semibold mb-2">Organize Tasks</h3>
                        <p className="text-gray-600">Create, edit, and delete tasks with ease</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <div className="text-3xl mb-4">🎨</div>
                        <h3 className="text-xl font-semibold mb-2">Beautiful UI</h3>
                        <p className="text-gray-600">Modern interface with shadcn/ui components</p>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="text-center bg-gray-50 p-8 rounded-lg">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        Ready to get started?
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Create your first todo and start organizing your tasks!
                    </p>
                    <Link href="/todos">
                        <button className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-md text-lg font-medium hover:bg-indigo-500 transition-colors">
                            <CheckSquare className="w-5 h-5 mr-2" />
                            View My Todos
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </button>
                    </Link>
                </div>
            </div>
        </AppLayout>
    );
}
