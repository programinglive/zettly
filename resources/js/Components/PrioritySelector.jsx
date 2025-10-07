import React from 'react';

const PrioritySelector = ({ selectedPriority, onPriorityChange, error }) => {
    const priorities = [
        { value: 'low', label: 'Low', color: '#10B981', description: 'Nice to have' },
        { value: 'medium', label: 'Medium', color: '#F59E0B', description: 'Should be done' },
        { value: 'high', label: 'High', color: '#EF4444', description: 'Important' },
        { value: 'urgent', label: 'Urgent', color: '#DC2626', description: 'Critical' },
    ];

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {priorities.map((priority) => (
                    <button
                        key={priority.value}
                        type="button"
                        onClick={() => onPriorityChange(priority.value)}
                        className={`relative p-3 rounded-lg border-2 transition-all text-left ${
                            selectedPriority === priority.value
                                ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-700'
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                        }`}
                    >
                        <div className="flex items-center space-x-3">
                            <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: priority.color }}
                            />
                            <div className="flex-1">
                                <div className="font-medium text-gray-900 dark:text-white">
                                    {priority.label}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {priority.description}
                                </div>
                            </div>
                        </div>
                        {selectedPriority === priority.value && (
                            <div className="absolute top-2 right-2">
                                <div className="w-2 h-2 bg-gray-900 dark:bg-white rounded-full" />
                            </div>
                        )}
                    </button>
                ))}
            </div>
            {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
        </div>
    );
};

export default PrioritySelector;
