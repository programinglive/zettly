import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle2, Plus, Trash2, Edit, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { usePage } from '@inertiajs/react';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';
import TextInput from './TextInput';
import CompletionReasonDialog from './CompletionReasonDialog';
import axios from 'axios';

export default function FocusGreeting({ compactSummary = false }) {
    const authUser = usePage().props.auth.user;
    const [currentFocus, setCurrentFocus] = useState(null);
    const [activeFocuses, setActiveFocuses] = useState([]);
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
    const [showHistory, setShowHistory] = useState(false);
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
                setActiveFocuses(Array.isArray(data.active_focuses) ? data.active_focuses : []);
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
            // The new focus joins the list of running focuses; refetch so the
            // dashboard shows every one of them rather than only this card.
            fetchCurrentFocus({ skipAutoOpen: true });
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
            fetchCurrentFocus({ skipAutoOpen: true });
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
            <div className="rounded-md border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-900/50 px-3.5 py-2.5">
                <div className="animate-pulse flex items-center gap-3">
                    <div className="h-3 bg-gray-300 dark:bg-slate-700 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-1/4"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2.5">
            <div>
                {compactSummary && activeFocuses.length > 1 ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                                {getGreeting()}, {authUser?.name?.split(' ')[0] || 'there'} 👋
                            </span>
                            <span>·</span>
                            <span>{activeFocuses.length} active focuses</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowDialog(true)}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-200 dark:border-slate-700 px-2 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
                        >
                            <Plus className="h-3 w-3" />
                            New Focus
                        </button>
                    </div>
                ) : (
                    <>
                        <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                            {getGreeting()}, {authUser?.name?.split(' ')[0] || 'there'} 👋
                        </p>

                        {activeFocuses.length > 1 ? (
                            <div className="divide-y divide-gray-200 dark:divide-slate-800 rounded-md border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                                {activeFocuses.map((active) => (
                                    <a
                                        key={active.id}
                                        href={`/focus/${active.id}`}
                                        className="flex items-center justify-between gap-3 px-3 py-2 text-sm transition hover:bg-gray-50 dark:hover:bg-slate-800/60"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span
                                                className="h-2 w-2 rounded-full shrink-0"
                                                style={{ backgroundColor: active.color || '#6366F1' }}
                                            />
                                            <span className="truncate font-medium text-gray-900 dark:text-white">
                                                {active.title}
                                            </span>
                                        </div>
                                        <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                                            {active.open_todos} open
                                        </span>
                                    </a>
                                ))}
                            </div>
                        ) : currentFocus ? (
                    <div className="rounded-md border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-900/60 px-3.5 py-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0"></span>
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                        Current Focus
                                    </span>
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                        · {new Date(currentFocus.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <a
                                        href={`/focus/${currentFocus.id}`}
                                        className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                                    >
                                        Open board
                                    </a>
                                </div>
                                <h3 className="mt-1 text-sm font-semibold text-gray-900 dark:text-white truncate">
                                    {currentFocus.title}
                                </h3>
                                {currentFocus.description && (
                                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                        {currentFocus.description}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    onClick={handleRequestCompleteFocus}
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded text-xs font-semibold transition-colors"
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Complete Focus
                                </button>
                                <button
                                    onClick={handleRequestEditFocus}
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded text-xs font-medium hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <Edit className="w-3.5 h-3.5" />
                                    Edit
                                </button>
                                <button
                                    onClick={handleDeleteFocus}
                                    disabled={isSubmitting}
                                    className="inline-flex items-center justify-center p-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-gray-200 dark:border-slate-800 px-3.5 py-2.5">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            What would you like to focus on today?
                        </p>

                        <button
                            type="button"
                            onClick={() => setShowDialog(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Set Focus
                        </button>
                    </div>
                )}
                    </>
                )}
            </div>

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
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

            <div className="border-t border-gray-200 dark:border-slate-800 pt-3">
                <div className="flex items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={() => setShowHistory((prev) => !prev)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    >
                        <span>{showHistory ? '▼' : '▶'}</span>
                        <span>Recent Focus History</span>
                        {statusEvents.length > 0 && (
                            <span className="text-gray-400 dark:text-gray-500">({statusEvents.length})</span>
                        )}
                    </button>
                    {showHistory && (
                        <div className="flex items-center gap-2">
                            <input
                                id="focus-history-date"
                                type="date"
                                value={historyDate}
                                onChange={handleHistoryDateChange}
                                max={getTodayDateString()}
                                className="h-7 rounded border-gray-200 bg-white px-2 text-xs font-medium text-gray-600 focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300"
                            />
                            {isHistoryLoading && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                            )}
                        </div>
                    )}
                </div>

                {showHistory && (
                    <div className="mt-2.5">
                        {statusEvents.length > 0 ? (
                            <div className="divide-y divide-gray-200 dark:divide-slate-800 rounded-md border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
                                {statusEvents.map((event) => (
                                    <div key={event.id} className="px-3 py-2 flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {event.focus?.title}
                                            </p>
                                            {event.reason && (
                                                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                                    {event.reason}
                                                </p>
                                            )}
                                        </div>
                                        <span className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500">
                                            {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="py-2 text-xs text-gray-400 dark:text-gray-500 italic">
                                No activity recorded for this day.
                            </p>
                        )}
                    </div>
                )}
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
