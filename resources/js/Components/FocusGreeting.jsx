import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';
import TextInput from './TextInput';

export default function FocusGreeting() {
    const [currentFocus, setCurrentFocus] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDialog, setShowDialog] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState(null);
    const autoOpenRef = useRef(false);

    // Get current hour for greeting
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    // Fetch current focus on mount
    useEffect(() => {
        fetchCurrentFocus();
    }, []);

    const fetchCurrentFocus = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/focus/current');
            const data = await response.json();
            if (data.success) {
                setCurrentFocus(data.data);
                if (!data.data && !autoOpenRef.current) {
                    setShowDialog(true);
                    autoOpenRef.current = true;
                }
                if (data.data && !autoOpenRef.current) {
                    autoOpenRef.current = true;
                }
            }
        } catch (err) {
            console.error('Failed to fetch current focus:', err);
            setError('Failed to load focus');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateFocus = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            setError('Focus title is required');
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);

            const response = await fetch('/focus', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim() || null,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Failed to create focus');
                return;
            }

            setCurrentFocus(data.data);
            setTitle('');
            setDescription('');
            setShowDialog(false);
            autoOpenRef.current = true;
        } catch (err) {
            console.error('Failed to create focus:', err);
            setError('An error occurred while creating focus');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCompleteFocus = async () => {
        if (!currentFocus) return;

        try {
            setIsSubmitting(true);
            setError(null);

            const response = await fetch(`/focus/${currentFocus.id}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Failed to complete focus');
                return;
            }

            setCurrentFocus(null);
            setTitle('');
            setDescription('');
            setShowDialog(true);
            autoOpenRef.current = false;
        } catch (err) {
            console.error('Failed to complete focus:', err);
            setError('An error occurred while completing focus');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteFocus = async () => {
        if (!currentFocus) return;

        if (!confirm('Are you sure you want to delete this focus?')) {
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);

            const response = await fetch(`/focus/${currentFocus.id}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Failed to delete focus');
                return;
            }

            setCurrentFocus(null);
        } catch (err) {
            console.error('Failed to delete focus:', err);
            setError('An error occurred while deleting focus');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                <div className="animate-pulse">
                    <div className="h-8 bg-blue-200 rounded w-1/3 mb-4"></div>
                    <div className="h-4 bg-blue-100 rounded w-2/3"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        {getGreeting()}! 👋
                    </h2>

                    {currentFocus ? (
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-600 mt-1 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm text-gray-600 mb-1">
                                        What are you focusing on today?
                                    </p>
                                    <div className="bg-white rounded-lg p-3 border border-amber-200">
                                        <h3 className="font-semibold text-gray-800">
                                            {currentFocus.title}
                                        </h3>
                                        {currentFocus.description && (
                                            <p className="text-sm text-gray-600 mt-1">
                                                {currentFocus.description}
                                            </p>
                                        )}
                                        {currentFocus.started_at && (
                                            <p className="text-xs text-gray-500 mt-2">
                                                Started: {new Date(currentFocus.started_at).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleCompleteFocus}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Complete Focus
                                </button>
                                <button
                                    onClick={handleDeleteFocus}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-gray-600">
                                What would you like to focus on today?
                            </p>

                            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                                <DialogTrigger asChild>
                                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
                                        <Plus className="w-4 h-4" />
                                        Set Focus
                                    </button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Set Your Focus</DialogTitle>
                                        <DialogDescription>
                                            What would you like to focus on today?
                                        </DialogDescription>
                                    </DialogHeader>

                                    <form onSubmit={handleCreateFocus} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Focus Title *
                                            </label>
                                            <TextInput
                                                type="text"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                placeholder="e.g., Complete project proposal"
                                                disabled={isSubmitting}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Description (optional)
                                            </label>
                                            <textarea
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="Add any details about your focus..."
                                                disabled={isSubmitting}
                                                rows="3"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            />
                                        </div>

                                        {error && (
                                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                                {error}
                                            </div>
                                        )}

                                        <div className="flex gap-2 justify-end">
                                            <SecondaryButton
                                                type="button"
                                                onClick={() => setShowDialog(false)}
                                                disabled={isSubmitting}
                                            >
                                                Cancel
                                            </SecondaryButton>
                                            <PrimaryButton
                                                type="submit"
                                                disabled={isSubmitting}
                                            >
                                                {isSubmitting ? 'Setting...' : 'Set Focus'}
                                            </PrimaryButton>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    )}
                </div>
            </div>

            {error && !showDialog && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}
        </div>
    );
}
