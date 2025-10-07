import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Plus, Trash2, X, RotateCcw, Edit } from 'lucide-react';

import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';
import ConfirmationModal from '../../Components/ConfirmationModal';
import TagEditModal from '../../Components/TagEditModal';

export default function Index({ tags, deletedTags }) {
    const deleteForm = useForm();
    const restoreForm = useForm();

    // Confirmation modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [tagToDelete, setTagToDelete] = useState(null);

    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [tagToEdit, setTagToEdit] = useState(null);

    const handleDeleteClick = (tag) => {
        setTagToDelete(tag);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = () => {
        if (tagToDelete) {
            deleteForm.delete(`/manage/tags/${tagToDelete.id}`);
            setShowDeleteModal(false);
            setTagToDelete(null);
        }
    };

    const handleDeleteCancel = () => {
        setShowDeleteModal(false);
        setTagToDelete(null);
    };

    const handleRestoreClick = (tag) => {
        restoreForm.post(`/manage/tags/${tag.id}/restore`);
    };

    const handleEditClick = (tag) => {
        setTagToEdit(tag);
        setShowEditModal(true);
    };

    const handleEditClose = () => {
        setShowEditModal(false);
        setTagToEdit(null);
    };

    return (
        <AppLayout title="Manage Tags">
            <Head title="Manage Tags" />
            
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Manage Tags</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            {tags && tags.length > 0 ? `${tags.length} tag${tags.length !== 1 ? 's' : ''} created` : 'No tags created yet'}
                        </p>
                    </div>
                    <Link href="/todos/create">
                        <Button className="bg-black hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-black">
                            <Plus className="w-4 h-4 mr-2" />
                            Create Todo with Tags
                        </Button>
                    </Link>
                </div>

                {/* Tags Grid */}
                {tags && tags.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {tags.map((tag) => (
                            <div key={tag.id} className="group bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 overflow-hidden">
                                <div className="p-4">
                                    {/* Tag Preview */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-2">
                                            <div
                                                className="w-4 h-4 rounded-full"
                                                style={{ backgroundColor: tag.color }}
                                            />
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {tag.name}
                                            </span>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                            <button
                                                onClick={() => handleEditClick(tag)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                title="Edit tag"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(tag)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                                title="Delete tag"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Tag Color Code */}
                                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                        {tag.color}
                                    </div>

                                    {/* Usage Info */}
                                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        Created {new Date(tag.created_at).toLocaleDateString()}
                                        {tag.todos_count !== undefined && (
                                            <span className="ml-2">
                                                • Used in {tag.todos_count} todo{tag.todos_count !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-center py-12">
                            <div className="text-6xl mb-4">🏷️</div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No tags yet</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">Tags help you organize and categorize your todos. Create your first tag when you create a todo item.</p>
                            <Link href="/todos/create">
                                <Button className="bg-black hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-black">
                                    <Plus className="w-5 h-5 mr-2" />
                                    Create Your First Todo
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}

                {/* Deleted Tags Section */}
                {deletedTags && deletedTags.length > 0 && (
                    <div className="space-y-4">
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                                Deleted Tags ({deletedTags.length})
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                These tags have been deleted but can be restored if needed.
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {deletedTags.map((tag) => (
                                <div key={tag.id} className="group bg-gray-50 dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 overflow-hidden opacity-75">
                                    <div className="p-4">
                                        {/* Tag Preview */}
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center space-x-2">
                                                <div
                                                    className="w-4 h-4 rounded-full opacity-60"
                                                    style={{ backgroundColor: tag.color }}
                                                />
                                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                                    {tag.name}
                                                </span>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                                <button
                                                    onClick={() => handleRestoreClick(tag)}
                                                    disabled={restoreForm.processing}
                                                    className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors disabled:opacity-50"
                                                    title="Restore tag"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Tag Color Code */}
                                        <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                                            {tag.color}
                                        </div>

                                        {/* Usage Info */}
                                        <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                                            Deleted {new Date(tag.deleted_at).toLocaleDateString()}
                                            {tag.todos_count !== undefined && (
                                                <span className="ml-2">
                                                    • Was used in {tag.todos_count} todo{tag.todos_count !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={handleDeleteCancel}
                onConfirm={handleDeleteConfirm}
                title="Delete Tag"
                message={
                    tagToDelete?.todos_count > 0
                        ? `Are you sure you want to delete the tag "${tagToDelete?.name}"? This will remove it from ${tagToDelete?.todos_count} todo${tagToDelete?.todos_count !== 1 ? 's' : ''} and cannot be undone.`
                        : `Are you sure you want to delete the tag "${tagToDelete?.name}"? This action cannot be undone.`
                }
                confirmText="Delete Tag"
                confirmButtonVariant="destructive"
                isLoading={deleteForm.processing}
            />

            {/* Edit Tag Modal */}
            <TagEditModal
                isOpen={showEditModal}
                onClose={handleEditClose}
                tag={tagToEdit}
            />
        </AppLayout>
    );
}
