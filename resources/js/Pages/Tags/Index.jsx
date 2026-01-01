import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Plus, Trash2, RotateCcw, Edit, Hash, Tag as TagIcon } from 'lucide-react';

import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';
import ConfirmationModal from '../../Components/ConfirmationModal';
import TagEditModal from '../../Components/TagEditModal';
import TagCreateModal from '../../Components/TagCreateModal';

export default function Index({ auth, tags, deletedTags }) {
    const deleteForm = useForm();
    const restoreForm = useForm();

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [tagToDelete, setTagToDelete] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [tagToEdit, setTagToEdit] = useState(null);

    const handleDeleteClick = (tag) => {
        setTagToDelete(tag);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = () => {
        if (tagToDelete) {
            deleteForm.delete(`/manage/tags/${tagToDelete.id}`, {
                onSuccess: () => {
                    setShowDeleteModal(false);
                    setTagToDelete(null);
                }
            });
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
        <AppLayout title="Tags">
            <Head title="Tags" />

            <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 py-12">
                {/* Header Section */}
                <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-widest animate-in fade-in slide-in-from-left-4 duration-700">
                            <Hash className="w-3.5 h-3.5" />
                            Organization
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 dark:text-white animate-in fade-in slide-in-from-left-4 duration-700 delay-75">
                                Tags
                            </h1>
                            <p className="text-lg text-gray-500 dark:text-slate-400 max-w-xl animate-in fade-in slide-in-from-left-4 duration-700 delay-150">
                                Create and manage custom tags to categorize your todos and keep your workspace brilliantly organized.
                            </p>
                        </div>
                    </div>
                    <div className="animate-in fade-in slide-in-from-right-4 duration-700 delay-300">
                        <Button
                            onClick={() => setShowCreateModal(true)}
                            className="h-14 px-8 rounded-full bg-gray-900 text-white hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 font-bold shadow-xl shadow-gray-200 dark:shadow-none transition-all hover:scale-105"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            New Tag
                        </Button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
                    {tags && tags.length > 0 ? (
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {tags.map((tag) => (
                                <div
                                    key={tag.id}
                                    className="group relative flex flex-col rounded-[2.5rem] border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900/50"
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
                                                style={{ backgroundColor: tag.color + '20' }}
                                            >
                                                <TagIcon className="w-6 h-6" style={{ color: tag.color }} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {tag.name}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs font-mono uppercase tracking-widest text-gray-400 dark:text-slate-500">
                                                        {tag.color}
                                                    </span>
                                                    {tag.todos_count !== undefined && (
                                                        <>
                                                            <span className="text-gray-300 dark:text-slate-700">px-1</span>
                                                            <span className="text-xs font-bold text-gray-500 dark:text-slate-400">
                                                                {tag.todos_count} {tag.todos_count === 1 ? 'todo' : 'todos'}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleEditClick(tag)}
                                                className="p-2.5 rounded-full text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                                                title="Edit"
                                            >
                                                <Edit className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(tag)}
                                                className="p-2.5 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-gray-50 dark:border-slate-800/50 flex items-center justify-between">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-600">
                                            Created {new Date(tag.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                        <div
                                            className="h-2 w-2 rounded-full"
                                            style={{ backgroundColor: tag.color }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="relative overflow-hidden rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-slate-800 p-12 text-center bg-white/50 dark:bg-slate-900/30 backdrop-blur-sm">
                            <div className="relative z-10 space-y-6">
                                <div className="mx-auto w-24 h-24 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-4xl shadow-inner">
                                    🏷️
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
                                        No Tags Yet
                                    </h3>
                                    <p className="text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
                                        Start organizing your tasks with meaningful labels. Create your first tag to better categorize your workflow.
                                    </p>
                                </div>
                                <Button
                                    onClick={() => setShowCreateModal(true)}
                                    className="h-14 px-8 rounded-full bg-gray-900 text-white hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 font-bold shadow-xl shadow-gray-200 dark:shadow-none transition-all hover:scale-105"
                                >
                                    <Plus className="w-5 h-5 mr-2" />
                                    Create Your First Tag
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Deleted Tags Section */}
                {deletedTags && deletedTags.length > 0 && (
                    <div className="space-y-8 pt-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-700">
                        <div className="flex flex-col gap-2">
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                                Recently Deleted
                            </h2>
                            <p className="text-gray-500 dark:text-slate-400">
                                Tags you've removed can be restored back to your active list.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {deletedTags.map((tag) => (
                                <div
                                    key={tag.id}
                                    className="group flex items-center justify-between gap-4 p-4 rounded-3xl border border-gray-100 bg-gray-50/50 dark:border-slate-800 dark:bg-slate-900/20 transition-all hover:bg-white dark:hover:bg-slate-900"
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="h-2 w-2 rounded-full opacity-40"
                                            style={{ backgroundColor: tag.color }}
                                        />
                                        <span className="font-bold text-gray-500 dark:text-slate-500 line-through">
                                            {tag.name}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleRestoreClick(tag)}
                                        className="p-2 rounded-full text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all"
                                        title="Restore"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={handleDeleteCancel}
                onConfirm={handleDeleteConfirm}
                title="Delete Tag"
                message={
                    tagToDelete?.todos_count > 0
                        ? `Are you sure you want to delete "${tagToDelete?.name}"? It's currently used in ${tagToDelete?.todos_count} todo${tagToDelete?.todos_count !== 1 ? 's' : ''}.`
                        : `Are you sure you want to delete the tag "${tagToDelete?.name}"?`
                }
                confirmText="Delete Tag"
                confirmButtonVariant="destructive"
                isLoading={deleteForm.processing}
            />

            {/* Edit Modal */}
            <TagEditModal
                isOpen={showEditModal}
                onClose={handleEditClose}
                tag={tagToEdit}
            />

            {/* Create Modal */}
            <TagCreateModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
            />
        </AppLayout>
    );
}
