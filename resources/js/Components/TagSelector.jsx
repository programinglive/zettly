import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { router } from '@inertiajs/react';
import ConfirmationModal from './ConfirmationModal';

export default function TagSelector({ availableTags, selectedTagIds, onTagsChange, className = '' }) {
    const [isCreating, setIsCreating] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#3B82F6');
    const [isCreatingTag, setIsCreatingTag] = useState(false);
    const [error, setError] = useState('');

    // Confirmation modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [tagToDelete, setTagToDelete] = useState(null);

    const selectedTags = availableTags.filter(tag => selectedTagIds.includes(tag.id));
    const availableTagsForSelection = availableTags.filter(tag => !selectedTagIds.includes(tag.id));

    const handleTagToggle = (tagId) => {
        const newSelectedIds = selectedTagIds.includes(tagId)
            ? selectedTagIds.filter(id => id !== tagId)
            : [...selectedTagIds, tagId];

        onTagsChange(newSelectedIds);
    };

    const handleTagRemoveClick = (tag) => {
        setTagToDelete(tag);
        setShowDeleteModal(true);
    };

    const handleTagRemoveConfirm = async () => {
        if (tagToDelete) {
            try {
                const response = await fetch(`/api/tags/${tagToDelete.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                    },
                });

                if (response.ok) {
                    // Remove tag from selected tags
                    const newSelectedIds = selectedTagIds.filter(id => id !== tagToDelete.id);
                    onTagsChange(newSelectedIds);

                    // Refresh the page to get updated tags list
                    router.reload({ only: ['tags'] });
                }
            } catch (error) {
                console.error('Error deleting tag:', error);
            } finally {
                setShowDeleteModal(false);
                setTagToDelete(null);
            }
        }
    };

    const handleTagRemoveCancel = () => {
        setShowDeleteModal(false);
        setTagToDelete(null);
    };

    const handleCreateTag = async () => {
        if (!newTagName.trim()) {
            setError('Tag name is required');
            return;
        }

        if (isCreatingTag) return;

        // Check if tag already exists
        const existingTag = availableTags.find(tag => 
            tag.name.toLowerCase() === newTagName.trim().toLowerCase()
        );
        if (existingTag) {
            setError('A tag with this name already exists');
            return;
        }

        setIsCreatingTag(true);
        setError('');
        
        try {
            const response = await fetch('/api/tags', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                },
                body: JSON.stringify({
                    name: newTagName.trim(),
                    color: newTagColor,
                }),
            });

            if (response.ok) {
                const newTag = await response.json();
                
                // Add the new tag to selected tags (only if it was newly created)
                if (response.status === 201 || !selectedTagIds.includes(newTag.id)) {
                    onTagsChange([...selectedTagIds, newTag.id]);
                }
                
                // Reset form
                setNewTagName('');
                setNewTagColor('#3B82F6');
                setIsCreating(false);
                setError('');
                
                // Refresh the page to get updated tags list
                router.reload({ only: ['tags'] });
            } else if (response.status === 409) {
                // Conflict - tag already exists
                const errorData = await response.json().catch(() => ({}));
                setError(errorData.message || 'A tag with this name already exists');
            } else {
                const errorData = await response.json().catch(() => ({}));
                setError(errorData.message || 'Failed to create tag. Please try again.');
            }
        } catch (error) {
            console.error('Error creating tag:', error);
            setError('Network error. Please check your connection and try again.');
        } finally {
            setIsCreatingTag(false);
        }
    };

    return (
        <div className={`space-y-3 ${className}`}>
            {/* Selected Tags */}
            {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedTags.map(tag => (
                        <span
                            key={tag.id}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white cursor-pointer hover:opacity-80 transition-opacity"
                            style={{ backgroundColor: tag.color }}
                            onClick={() => handleTagRemoveClick(tag)}
                        >
                            {tag.name}
                            <X className="w-3 h-3 ml-1" />
                        </span>
                    ))}
                </div>
            )}

            {/* Available Tags */}
            {availableTagsForSelection.length > 0 && (
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Available Tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {availableTagsForSelection.map(tag => (
                            <button
                                key={tag.id}
                                onClick={() => handleTagToggle(tag.id)}
                                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                style={{
                                    borderColor: tag.color + '40',
                                    color: tag.color,
                                }}
                            >
                                {tag.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Create New Tag */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Create New Tag
                    </label>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsCreating(!isCreating)}
                        className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        New Tag
                    </Button>
                </div>

                {isCreating && (
                    <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                        <div>
                            <Input
                                placeholder="Tag name..."
                                value={newTagName}
                                onChange={(e) => {
                                    setNewTagName(e.target.value);
                                    if (error) setError(''); // Clear error when typing
                                }}
                                className={`bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 ${
                                    error ? 'border-red-500 dark:border-red-500' : ''
                                }`}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        handleCreateTag();
                                    }
                                }}
                            />
                            {error && (
                                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                    {error}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Color
                            </label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'].map(color => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setNewTagColor(color)}
                                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                                            newTagColor === color
                                                ? 'border-gray-900 dark:border-gray-100 scale-110'
                                                : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                                        }`}
                                        style={{ backgroundColor: color }}
                                        aria-label={`Select ${color} color`}
                                    />
                                ))}
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="color"
                                    value={newTagColor}
                                    onChange={(e) => setNewTagColor(e.target.value)}
                                    className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600"
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                                    {newTagColor}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center justify-end space-x-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setIsCreating(false);
                                    setNewTagName('');
                                    setNewTagColor('#3B82F6');
                                    setError('');
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleCreateTag}
                                disabled={!newTagName.trim() || isCreatingTag}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {isCreatingTag ? 'Creating...' : 'Create Tag'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={handleTagRemoveCancel}
                onConfirm={handleTagRemoveConfirm}
                title="Delete Tag"
                message={`Are you sure you want to delete the tag "${tagToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                confirmVariant="destructive"
            />
        </div>
    );
}
