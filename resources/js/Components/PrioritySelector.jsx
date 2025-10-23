import React from 'react';

const quadrants = [
    {
        id: 'q1',
        priority: 'urgent',
        importance: 'important',
        label: 'Do First',
        description: 'Critical & important',
        accent: '#DC2626',
    },
    {
        id: 'q2',
        priority: 'not_urgent',
        importance: 'important',
        label: 'Schedule',
        description: 'Plan for later',
        accent: '#2563EB',
    },
    {
        id: 'q3',
        priority: 'urgent',
        importance: 'not_important',
        label: 'Delegate',
        description: 'Handle quickly',
        accent: '#F97316',
    },
    {
        id: 'q4',
        priority: 'not_urgent',
        importance: 'not_important',
        label: 'Eliminate',
        description: 'Low value tasks',
        accent: '#10B981',
    },
];

const PrioritySelector = ({
    selectedPriority,
    selectedImportance,
    onChange,
    error,
}) => {
    const isSelected = (option) =>
        option.priority === selectedPriority && option.importance === selectedImportance;

    const handleSelect = (option) => {
        if (typeof onChange === 'function') {
            onChange({ priority: option.priority, importance: option.importance });
        }
    };

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quadrants.map((option) => {
                    const selected = isSelected(option);

                    return (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => handleSelect(option)}
                            className={`relative p-4 rounded-xl border-2 transition-all text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                                selected
                                    ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-700'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                            }`}
                        >
                            <div className="flex items-start space-x-3">
                                <div
                                    className="w-3.5 h-3.5 rounded-full flex-shrink-0 mt-1"
                                    style={{ backgroundColor: option.accent }}
                                />
                                <div className="flex-1">
                                    <div className="font-semibold text-gray-900 dark:text-white">
                                        {option.label}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {option.description}
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        <div>
                                            <span className="block font-medium text-gray-700 dark:text-gray-200">
                                                Urgency
                                            </span>
                                            <span className="capitalize">{option.priority.replace('_', ' ')}</span>
                                        </div>
                                        <div>
                                            <span className="block font-medium text-gray-700 dark:text-gray-200">
                                                Importance
                                            </span>
                                            <span className="capitalize">{option.importance.replace('_', ' ')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {selected && (
                                <div className="absolute top-3 right-3">
                                    <div className="w-2.5 h-2.5 bg-gray-900 dark:bg-white rounded-full" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
            {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
        </div>
    );
};

export default PrioritySelector;
