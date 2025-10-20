import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { LinkIcon, UnlinkIcon, Plus, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import ConfirmationModal from './ConfirmationModal';
import SanitizedHtml from './SanitizedHtml';

export default function TodoLinkManager({ todo, availableTodos, onLink, onUnlink, linkedTodos }) {
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [showUnlinkModal, setShowUnlinkModal] = useState(false);
    const [selectedTodo, setSelectedTodo] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLinking, setIsLinking] = useState(false);

    const relatedTodos = todo.related_todos || todo.relatedTodos || [];
    const linkedByTodos = todo.linked_by_todos || todo.linkedByTodos || [];

    const allLinkedTodos = (linkedTodos ?? [...relatedTodos, ...linkedByTodos]).filter((todoItem, index, self) =>
        todoItem?.id && index === self.findIndex(t => t?.id === todoItem.id)
    );

    const filteredAvailableTodos = availableTodos.filter(availableTodo =>
        availableTodo.id !== todo.id &&
        !allLinkedTodos.some(linkedTodo => linkedTodo.id === availableTodo.id) &&
        (availableTodo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
         availableTodo.description?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleLink = async () => {
        if (!selectedTodo) {
            alert('Please select a todo to link');
            return;
        }

        setIsLinking(true);
        try {
            await onLink(todo.id, selectedTodo.id);
            setShowLinkModal(false);
            setSelectedTodo(null);
            setSearchTerm('');
        } catch (error) {
            alert('Error linking todos: ' + error.message);
        } finally {
            setIsLinking(false);
        }
    };

    const handleUnlink = async () => {
        if (!selectedTodo) return;

        try {
            await onUnlink(todo.id, selectedTodo.id);
            setShowUnlinkModal(false);
            setSelectedTodo(null);
        } catch (error) {
            // handled by UI
        }
    };


    return (
        <div className="space-y-4">
            {/* Current Links Section - Always Show */}
            <div>
                {allLinkedTodos.length > 0 ? (
                    <div className="space-y-2 mb-4">
                        {allLinkedTodos.map(linkedTodo => (
                            <div key={linkedTodo.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="flex-1">
                                    <Link
                                        href={`/todos/${linkedTodo.id}`}
                                        className="text-sm font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400"
                                    >
                                        {linkedTodo.title}
                                    </Link>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {linkedTodo.is_completed ? 'Completed' : 'Pending'}
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedTodo(linkedTodo);
                                        setShowUnlinkModal(true);
                                    }}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                >
                                    <UnlinkIcon className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
                        <div className="text-gray-400 text-2xl mb-2">🔗</div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            No linked todos yet
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Link this todo to other todos to show relationships
                        </p>
                    </div>
                )}
            </div>

            {/* Link New Todo */}
            <div>
                <Button
                    onClick={() => {
                        setShowLinkModal(true);
                    }}
                    className="w-full bg-gray-900 text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
                >
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Link Todo
                </Button>
            </div>

            {/* Link Modal */}
            <ConfirmationModal
                isOpen={showLinkModal}
                onClose={() => {
                    setShowLinkModal(false);
                    setSelectedTodo(null);
                    setSearchTerm('');
                }}
                onConfirm={handleLink}
                title="Link Todo"
                confirmText={selectedTodo ? "Link Todo" : "Select a Todo"}
                confirmButtonVariant="default"
                confirmDisabled={!selectedTodo}
                isLoading={isLinking}
                cancelButtonClassName="hover:bg-gray-200 dark:hover:bg-gray-600"
                confirmButtonClassName={`${selectedTodo ? 'bg-gray-900 hover:bg-gray-700 text-white dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300' : 'bg-gray-200 text-gray-400 dark:bg-gray-600 dark:text-gray-300 cursor-not-allowed'}`}
            >
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                        Link "{todo.title}" to another todo
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Search Todos
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search todos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md">
                        {filteredAvailableTodos.length > 0 ? (
                            <div className="divide-y divide-gray-200 dark:divide-gray-600">
                                {filteredAvailableTodos.map(availableTodo => (
                                    <button
                                        key={availableTodo.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedTodo(availableTodo);
                                        }}
                                        className={`w-full text-left p-3 transition-colors ${
                                            selectedTodo?.id === availableTodo.id
                                                ? 'bg-indigo-100 dark:bg-indigo-900/20 border-l-4 border-indigo-500'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-900 dark:text-white">
                                                    {availableTodo.title}
                                                </div>
                                                {availableTodo.description && (
                                                    <SanitizedHtml
                                                        className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1"
                                                        html={availableTodo.description}
                                                    />
                                                )}
                                                <div className="text-xs text-gray-400 mt-1">
                                                    {availableTodo.is_completed ? '✓ Completed' : '○ Pending'}
                                                </div>
                                            </div>
                                            {selectedTodo?.id === availableTodo.id && (
                                                <div className="text-indigo-600 dark:text-indigo-400">
                                                    ✓
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                                {searchTerm ? 'No todos match your search' : 'No available todos to link'}
                            </p>
                        )}
                    </div>
                </div>
            </ConfirmationModal>

            {/* Unlink Modal */}
            <ConfirmationModal
                isOpen={showUnlinkModal}
                onClose={() => {
                    setShowUnlinkModal(false);
                    setSelectedTodo(null);
                }}
                onConfirm={() => {
                    handleUnlink();
                }}
                title="Unlink Todo"
                message={`Remove the link between "${todo.title}" and "${selectedTodo?.title}"?`}
                confirmText="Unlink"
                confirmButtonVariant="destructive"
                confirmDisabled={false}
            />
        </div>
    );
}
