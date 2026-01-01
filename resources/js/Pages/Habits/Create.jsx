import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Target, Plus, Sparkles } from 'lucide-react';

import DashboardLayout from '../../Layouts/DashboardLayout';

const HabitCreate = ({ organizations, currentOrganization }) => {
    const { data, setData, post, processing, errors } = useForm({
        title: '',
        description: '',
        color: '#8B5CF6', // purple-500
        icon: 'circle',
        target_frequency: 1,
        frequency_period: 'daily',
        organization_id: currentOrganization || null,
    });

    const availableColors = [
        { name: 'Purple', value: '#8B5CF6', gradient: 'from-purple-500 to-purple-700' },
        { name: 'Blue', value: '#3B82F6', gradient: 'from-blue-500 to-blue-700' },
        { name: 'Green', value: '#10B981', gradient: 'from-green-500 to-green-700' },
        { name: 'Pink', value: '#EC4899', gradient: 'from-pink-500 to-pink-700' },
        { name: 'Orange', value: '#F59E0B', gradient: 'from-orange-500 to-orange-700' },
        { name: 'Red', value: '#EF4444', gradient: 'from-red-500 to-red-700' },
        { name: 'Teal', value: '#14B8A6', gradient: 'from-teal-500 to-teal-700' },
        { name: 'Indigo', value: '#6366F1', gradient: 'from-indigo-500 to-indigo-700' },
    ];

    const availableIcons = [
        { name: 'circle', display: '●' },
        { name: 'star', display: '★' },
        { name: 'heart', display: '♥' },
        { name: 'check', display: '✓' },
        { name: 'target', display: '◎' },
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('habits.store'), {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                // Habit created successfully
            },
            onError: (errors) => {
                console.error('Error creating habit:', errors);
                // Check for CSRF token expiration (419 error)
                if (errors.message && errors.message.includes('419')) {
                    alert('Your session has expired. Please refresh the page and try again.');
                    window.location.reload();
                }
            }
        });
    };

    const getIconDisplay = (iconName) => {
        const icon = availableIcons.find(i => i.name === iconName);
        return icon ? icon.display : '●';
    };

    return (
        <>
            <Head title="Create Habit" />

            <DashboardLayout>
                {/* Gradient Header */}
                <div className="bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 text-white">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                        <Link
                            href={route('habits.index', {
                                organization_id: currentOrganization
                            })}
                            className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 font-medium"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Back to Habits
                        </Link>

                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 backdrop-blur-lg p-4 rounded-2xl">
                                <Sparkles className="w-10 h-10" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-bold mb-2">
                                    Create New Habit
                                </h1>
                                <p className="text-lg opacity-90">
                                    Design your path to consistency
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Form */}
                        <div className="lg:col-span-2">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Basic Information */}
                                <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
                                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                        <Target className="w-5 h-5 text-purple-600" />
                                        Basic Information
                                    </h2>

                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Habit Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={data.title}
                                                onChange={(e) => setData('title', e.target.value)}
                                                className="w-full border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                                                placeholder="e.g., Morning Exercise, Read 30 minutes"
                                                required
                                            />
                                            {errors.title && (
                                                <p className="mt-2 text-sm text-red-600">{errors.title}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Description
                                            </label>
                                            <textarea
                                                value={data.description}
                                                onChange={(e) => setData('description', e.target.value)}
                                                className="w-full border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                rows={3}
                                                placeholder="What's this habit about? Why is it important to you?"
                                            />
                                            {errors.description && (
                                                <p className="mt-2 text-sm text-red-600">{errors.description}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Appearance */}
                                <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
                                    <h2 className="text-xl font-bold text-gray-900 mb-6">
                                        🎨 Appearance
                                    </h2>

                                    <div className="space-y-6">
                                        {/* Color Selection */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                Choose a Color
                                            </label>
                                            <div className="grid grid-cols-4 gap-3">
                                                {availableColors.map((color) => (
                                                    <button
                                                        key={color.value}
                                                        type="button"
                                                        onClick={() => setData('color', color.value)}
                                                        className={`relative h-16 rounded-xl transition-all duration-200 ${data.color === color.value
                                                                ? 'ring-4 ring-offset-2 scale-105 shadow-lg'
                                                                : 'hover:scale-105'
                                                            }`}
                                                        style={{
                                                            backgroundColor: color.value,
                                                            ringColor: color.value
                                                        }}
                                                    >
                                                        {data.color === color.value && (
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <div className="bg-white rounded-full p-1">
                                                                    <svg className="w-4 h-4 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                    </svg>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                            {errors.color && (
                                                <p className="mt-2 text-sm text-red-600">{errors.color}</p>
                                            )}
                                        </div>

                                        {/* Icon Selection */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                                Pick an Icon
                                            </label>
                                            <div className="flex gap-3">
                                                {availableIcons.map((icon) => (
                                                    <button
                                                        key={icon.name}
                                                        type="button"
                                                        onClick={() => setData('icon', icon.name)}
                                                        className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center transition-all duration-200 ${data.icon === icon.name
                                                                ? 'border-purple-500 bg-purple-50 scale-110 shadow-lg'
                                                                : 'border-gray-200 bg-white hover:border-gray-300 hover:scale-105'
                                                            }`}
                                                    >
                                                        <span className="text-2xl">{icon.display}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            {errors.icon && (
                                                <p className="mt-2 text-sm text-red-600">{errors.icon}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Frequency Settings */}
                                <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
                                    <h2 className="text-xl font-bold text-gray-900 mb-6">
                                        📅 Frequency
                                    </h2>

                                    <div className="space-y-5">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    Target *
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    value={data.target_frequency}
                                                    onChange={(e) => setData('target_frequency', parseInt(e.target.value))}
                                                    className="w-full border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-semibold"
                                                    required
                                                />
                                                {errors.target_frequency && (
                                                    <p className="mt-2 text-sm text-red-600">{errors.target_frequency}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    Period *
                                                </label>
                                                <select
                                                    value={data.frequency_period}
                                                    onChange={(e) => setData('frequency_period', e.target.value)}
                                                    className="w-full border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-semibold"
                                                    required
                                                >
                                                    <option value="daily">Daily</option>
                                                    <option value="weekly">Weekly</option>
                                                    <option value="monthly">Monthly</option>
                                                </select>
                                                {errors.frequency_period && (
                                                    <p className="mt-2 text-sm text-red-600">{errors.frequency_period}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
                                            <p className="text-sm font-medium text-gray-700">
                                                📊 Goal: Complete this habit <span className="font-bold text-purple-600">{data.target_frequency}</span> time{data.target_frequency > 1 ? 's' : ''} per <span className="font-bold text-purple-600">{data.frequency_period}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Organization */}
                                {organizations.length > 0 && (
                                    <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
                                        <h2 className="text-xl font-bold text-gray-900 mb-6">
                                            👥 Sharing
                                        </h2>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Share with Organization
                                            </label>
                                            <select
                                                value={data.organization_id || ''}
                                                onChange={(e) => setData('organization_id', e.target.value || null)}
                                                className="w-full border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            >
                                                <option value="">Personal (only you)</option>
                                                {organizations.map((org) => (
                                                    <option key={org.id} value={org.id}>
                                                        {org.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {errors.organization_id && (
                                                <p className="mt-2 text-sm text-red-600">{errors.organization_id}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-4">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-500 text-white px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Plus className="w-6 h-6" />
                                        {processing ? 'Creating...' : 'Create Habit'}
                                    </button>

                                    <Link
                                        href={route('habits.index', {
                                            organization_id: currentOrganization
                                        })}
                                        className="px-8 py-4 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </Link>
                                </div>
                            </form>
                        </div>

                        {/* Live Preview */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-8">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">
                                    ✨ Preview
                                </h3>
                                <div
                                    className="bg-white rounded-2xl p-6 shadow-lg border-2"
                                    style={{
                                        background: `linear-gradient(white, white) padding-box, linear-gradient(135deg, ${data.color}40, ${data.color}80) border-box`,
                                        borderColor: 'transparent'
                                    }}
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <div
                                            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                                            style={{
                                                background: `linear-gradient(135deg, ${data.color}, ${data.color}dd)`
                                            }}
                                        >
                                            <span className="text-white text-2xl">
                                                {getIconDisplay(data.icon)}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900">
                                                {data.title || 'Your Habit Name'}
                                            </h4>
                                            <p className="text-sm text-gray-600">
                                                {data.target_frequency}x {data.frequency_period}
                                            </p>
                                        </div>
                                    </div>

                                    {data.description && (
                                        <p className="text-sm text-gray-600 mb-4">
                                            {data.description}
                                        </p>
                                    )}

                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-600">Progress</span>
                                                <span className="font-bold" style={{ color: data.color }}>0/{data.target_frequency}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-3">
                                                <div
                                                    className="h-3 rounded-full"
                                                    style={{
                                                        width: '0%',
                                                        background: `linear-gradient(90deg, ${data.color}, ${data.color}dd)`
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </>
    );
};

export default HabitCreate;
