import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle2, Plus, Trash2, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';
import TextInput from './TextInput';
import CompletionReasonDialog from './CompletionReasonDialog';

export default function FocusGreeting() {
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



    // Get current hour for greeting
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    // Fetch current focus on mount
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

            // Always use today's date when completing a focus
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

            // Ensure history date is set to today to show the completed focus
            setHistoryDate(todayDate);

            // Update status events with the recent events from the response
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
            <div className="bg-gray-100 rounded-lg p-6 border border-gray-300">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-950/60 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 transition-all">
            <div className="md:grid md:grid-cols-2 md:gap-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                        {getGreeting()}! 👋
                    </h2>

                    {currentFocus ? (
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-gray-900 dark:text-gray-100 mt-1 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                        Active Focus
                                    </p>
                                    <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-100 dark:border-slate-800">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    {currentFocus.title}
                                                </h3>
                                                {currentFocus.description && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                                                        {currentFocus.description}
                                                    </p>
                                                )}
                                                {currentFocus.started_at && (
                                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mt-3 flex items-center gap-1">
                                                        <span>Started:</span>
                                                        <span>{new Date(currentFocus.started_at).toLocaleString()}</span>
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                onClick={handleRequestEditFocus}
                                                disabled={isSubmitting}
                                                className="flex-shrink-0 ml-3 p-2 text-gray-400 hover:text-gray-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 flex-wrap">
                                <button
                                    onClick={handleRequestCompleteFocus}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Complete Focus
                                </button>
                                <button
                                    onClick={handleDeleteFocus}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 hover:text-gray-800 hover:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 rounded-lg font-medium transition-colors dark:border-gray-600 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-gray-600 dark:text-gray-300">
                                What would you like to focus on today?
                            </p>

                            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                                <DialogTrigger asChild>
                                    <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-medium transition-colors">
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
                                            <div className="p-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-sm">
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

                <div className="mt-8 md:mt-0">
                    <div className="h-full rounded-2xl border border-gray-200 bg-gray-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Recent Focus History
                            </h3>
                            <div className="flex items-center gap-2">
                                <label htmlFor="focus-history-date" className="sr-only">
                                    Filter Date
                                </label>
                                <input
                                    id="focus-history-date"
                                    type="date"
                                    value={historyDate}
                                    onChange={handleHistoryDateChange}
                                    max={getTodayDateString()}
                                    className="h-8 rounded-lg border-gray-200 bg-white px-2 text-xs font-medium text-gray-600 shadow-sm focus:border-gray-900 focus:ring-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300"
                                />
                                {isHistoryLoading && (
                                    <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                                )}
                            </div>
                        </div>

                        {statusEvents.length > 0 ? (
                            <div className="space-y-3">
                                {statusEvents.map((event) => (
                                    <div key={event.id} className="group relative rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
                                        <div className="flex items-center justify-between text-xs mb-2">
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {event.user?.name ?? 'You'}
                                            </span>
                                            {event.created_at && (
                                                <span className="text-gray-400 dark:text-gray-500">
                                                    {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                        </div>

                                        {event.focus?.title && (
                                            <div className="mb-3">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words line-clamp-2">
                                                    {event.focus.title}
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                                            <span className="shrink-0 uppercase tracking-wide text-[10px] font-semibold text-gray-400 dark:text-gray-600 mt-0.5">
                                                Reason
                                            </span>
                                            <p className="line-clamp-2">{event.reason}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-slate-800">
                                <p className="text-sm text-gray-400 dark:text-gray-500">No focus history for this date.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {error && !showDialog && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-500/40 rounded-lg text-red-700 dark:text-red-300 text-sm">
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
