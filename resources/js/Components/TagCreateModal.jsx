import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

export default function TagCreateModal({ isOpen = false, onClose = () => { } }) {
    const [error, setError] = useState('');

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        color: '#3B82F6',
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        post('/manage/tags', {
            onSuccess: () => {
                onClose();
                reset();
                setError('');
            },
            onError: (errors) => {
                if (errors && typeof errors === 'object') {
                    if (errors.message) {
                        setError(errors.message);
                    } else if (errors.name && Array.isArray(errors.name) && errors.name.length > 0) {
                        setError(errors.name[0]);
                    } else {
                        setError('Failed to create tag. Please try again.');
                    }
                } else {
                    setError('Failed to create tag. Please try again.');
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

    if (!isOpen) {
        return <></>;
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-gray-500/75 backdrop-blur-sm transition-opacity"
                    onClick={handleClose}
                />

                {/* Modal */}
                <div className="relative transform overflow-hidden rounded-[2rem] bg-white dark:bg-slate-900 px-4 pb-4 pt-5 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-8 border border-gray-100 dark:border-slate-800">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                                Create New Tag
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                                Give your tag a name and pick a vibrant color.
                            </p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Tag Name */}
                        <div className="space-y-3">
                            <label htmlFor="name" className="block text-sm font-bold text-gray-700 dark:text-slate-300 uppercase tracking-widest">
                                Tag Name
                            </label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="e.g. Work, Urgent, Personal"
                                value={data.name}
                                onChange={(e) => {
                                    setData('name', e.target.value);
                                    if (error) setError('');
                                }}
                                autoFocus
                                className={`h-14 rounded-2xl bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700 focus:ring-2 focus:ring-black dark:focus:ring-white transition-all text-lg font-medium ${(error || errors.name) ? 'border-red-500 focus:ring-red-500' : ''
                                    }`}
                            />
                            {(error || errors.name) && (
                                <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                                    {error || (errors.name && errors.name[0])}
                                </p>
                            )}
                        </div>

                        {/* Color Selection */}
                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 uppercase tracking-widest">
                                Pick a Color
                            </label>

                            {/* Predefined Colors */}
                            <div className="grid grid-cols-4 sm:grid-cols-8 gap-4">
                                {predefinedColors.map(color => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setData('color', color)}
                                        className={`w-10 h-10 rounded-2xl border-2 transition-all duration-300 ${data.color === color
                                                ? 'border-gray-900 dark:border-white scale-110 shadow-lg'
                                                : 'border-transparent hover:scale-110'
                                            }`}
                                        style={{ backgroundColor: color }}
                                        title={color}
                                    />
                                ))}
                            </div>

                            {/* Custom Color Picker */}
                            <div className="flex items-center gap-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                                <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-700 group">
                                    <input
                                        type="color"
                                        value={data.color}
                                        onChange={(e) => setData('color', e.target.value)}
                                        className="absolute inset-0 w-full h-full cursor-pointer scale-150"
                                    />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1">Custom Hex</p>
                                    <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">{data.color.toUpperCase()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 pt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleClose}
                                disabled={processing}
                                className="h-14 px-8 rounded-full border-gray-100 dark:border-slate-800 text-gray-500 font-bold hover:bg-gray-50 dark:hover:bg-slate-800"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={!data.name.trim() || processing}
                                className="h-14 px-10 rounded-full bg-gray-900 text-white hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 font-bold shadow-xl shadow-gray-200 dark:shadow-none transition-all hover:scale-105"
                            >
                                {processing ? 'Creating...' : 'Create Tag'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
