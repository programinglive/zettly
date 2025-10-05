import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from './ui/input';

export default function TodoSelector({ 
    availableTodos, 
    selectedTodoIds, 
    onTodosChange, 
    className = '',
    selectedTodosData = []
}) {
    const [searchTerm, setSearchTerm] = useState('');

    // Build the selected list using availableTodos + selectedTodosData (from server)
    const selectedFromAvailable = availableTodos.filter(todo => selectedTodoIds.includes(todo.id));
    const selectedFromData = (selectedTodosData || []).filter(todo => selectedTodoIds.includes(todo.id));
    const selectedMap = new Map();
    [...selectedFromAvailable, ...selectedFromData].forEach(t => selectedMap.set(t.id, t));
    const selectedTodos = Array.from(selectedMap.values());

    const availableTodosForSelection = availableTodos.filter(todo =>
        !selectedTodoIds.includes(todo.id) &&
        (todo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
         todo.description?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleTodoToggle = (todoId) => {
        const newSelectedIds = selectedTodoIds.includes(todoId)
            ? selectedTodoIds.filter(id => id !== todoId)
            : [...selectedTodoIds, todoId];

        onTodosChange(newSelectedIds);
    };

    const handleTodoRemove = (todoId) => {
        const newSelectedIds = selectedTodoIds.filter(id => id !== todoId);
        onTodosChange(newSelectedIds);
    };

    return (
        <div className={`space-y-3 ${className}`}>
            {/* Selected Todos */}
            {selectedTodos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedTodos.map(todo => (
                        <span
                            key={todo.id}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300"
                        >
                            {todo.title}
                            <button
                                type="button"
                                onClick={() => handleTodoRemove(todo.id)}
                                className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Available Todos */}
            {availableTodosForSelection.length > 0 && (
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Link to Existing Todos
                    </label>
                    
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search todos to link..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md">
                        <div className="divide-y divide-gray-200 dark:divide-gray-600">
                            {availableTodosForSelection.map(todo => (
                                <button
                                    key={todo.id}
                                    type="button"
                                    onClick={() => handleTodoToggle(todo.id)}
                                    className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <div className="font-medium text-gray-900 dark:text-white">
                                        {todo.title}
                                    </div>
                                    {todo.description && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                                            {todo.description}
                                        </div>
                                    )}
                                    <div className="text-xs text-gray-400 mt-1">
                                        {todo.is_completed ? '✓ Completed' : '○ Pending'}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {availableTodosForSelection.length === 0 && searchTerm && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No todos match your search
                </p>
            )}
        </div>
    );
}
