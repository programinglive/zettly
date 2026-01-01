import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Target, Save } from 'lucide-react';

import DashboardLayout from '../../Layouts/DashboardLayout';

const HabitEdit = ({ habit, organizations }) => {
    const { data, setData, put, processing, errors } = useForm({
        title: habit.title,
        description: habit.description || '',
        color: habit.color,
        icon: habit.icon,
        target_frequency: habit.target_frequency,
        frequency_period: habit.frequency_period,
        is_active: habit.is_active,
        organization_id: habit.organization_id,
    });

    const availableColors = [
        '#6B7280', // gray-500
        '#374151', // gray-700
        '#111827', // gray-900
        '#9CA3AF', // gray-400
        '#D1D5DB', // gray-300
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
        put(route('habits.update', habit.id), {
            onSuccess: () => {
                // Habit updated successfully
            },
            onError: (errors) => {
                console.error('Error updating habit:', errors);
            }
        });
    };

    return (
        <>
            <Head title={`Edit ${habit.title}`} />
            
            <DashboardLayout>
                <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <Link
                            href={route('habits.show', habit.id)}
                            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Habit Details
                        </Link>
                        
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <Target className="w-8 h-8" />
                            Edit Habit
                        </h1>
                        <p className="mt-2 text-gray-600">
                            Update your habit settings and preferences
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Information */}
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                Basic Information
                            </h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        className="w-full border-gray-300 rounded-md px-3 py-2"
                                        placeholder="e.g., Drink water, Exercise, Read"
                                        required
                                    />
                                    {errors.title && (
                                        <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        className="w-full border-gray-300 rounded-md px-3 py-2"
                                        rows={3}
                                        placeholder="Optional: Add more details about this habit..."
                                    />
                                    {errors.description && (
                                        <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                                    )}
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={data.is_active}
                                        onChange={(e) => setData('is_active', e.target.checked)}
                                        className="rounded border-gray-300"
                                    />
                                    <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                                        Active (uncheck to archive this habit)
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Appearance */}
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                Appearance
                            </h2>
                            
                            <div className="space-y-4">
                                {/* Color Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Color
                                    </label>
                                    <div className="flex gap-2">
                                        {availableColors.map((color) => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setData('color', color)}
                                                className={`w-10 h-10 rounded-full border-2 transition-all ${
                                                    data.color === color
                                                        ? 'border-gray-900 scale-110'
                                                        : 'border-gray-300'
                                                }`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                    {errors.color && (
                                        <p className="mt-1 text-sm text-red-600">{errors.color}</p>
                                    )}
                                </div>

                                {/* Icon Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Icon
                                    </label>
                                    <div className="flex gap-2">
                                        {availableIcons.map((icon) => (
                                            <button
                                                key={icon.name}
                                                type="button"
                                                onClick={() => setData('icon', icon.name)}
                                                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                                                    data.icon === icon.name
                                                        ? 'border-gray-900 bg-gray-100 scale-110'
                                                        : 'border-gray-300 bg-white'
                                                }`}
                                            >
                                                <span className="text-lg">{icon.display}</span>
                                            </button>
                                        ))}
                                    </div>
                                    {errors.icon && (
                                        <p className="mt-1 text-sm text-red-600">{errors.icon}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Frequency Settings */}
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                Frequency Settings
                            </h2>
                            
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Target Frequency *
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={data.target_frequency}
                                            onChange={(e) => setData('target_frequency', parseInt(e.target.value))}
                                            className="w-full border-gray-300 rounded-md px-3 py-2"
                                            required
                                        />
                                        {errors.target_frequency && (
                                            <p className="mt-1 text-sm text-red-600">{errors.target_frequency}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Period *
                                        </label>
                                        <select
                                            value={data.frequency_period}
                                            onChange={(e) => setData('frequency_period', e.target.value)}
                                            className="w-full border-gray-300 rounded-md px-3 py-2"
                                            required
                                        >
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="monthly">Monthly</option>
                                        </select>
                                        {errors.frequency_period && (
                                            <p className="mt-1 text-sm text-red-600">{errors.frequency_period}</p>
                                        )}
                                    </div>
                                </div>

                                <p className="text-sm text-gray-600">
                                    Complete this habit {data.target_frequency} time{data.target_frequency > 1 ? 's' : ''} per {data.frequency_period}
                                </p>
                            </div>
                        </div>

                        {/* Organization */}
                        {organizations.length > 0 && (
                            <div className="bg-white border border-gray-200 rounded-lg p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                    Organization
                                </h2>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Share with Organization
                                    </label>
                                    <select
                                        value={data.organization_id || ''}
                                        onChange={(e) => setData('organization_id', e.target.value || null)}
                                        className="w-full border-gray-300 rounded-md px-3 py-2"
                                    >
                                        <option value="">Personal (only you)</option>
                                        {organizations.map((org) => (
                                            <option key={org.id} value={org.id}>
                                                {org.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.organization_id && (
                                        <p className="mt-1 text-sm text-red-600">{errors.organization_id}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-4">
                            <button
                                type="submit"
                                disabled={processing}
                                className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-3 rounded-lg flex items-center gap-2 disabled:opacity-50"
                            >
                                <Save className="w-5 h-5" />
                                {processing ? 'Saving...' : 'Save Changes'}
                            </button>
                            
                            <Link
                                href={route('habits.show', habit.id)}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-6 py-3 rounded-lg"
                            >
                                Cancel
                            </Link>
                        </div>
                    </form>
                </div>
            </DashboardLayout>
        </>
    );
};

export default HabitEdit;
