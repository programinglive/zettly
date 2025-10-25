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
            
            <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pb-12">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Manage Tags</h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {tags && tags.length > 0 ? `${tags.length} tag${tags.length !== 1 ? 's' : ''} created` : 'No tags created yet'}
                            </p>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Keep your work organized by editing colors, renaming labels, or removing ones you no longer need.
                        </p>
                    </div>
                    <Link href="/todos/create" className="w-full sm:w-auto">
                        <Button className="w-full justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white dark:bg-indigo-500 dark:hover:bg-indigo-400">
                            <Plus className="w-4 h-4 mr-2" />
                            Create Todo with Tags
                        </Button>
                    </Link>
                </div>

                {/* Tags Grid */}
                {tags && tags.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {tags.map((tag) => (
                            <div
                                key={tag.id}
                                className="group relative flex flex-col rounded-2xl border border-gray-200/70 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-700/70 dark:bg-gray-900/60"
                            >
                                <div className="p-4 sm:p-5 space-y-4">
                                    {/* Tag Preview */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="h-3.5 w-3.5 rounded-full"
                                                style={{ backgroundColor: tag.color }}
                                            />
                                            <div>
                                                <p className="text-base font-semibold text-gray-900 dark:text-white">{tag.name}</p>
                                                <p className="text-xs font-mono uppercase tracking-wide text-gray-400 dark:text-gray-500">{tag.color}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 sm:opacity-0 sm:group-hover:opacity-100">
                                            <button
                                                onClick={() => handleEditClick(tag)}
                                                className="rounded-full p-1.5 hover:text-blue-600 dark:hover:text-blue-400"
                                                title="Edit tag"
                                                type="button"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(tag)}
                                                className="rounded-full p-1.5 hover:text-red-600 dark:hover:text-red-400"
                                                title="Delete tag"
                                                type="button"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Usage Info */}
                                    <div className="rounded-xl bg-gray-50/80 px-3 py-2 text-xs font-medium text-gray-600 dark:bg-gray-800/70 dark:text-gray-300">
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
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                Deleted Tags ({deletedTags.length})
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                These tags have been deleted but can be restored if needed.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {deletedTags.map((tag) => (
                                <div
                                    key={tag.id}
                                    className="group relative flex flex-col rounded-2xl border border-gray-200/70 bg-gray-50/80 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-700/70 dark:bg-gray-900/40"
                                >
                                    <div className="p-4 sm:p-5 space-y-4">
                                        {/* Tag Preview */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="h-3.5 w-3.5 rounded-full opacity-60"
                                                    style={{ backgroundColor: tag.color }}
                                                />
                                                <div>
                                                    <p className="text-base font-semibold text-gray-800 dark:text-gray-200">{tag.name}</p>
                                                    <p className="text-xs font-mono uppercase tracking-wide text-gray-400 dark:text-gray-500">{tag.color}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 sm:opacity-0 sm:group-hover:opacity-100">
                                                <button
                                                    onClick={() => handleRestoreClick(tag)}
                                                    disabled={restoreForm.processing}
                                                    className="rounded-full p-1.5 hover:text-green-600 dark:hover:text-green-400 disabled:opacity-50"
                                                    title="Restore tag"
                                                    type="button"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Usage Info */}
                                        <div className="rounded-xl bg-white/70 px-3 py-2 text-xs font-medium text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
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
