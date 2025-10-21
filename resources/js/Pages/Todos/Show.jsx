import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { ArrowLeft, Edit, Trash2, CheckCircle, Circle, Calendar, User } from 'lucide-react';

import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../Components/ui/card';
import TagBadge from '../../Components/TagBadge';
import ConfirmationModal from '../../Components/ConfirmationModal';
import TodoLinkManager from '../../Components/TodoLinkManager';
import FileUpload from '../../Components/FileUpload';
import AttachmentList from '../../Components/AttachmentList';
import Checkbox from '../../Components/Checkbox';
import SanitizedHtml from '../../Components/SanitizedHtml';

export default function Show({ todo, availableTodos }) {
    const { delete: destroy } = useForm();
    const toggleForm = useForm();
    const linkForm = useForm();
    const unlinkForm = useForm();

    // Confirmation modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [attachments, setAttachments] = useState(todo.attachments || []);
    const isNote = (todo.type ?? '').toLowerCase() === 'note';

    const deriveChecklistItems = () => (todo.checklistItems || todo.checklist_items || []).map((item) => ({
        id: item.id,
        title: item.title,
        is_completed: !!item.is_completed,
    }));

    const [checklistItems, setChecklistItems] = useState(deriveChecklistItems);
    const [updatingChecklistIds, setUpdatingChecklistIds] = useState([]);

    useEffect(() => {
        setChecklistItems(deriveChecklistItems());
    }, [todo.id, JSON.stringify((todo.checklistItems || todo.checklist_items || []).map(item => ({
        id: item.id,
        title: item.title,
        is_completed: item.is_completed,
    })))]);

    const completedChecklistCount = checklistItems.filter(item => item.is_completed).length;

    const handleToggle = () => {
        toggleForm.post(`/todos/${todo.id}/toggle`);
    };

    const handleDeleteClick = () => {
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = () => {
        destroy(`/todos/${todo.id}`);
        setShowDeleteModal(false);
    };

    const handleDeleteCancel = () => {
        setShowDeleteModal(false);
    };

    const handleLink = async (todoId, relatedTodoId) => {
        router.post(`/todos/${todoId}/link`, {
            related_todo_id: relatedTodoId,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                window.location.reload();
            }
        });
    };

    const handleUnlink = async (todoId, relatedTodoId) => {
        router.post(`/todos/${todoId}/unlink`, {
            related_todo_id: relatedTodoId,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                window.location.reload();
            }
        });
    };

    const handleUploadSuccess = () => {
        // Reload the page to get updated attachments
        window.location.reload();
    };

    const handleAttachmentDeleted = (attachmentId) => {
        setAttachments(prev => prev.filter(att => att.id !== attachmentId));
    };

    const handleChecklistToggle = (item) => {
        if (!item?.id || updatingChecklistIds.includes(item.id)) {
            return;
        }

        const previousItems = checklistItems.map(existing => ({ ...existing }));
        const nextItems = checklistItems.map(existing => existing.id === item.id
            ? { ...existing, is_completed: !existing.is_completed }
            : existing
        );

        setChecklistItems(nextItems);
        setUpdatingChecklistIds((prev) => [...prev, item.id]);

        router.patch(`/todos/${todo.id}/checklist/${item.id}/toggle`, {}, {
            preserveScroll: true,
            preserveState: true,
            onError: () => {
                setChecklistItems(previousItems);
            },
            onFinish: () => {
                setUpdatingChecklistIds((prev) => prev.filter((id) => id !== item.id));
            },
        });
    };

    return (
        <AppLayout title={todo.title}>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-12">
                <Head title={`${todo.title} · ${isNote ? 'Note' : 'Todo'} Details`} />

                <Link
                    href={isNote ? '/todos?type=note' : '/todos'}
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to {isNote ? 'Notes' : 'Todos'}
                </Link>

                <section className="rounded-2xl bg-white text-gray-900 shadow-xl p-6 sm:p-8 space-y-6 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 dark:text-white">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <span className="text-xs uppercase tracking-widest text-gray-300">{isNote ? 'Note' : 'Todo'}</span>
                            <h1 className="text-3xl sm:text-4xl font-semibold leading-tight break-words">
                                {todo.title}
                            </h1>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {!isNote && (
                                <button
                                    onClick={handleToggle}
                                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium transition-all border focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-200 focus-visible:ring-offset-white dark:focus-visible:ring-white/70 dark:focus-visible:ring-offset-gray-900 ${
                                        todo.is_completed
                                            ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-100/20 dark:text-green-200 dark:border-green-300/30'
                                            : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-orange-100/20 dark:text-orange-200 dark:border-orange-300/30'
                                    }`}
                                >
                                    {todo.is_completed ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                                    {todo.is_completed ? 'Completed' : 'Pending'}
                                </button>
                            )}

                            {todo.priority && !isNote && !todo.is_completed && (
                                <span
                                    className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium text-white"
                                    style={{ backgroundColor: todo.priority_color ?? '#6B7280' }}
                                >
                                    {todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)} Priority
                                </span>
                            )}
                        </div>

                        <dl className="grid grid-cols-1 gap-3 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-2">
                            <div className="rounded-lg bg-gray-100 px-3 py-2 dark:bg-white/5">
                                <dt className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">Created</dt>
                                <dd className="mt-1">
                                    {new Date(todo.created_at).toLocaleString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </dd>
                            </div>
                            <div className="rounded-lg bg-gray-100 px-3 py-2 dark:bg-white/5">
                                <dt className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">Last Updated</dt>
                                <dd className="mt-1">
                                    {new Date(todo.updated_at).toLocaleString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </dd>
                            </div>
                        </dl>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Link href={`/todos/${todo.id}/edit`}>
                                <Button className="w-full bg-white text-gray-900 hover:bg-gray-200">
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit {isNote ? 'Note' : 'Todo'}
                                </Button>
                            </Link>
                            <Button
                                variant="outline"
                                onClick={handleDeleteClick}
                                className="w-full border border-white/30 text-white hover:bg-white/10"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete {isNote ? 'Note' : 'Todo'}
                            </Button>
                        </div>
                    </div>
                </section>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Overview</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {todo.description ? (
                                    <SanitizedHtml
                                        className="text-gray-700 dark:text-gray-300 leading-relaxed"
                                        html={todo.description}
                                    />
                                ) : (
                                    <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                        <div className="mb-2 text-3xl">📝</div>
                                        No description provided
                                    </div>
                                )}

                                {checklistItems.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Checklist</h3>
                                            <span className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                                {completedChecklistCount}/{checklistItems.length} complete
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            {checklistItems.map((item) => (
                                                <button
                                                    key={item.id ?? item.title}
                                                    onClick={() => handleChecklistToggle(item)}
                                                    disabled={!item.id || updatingChecklistIds.includes(item.id)}
                                                    className={`w-full rounded-xl border px-3 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${
                                                        item.is_completed
                                                            ? 'border-green-200/70 bg-green-50 dark:border-green-700/70 dark:bg-green-900/20'
                                                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                                                    }`}
                                                >
                                                    <span
                                                        className={`inline-flex items-center gap-2 text-sm font-medium ${
                                                            item.is_completed
                                                                ? 'text-green-700 dark:text-green-300'
                                                                : 'text-gray-700 dark:text-gray-200'
                                                        }`}
                                                    >
                                                        <Checkbox
                                                            checked={!!item.is_completed}
                                                            onChange={() => handleChecklistToggle(item)}
                                                            className="h-5 w-5"
                                                            disabled={!item.id || updatingChecklistIds.includes(item.id)}
                                                        />
                                                        {item.title}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {todo.tags && todo.tags.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Tags</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {todo.tags.map((tag) => (
                                                <TagBadge key={tag.id} tag={tag} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Linked Todos</h3>
                                    <TodoLinkManager
                                        todo={todo}
                                        availableTodos={availableTodos}
                                        onLink={handleLink}
                                        onUnlink={handleUnlink}
                                    />
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Attachments</h3>
                                    <FileUpload todoId={todo.id} onUploadSuccess={handleUploadSuccess} />
                                    <AttachmentList attachments={attachments} onAttachmentDeleted={handleAttachmentDeleted} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Quick Info</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-3 py-2">
                                    <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                    <div>
                                        <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">Created</p>
                                        <p className="text-sm text-gray-700 dark:text-gray-200">
                                            {new Date(todo.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>

                                {todo.user && (
                                    <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-3 py-2">
                                        <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                        <div>
                                            <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">Owner</p>
                                            <p className="text-sm text-gray-700 dark:text-gray-200">{todo.user.name}</p>
                                        </div>
                                    </div>
                                )}

                                {todo.is_completed && todo.completed_at && (
                                    <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-3 py-2">
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                        <div>
                                            <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">Completed</p>
                                            <p className="text-sm text-gray-700 dark:text-gray-200">
                                                {new Date(todo.completed_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 gap-3">
                                <Link href={`/todos/${todo.id}/edit`}>
                                    <Button variant="outline" className="w-full">
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit {isNote ? 'Note' : 'Todo'}
                                    </Button>
                                </Link>
                                <Button variant="outline" onClick={handleDeleteClick} className="w-full">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete {isNote ? 'Note' : 'Todo'}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <ConfirmationModal
                    isOpen={showDeleteModal}
                    onClose={handleDeleteCancel}
                    onConfirm={handleDeleteConfirm}
                    title={isNote ? 'Delete Note' : 'Delete Todo'}
                    message={`Are you sure you want to delete "${todo.title}"? This action cannot be undone.`}
                    confirmText={isNote ? 'Delete Note' : 'Delete Todo'}
                    confirmButtonVariant="destructive"
                    isLoading={destroy.processing}
                />
            </div>
        </AppLayout>
    );
}
