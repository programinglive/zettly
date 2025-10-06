import React, { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

export default function TagEditModal({ isOpen = false, onClose = () => {}, tag = null }) {
    const [error, setError] = useState('');
    
    const { data, setData, put, processing, errors, reset } = useForm({
        name: '',
        color: '#3B82F6',
    });

    // Update form data when tag changes
    useEffect(() => {
        if (tag && typeof tag === 'object') {
            setData({
                name: (tag.name && typeof tag.name === 'string') ? tag.name : '',
                color: (tag.color && typeof tag.color === 'string') ? tag.color : '#3B82F6',
            });
            setError('');
        }
    }, [tag, setData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!tag) return;

        put(`/tags/${tag.id}`, {
            onSuccess: () => {
                onClose();
                reset();
                setError('');
            },
            onError: (errors) => {
                console.error('Tag update error:', errors);
                if (errors && typeof errors === 'object') {
                    if (errors.message) {
                        setError(errors.message);
                    } else if (errors.name && Array.isArray(errors.name) && errors.name.length > 0) {
                        setError(errors.name[0]);
                    } else {
                        setError('Failed to update tag. Please try again.');
                    }
                } else {
                    setError('Failed to update tag. Please try again.');
                }
            }
        });
    };

    const handleClose = () => {
        onClose();
        reset();
        setError('');
    };

    const predefinedColors = [
        '#3B82F6', // Blue
        '#10B981', // Green
        '#F59E0B', // Yellow
        '#EF4444', // Red
        '#8B5CF6', // Purple
        '#06B6D4', // Cyan
        '#F97316', // Orange
        '#84CC16', // Lime
    ];

    if (!isOpen || !tag) {
        return <></>;
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                {/* Backdrop */}
                <div 
                    className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                    onClick={handleClose}
                />

                {/* Modal */}
                <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Edit Tag
                        </h3>
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Tag Name */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Tag Name
                            </label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="Enter tag name..."
                                value={data.name}
                                onChange={(e) => {
                                    setData('name', e.target.value);
                                    if (error) setError('');
                                }}
                                className={`bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 ${
                                    (error || errors.name) ? 'border-red-500 dark:border-red-500' : ''
                                }`}
                            />
                            {(error || errors.name) && (
                                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                    {error || errors.name[0]}
                                </p>
                            )}
                        </div>

                        {/* Color Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Color
                            </label>
                            
                            {/* Predefined Colors */}
                            <div className="flex flex-wrap gap-2 mb-3">
                                {predefinedColors.map(color => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setData('color', color)}
                                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                                            data.color === color
                                                ? 'border-gray-900 dark:border-gray-100 scale-110'
                                                : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                                        }`}
                                        style={{ backgroundColor: color }}
                                        aria-label={`Select ${color} color`}
                                    />
                                ))}
                            </div>

                            {/* Custom Color Picker */}
                            <div className="flex items-center space-x-3">
                                <input
                                    type="color"
                                    value={data.color}
                                    onChange={(e) => setData('color', e.target.value)}
                                    className="w-10 h-10 rounded border border-gray-300 dark:border-gray-600"
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                                    {data.color}
                                </span>
                                {/* Color Preview */}
                                <div className="flex items-center space-x-2">
                                    <div
                                        className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600"
                                        style={{ backgroundColor: data.color }}
                                    />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        Preview
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleClose}
                                disabled={processing}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={!data.name.trim() || processing}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {processing ? 'Updating...' : 'Update Tag'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// Ensure proper export
TagEditModal.displayName = 'TagEditModal';
