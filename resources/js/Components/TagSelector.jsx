import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import TagBadge from './TagBadge';
import { Button } from './ui/button';
import { Input } from './ui/input';

export default function TagSelector({ availableTags, selectedTagIds, onTagsChange, className = '' }) {
    const [isCreating, setIsCreating] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#3B82F6');

    const selectedTags = availableTags.filter(tag => selectedTagIds.includes(tag.id));
    const availableTagsForSelection = availableTags.filter(tag => !selectedTagIds.includes(tag.id));

    const handleTagToggle = (tagId) => {
        const newSelectedIds = selectedTagIds.includes(tagId)
            ? selectedTagIds.filter(id => id !== tagId)
            : [...selectedTagIds, tagId];

        onTagsChange(newSelectedIds);
    };

    const handleCreateTag = () => {
        if (newTagName.trim()) {
            const newTag = {
                name: newTagName.trim(),
                color: newTagColor,
                isNew: true // Mark as new for the parent component to handle
            };

            // Add to selected tags temporarily
            onTagsChange([...selectedTagIds, `new_${Date.now()}`]);

            // Reset form
            setNewTagName('');
            setNewTagColor('#3B82F6');
            setIsCreating(false);

            // Pass the new tag data to parent
            if (onNewTag) {
                onNewTag(newTag);
            }
        }
    };

    const predefinedColors = [
        '#3B82F6', // Blue
        '#10B981', // Green
        '#F59E0B', // Yellow
        '#EF4444', // Red
        '#8B5CF6', // Purple
        '#06B6D4', // Cyan
        '#F97316', // Orange
        '#84CC16', // Lime
    ];

    return (
        <div className={`space-y-3 ${className}`}>
            {/* Selected Tags */}
            {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedTags.map(tag => (
                        <TagBadge
                            key={tag.id}
                            tag={tag}
                            removable={true}
                            onRemove={() => handleTagToggle(tag.id)}
                        />
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
                                onChange={(e) => setNewTagName(e.target.value)}
                                className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Color
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {predefinedColors.map(color => (
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
                            <div className="mt-2 flex items-center space-x-2">
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
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleCreateTag}
                                disabled={!newTagName.trim()}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                Create Tag
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
