import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle2, Plus, Trash2, Edit, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { usePage } from '@inertiajs/react';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';
import TextInput from './TextInput';
import CompletionReasonDialog from './CompletionReasonDialog';
import axios from 'axios';

export default function FocusGreeting() {
    const authUser = usePage().props.auth.user;
    const [currentFocus, setCurrentFocus] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDialog, setShowDialog] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState(null);
    const [statusEvents, setStatusEvents] = useState([]);
    const getTodayDateString = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const [historyDate, setHistoryDate] = useState(() => getTodayDateString());
    const [showReasonDialog, setShowReasonDialog] = useState(false);
    const [reasonError, setReasonError] = useState(null);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const autoOpenRef = useRef(false);
    const tabletDetectionRef = useRef(false);

    const detectTabletDevice = () => {
        if (typeof window === 'undefined') {
            return false;
        }

        const userAgent = window.navigator.userAgent.toLowerCase();
        const maxTouchPoints = window.navigator.maxTouchPoints ?? 0;
        const pointerIsCoarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
        const minViewport = Math.min(window.innerWidth, window.innerHeight);

        const isIPad = userAgent.includes('ipad') || (userAgent.includes('macintosh') && maxTouchPoints > 1);
        const isAndroidTablet = userAgent.includes('android') && !userAgent.includes('mobile');

        if (isIPad || isAndroidTablet) {
            return true;
        }

        return pointerIsCoarse && maxTouchPoints > 1 && minViewport >= 600;
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    useEffect(() => {
        let skipAutoOpen = false;

        if (typeof window !== 'undefined') {
            tabletDetectionRef.current = detectTabletDevice();
            skipAutoOpen = tabletDetectionRef.current;
        }

        fetchCurrentFocus({ skipAutoOpen });
    }, []);

    const fetchCurrentFocus = async ({ skipAutoOpen = false, dateOverride, showHistoryOnly = false } = {}) => {
        const filterDateToUse = dateOverride ?? historyDate ?? getTodayDateString();
        const queryString = filterDateToUse ? `?date=${encodeURIComponent(filterDateToUse)}` : '';
        try {
            if (showHistoryOnly) {
                setIsHistoryLoading(true);
            } else {
                setIsLoading(true);
            }
            const response = await axios.get(`/focus/current${queryString}`);
            const data = response.data;
            if (data?.success) {
                setCurrentFocus(data.data);
                const history = Array.isArray(data.recent_events)
                    ? data.recent_events
                    : Array.isArray(data.data?.status_events)
                        ? data.data.status_events
                        : [];
                setStatusEvents(history);
                if (typeof data.filter_date === 'string') {
                    setHistoryDate(data.filter_date);
                }
                if (!data.data && !autoOpenRef.current) {
                    if (!skipAutoOpen) {
                        setShowDialog(true);
                    }
                    autoOpenRef.current = true;
                }
                if (data.data && !autoOpenRef.current) {
                    autoOpenRef.current = true;
                }
            } else {
                setStatusEvents([]);
                setError(data?.message || 'Failed to load focus');
            }
        } catch (err) {
            console.error('Failed to fetch current focus:', err);
            setError('Failed to load focus');
            setStatusEvents([]);
        } finally {
            if (showHistoryOnly) {
                setIsHistoryLoading(false);
            } else {
                setIsLoading(false);
            }
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

            const response = await axios.post('/focus', {
                title: title.trim(),
                description: description.trim() || null,
            });

            const data = response.data;

            if (!data) {
                const message = 'Failed to create focus';
                setError(message);
                return;
            }

            setCurrentFocus(data.data);
            setStatusEvents(Array.isArray(data.data?.status_events) ? data.data.status_events : []);
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

    const handleRequestCompleteFocus = () => {
        if (!currentFocus) return;
        setReasonError(null);
        setShowReasonDialog(true);
    };

    const handleCompleteFocus = async (reason) => {
        if (!currentFocus) return;

        try {
            setIsSubmitting(true);
            setError(null);

            const todayDate = getTodayDateString();

            const response = await axios.post(`/focus/${currentFocus.id}/complete`, {
                reason,
                filter_date: todayDate,
            });

            const data = response.data;

            if (!data) {
                const message = 'Failed to complete focus';
                setError(message);
                return;
            }

            setCurrentFocus(null);
            setTitle('');
            setDescription('');
            if (!tabletDetectionRef.current) {
                setShowDialog(true);
            } else {
                setShowDialog(false);
            }
            autoOpenRef.current = false;
            setShowReasonDialog(false);
            setReasonError(null);

            setHistoryDate(todayDate);

            if (Array.isArray(data?.recent_events)) {
                setStatusEvents(data.recent_events);
            } else if (data?.event) {
                setStatusEvents((prev) => {
                    const next = [data.event, ...prev];
                    return next.slice(0, 10);
                });
            }
        } catch (err) {
            console.error('Failed to complete focus:', err);
            if (err.response?.status === 422 && err.response?.data?.errors?.reason?.[0]) {
                setReasonError(err.response.data.errors.reason[0]);
                setShowReasonDialog(true);
            } else {
                setError(err.response?.data?.message || 'An error occurred while completing focus');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRequestEditFocus = () => {
        if (!currentFocus) return;
        setEditTitle(currentFocus.title);
        setEditDescription(currentFocus.description || '');
        setShowEditDialog(true);
    };

    const handleEditFocus = async (e) => {
        e.preventDefault();
        if (!currentFocus || !editTitle.trim()) {
            setError('Focus title is required');
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);

            const response = await axios.put(`/focus/${currentFocus.id}`, {
                title: editTitle.trim(),
                description: editDescription.trim() || null,
            });

            const data = response.data;

            if (!data) {
                const message = 'Failed to update focus';
                setError(message);
                return;
            }

            setCurrentFocus(data.data);
            setShowEditDialog(false);
        } catch (err) {
            console.error('Failed to update focus:', err);
            setError('An error occurred while updating focus');
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

            const response = await axios.delete(`/focus/${currentFocus.id}`);

            const data = response.data;

            if (!data) {
                const message = 'Failed to delete focus';
                setError(message);
                return;
            }

            setCurrentFocus(null);
            setStatusEvents([]);
        } catch (err) {
            console.error('Failed to delete focus:', err);
            setError('An error occurred while deleting focus');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleHistoryDateChange = (event) => {
        const nextDate = event.target.value;
        if (!nextDate) {
            return;
        }

        setHistoryDate(nextDate);
        fetchCurrentFocus({ skipAutoOpen: true, dateOverride: nextDate, showHistoryOnly: true });
    };

    if (isLoading) {
        return (
            <div className="bg-gray-100 dark:bg-slate-900 rounded-lg p-6 border border-gray-300 dark:border-slate-800">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-300 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-2/3"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-16">
            <div className="relative">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                            {getGreeting()}, {authUser?.name?.split(' ')[0] || 'there'}! 👋
                        </h2>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">
                            Here's what's happening with your focus today.
                        </p>
                    </div>
                </div>

                {currentFocus ? (
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-15 group-hover:opacity-25 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative bg-white dark:bg-slate-900 ring-1 ring-gray-200 dark:ring-slate-800 rounded-2xl p-8 sm:p-10 shadow-xl overflow-hidden">
                            <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-indigo-50 dark:bg-indigo-900/10 blur-3xl"></div>

                            <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-8">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-6">
                                        <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
                                        <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                                            Current Focus
                                        </span>
                                    </div>

                                    <h3 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white leading-[1.1] tracking-tight">
                                        {currentFocus.title}
                                    </h3>

                                    {currentFocus.description && (
                                        <p className="mt-6 text-xl text-gray-600 dark:text-gray-400 font-light leading-relaxed max-w-2xl">
                                            {currentFocus.description}
                                        </p>
                                    )}

                                    <div className="mt-8 flex items-center gap-4 text-sm text-gray-400 dark:text-gray-500">
                                        <div className="flex items-center gap-1.5">
                                            <AlertCircle className="w-4 h-4" />
                                            <span>Started {new Date(currentFocus.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 shrink-0">
                                    <button
                                        onClick={handleRequestCompleteFocus}
                                        disabled={isSubmitting}
                                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 hover:-translate-y-0.5 active:translate-y-0"
                                    >
                                        <CheckCircle2 className="w-5 h-5" />
                                        Complete Focus
                                    </button>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleRequestEditFocus}
                                            disabled={isSubmitting}
                                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            <Edit className="w-4 h-4" />
                                            Edit
                                        </button>
                                        <button
                                            onClick={handleDeleteFocus}
                                            disabled={isSubmitting}
                                            className="inline-flex items-center justify-center p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-semibold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-300 font-medium text-lg">
                            What would you like to focus on today?
                        </p>

                        <Dialog open={showDialog} onOpenChange={setShowDialog}>
                            <DialogTrigger asChild>
                                <button className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30">
                                    <Plus className="w-5 h-5" />
                                    Set Focus
                                </button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Set Your Focus</DialogTitle>
                                    <DialogDescription>
                                        Define what you want to accomplish today.
                                    </DialogDescription>
                                </DialogHeader>

                                <form onSubmit={handleCreateFocus} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Focus Title *
                                        </label>
                                        <TextInput
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="e.g., Complete project proposal"
                                            disabled={isSubmitting}
                                            className="w-full"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                            Description (optional)
                                        </label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Add any details about your focus..."
                                            disabled={isSubmitting}
                                            rows="3"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                                        />
                                    </div>

                                    {error && (
                                        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-500/40 rounded-lg text-red-700 dark:text-red-300 text-sm">
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

            <div className="border-t border-gray-100 dark:border-slate-800 pt-16">
                <div className="max-w-4xl">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                Recent Focus History
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Review your past accomplishments.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                id="focus-history-date"
                                type="date"
                                value={historyDate}
                                onChange={handleHistoryDateChange}
                                max={getTodayDateString()}
                                className="h-9 rounded-lg border-gray-200 bg-white px-3 text-sm font-semibold text-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300"
                            />
                            {isHistoryLoading && (
                                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                            )}
                        </div>
                    </div>

                    {statusEvents.length > 0 ? (
                        <div className="grid gap-6 sm:grid-cols-2">
                            {statusEvents.map((event) => (
                                <div key={event.id} className="relative bg-white dark:bg-slate-900/40 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 group hover:border-indigo-500/30 dark:hover:border-indigo-400/20 transition-all shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
                                            {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-500 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
                                            Completed
                                        </span>
                                    </div>

                                    <p className="text-base font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 leading-snug">
                                        {event.focus?.title}
                                    </p>

                                    {event.reason && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 italic leading-relaxed">
                                            &ldquo;{event.reason}&rdquo;
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex h-48 items-center justify-center rounded-3xl border-2 border-dashed border-gray-100 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/20">
                            <p className="text-lg font-medium text-gray-400 dark:text-gray-500 italic">No activity recorded for this day.</p>
                        </div>
                    )}
                </div>
            </div>

            {error && !showDialog && (
                <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-500/40 rounded-xl text-red-700 dark:text-red-300 text-sm font-medium">
                    {error}
                </div>
            )}

            <CompletionReasonDialog
                open={showReasonDialog}
                onCancel={() => {
                    if (!isSubmitting) {
                        setShowReasonDialog(false);
                        setReasonError(null);
                    }
                }}
                onSubmit={(reason) => {
                    setReasonError(null);
                    handleCompleteFocus(reason);
                }}
                processing={isSubmitting}
                initialState="active"
                targetState="completed"
                error={reasonError}
            />

            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Focus</DialogTitle>
                        <DialogDescription>
                            Update your focus details
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleEditFocus} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                Focus Title *
                            </label>
                            <TextInput
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                placeholder="e.g., Complete project proposal"
                                disabled={isSubmitting}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                Description (optional)
                            </label>
                            <textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                placeholder="Add any details about your focus..."
                                disabled={isSubmitting}
                                rows="3"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-slate-900/80 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-500/40 rounded-lg text-red-700 dark:text-red-300 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-2 justify-end">
                            <SecondaryButton
                                type="button"
                                onClick={() => setShowEditDialog(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </SecondaryButton>
                            <PrimaryButton
                                type="submit"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Updating...' : 'Update Focus'}
                            </PrimaryButton>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
