import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { LinkIcon, UnlinkIcon, Plus, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import ConfirmationModal from './ConfirmationModal';

export default function TodoLinkManager({ todo, availableTodos, onLink, onUnlink }) {
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [showUnlinkModal, setShowUnlinkModal] = useState(false);
    const [selectedTodo, setSelectedTodo] = useState(null);
    const [relationshipType, setRelationshipType] = useState('related');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLinking, setIsLinking] = useState(false);

    console.log('TodoLinkManager state:', {
        showLinkModal,
        selectedTodo,
        availableTodos: availableTodos?.length || 0,
        relationshipType
    });

    const relatedTodos = todo.related_todos || todo.relatedTodos || [];
    const linkedByTodos = todo.linked_by_todos || todo.linkedByTodos || [];

    const allLinkedTodos = [...relatedTodos, ...linkedByTodos].filter((todo, index, self) =>
        index === self.findIndex(t => t.id === todo.id)
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
            console.log('Linking todos:', todo.id, selectedTodo.id, relationshipType);
            await onLink(todo.id, selectedTodo.id, relationshipType);
            setShowLinkModal(false);
            setSelectedTodo(null);
            setSearchTerm('');
        } catch (error) {
            console.error('Error linking todos:', error);
            alert('Error linking todos: ' + error.message);
        } finally {
            setIsLinking(false);
        }
    };

    const handleUnlink = async () => {
        console.log('handleUnlink called with selectedTodo:', selectedTodo);
        if (!selectedTodo) return;

        try {
            console.log('Calling onUnlink with:', todo.id, selectedTodo.id, relationshipType);
            await onUnlink(todo.id, selectedTodo.id, relationshipType);
            setShowUnlinkModal(false);
            setSelectedTodo(null);
        } catch (error) {
            console.error('Error unlinking todos:', error);
        }
    };

    const getRelationshipLabel = (type) => {
        const labels = {
            'related': 'Related',
            'parent': 'Parent',
            'child': 'Child',
            'blocks': 'Blocks',
            'blocked_by': 'Blocked By'
        };
        return labels[type] || type;
    };

    return (
        <div className="space-y-4">
            {/* Current Links Section - Always Show */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Linked Todos {allLinkedTodos.length > 0 && `(${allLinkedTodos.length})`}
                </h3>
                
                {allLinkedTodos.length > 0 ? (
                    <div className="space-y-2 mb-4">
                        {allLinkedTodos.map(linkedTodo => {
                            const relationship = relatedTodos.find(t => t.id === linkedTodo.id);
                            const linkType = relationship?.pivot?.relationship_type || 'related';

                            return (
                                <div key={linkedTodo.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <div className="flex-1">
                                        <Link
                                            href={`/todos/${linkedTodo.id}`}
                                            className="text-sm font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400"
                                        >
                                            {linkedTodo.title}
                                        </Link>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {getRelationshipLabel(linkType)} • {linkedTodo.is_completed ? 'Completed' : 'Pending'}
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            console.log('Unlink button clicked for:', linkedTodo);
                                            setSelectedTodo(linkedTodo);
                                            setRelationshipType(linkType);
                                            setShowUnlinkModal(true);
                                        }}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                    >
                                        <UnlinkIcon className="w-4 h-4" />
                                    </Button>
                                </div>
                            );
                        })}
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
                        console.log('Link Todo button clicked');
                        setShowLinkModal(true);
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Link Todo
                </Button>
            </div>

            {/* Link Modal */}
            <ConfirmationModal
                isOpen={showLinkModal}
                onClose={() => {
                    console.log('Closing link modal');
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
            >
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                        Link "{todo.title}" to another todo
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Relationship Type
                        </label>
                        <select
                            value={relationshipType}
                            onChange={(e) => setRelationshipType(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value="related">Related</option>
                            <option value="parent">Parent</option>
                            <option value="child">Child</option>
                            <option value="blocks">Blocks</option>
                            <option value="blocked_by">Blocked By</option>
                        </select>
                    </div>

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
                                            console.log('Selecting todo:', availableTodo);
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
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                                                        {availableTodo.description}
                                                    </div>
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
                    console.log('Closing unlink modal');
                    setShowUnlinkModal(false);
                    setSelectedTodo(null);
                }}
                onConfirm={() => {
                    console.log('Unlink confirm clicked - about to call handleUnlink');
                    handleUnlink();
                }}
                title="Unlink Todo"
                message={`Remove the "${relationshipType}" relationship between "${todo.title}" and "${selectedTodo?.title}"?`}
                confirmText="Unlink"
                confirmButtonVariant="destructive"
                confirmDisabled={false}
            />
        </div>
    );
}
