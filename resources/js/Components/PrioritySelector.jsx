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
        <div className="space-y-2.5">
            <div className="flex flex-col gap-2.5">
                {quadrants.map((option) => {
                    const selected = isSelected(option);

                    return (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => handleSelect(option)}
                            className={`relative flex h-full w-full flex-col justify-between rounded-xl border-2 p-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:p-4 ${
                                selected
                                    ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-700'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                            }`}
                        >
                            <div className="flex items-start gap-2.5">
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
                                </div>
                            </div>
                            <div className="mt-3 space-y-1.5 rounded-lg bg-gray-100 px-3 py-2.5 text-[13px] text-gray-600 dark:bg-gray-700/60 dark:text-gray-200">
                                <div className="space-y-0.5">
                                    <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-300">
                                        Urgency
                                    </span>
                                    <span className="block text-sm font-medium capitalize leading-tight text-gray-900 dark:text-gray-100">
                                        {option.priority.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="h-px rounded-full bg-gray-200/70 dark:bg-gray-500/50" />
                                <div className="space-y-0.5">
                                    <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-300">
                                        Importance
                                    </span>
                                    <span className="block text-sm font-medium capitalize leading-tight text-gray-900 dark:text-gray-100">
                                        {option.importance.replace('_', ' ')}
                                    </span>
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
