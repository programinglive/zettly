import React, { useEffect, useId, useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

export default function CompletionReasonDialog({
    open,
    onCancel,
    onSubmit,
    processing = false,
    initialState = 'pending',
    targetState = 'completed',
    error = null,
}) {
    const [reason, setReason] = useState('');
    const [localError, setLocalError] = useState('');
    const [isHydrated, setIsHydrated] = useState(false);
    const titleId = useId();
    const descriptionId = useId();

    useEffect(() => {
        if (open) {
            setIsHydrated(false);
            // If the server returned a validation error, keep the textarea populated with the submitted value.
            if (typeof error === 'string' && error.length > 0) {
                setReason((current) => current);
            } else {
                setReason('');
            }
            setLocalError('');
            // Mark as hydrated after component has rendered with the new error state
            const timer = setTimeout(() => setIsHydrated(true), 0);
            return () => clearTimeout(timer);
        }
    }, [open, error]);

    if (!open) {
        return null;
    }

    const handleConfirm = () => {
        const trimmed = reason.trim();
        if (!trimmed) {
            setLocalError('Please provide a reason.');
            return;
        }

        setLocalError('');

        if (typeof onSubmit === 'function') {
            onSubmit(trimmed);
        }
    };

    const displayError = error || localError;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
            <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                    <h2 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-white">Share the reason</h2>
                    <p id={descriptionId} className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                        You are moving this todo from <strong className="font-semibold text-gray-900 dark:text-white">{initialState}</strong> to{' '}
                        <strong className="font-semibold text-gray-900 dark:text-white">{targetState}</strong>. Let the team know why.
                    </p>
                </div>
                <div className="px-6 py-5">
                    <Textarea
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="Add the context behind this change..."
                        className="min-h-[120px] border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 focus:border-gray-500 focus:ring-gray-500"
                        disabled={processing}
                    />
                    {displayError && (
                        <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600">{displayError}</p>
                    )}
                </div>
                <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={processing}
                        className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        disabled={processing || !isHydrated}
                        className="min-w-[120px] bg-gray-800 hover:bg-gray-900 text-white shadow-lg shadow-gray-800/30 transition-all"
                    >
                        {processing ? 'Saving...' : 'Submit reason'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
