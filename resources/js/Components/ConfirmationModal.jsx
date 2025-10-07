import React from 'react';
import { Button } from './ui/button';

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmButtonVariant = 'destructive',
    isLoading = false,
    children,
    confirmDisabled = false
}) {
    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            onClick={handleBackdropClick}
        >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {title}
                    </h3>
                </div>

                <div className="px-6 py-4">
                    {children || (
                        <p className="text-gray-600 dark:text-gray-300">
                            {message}
                        </p>
                    )}
                </div>

                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 rounded-b-lg flex justify-end space-x-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                        className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        type="button"
                        variant={confirmButtonVariant}
                        onClick={(e) => {
                            console.log('ConfirmationModal button clicked', { onConfirm, confirmDisabled, isLoading });
                            if (onConfirm) {
                                onConfirm(e);
                            }
                        }}
                        disabled={isLoading || confirmDisabled}
                    >
                        {isLoading ? 'Processing...' : confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
}
