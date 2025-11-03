import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Link, useForm, router } from '@inertiajs/react';
import { LinkIcon, CheckCircle, Circle, Paperclip, FileText, Archive, ArchiveRestore, Edit, Trash2, Undo2 } from 'lucide-react';
import SanitizedHtml from './SanitizedHtml';
import TagBadge from './TagBadge';
import { Button } from './ui/button';
import CompletionReasonDialog from './CompletionReasonDialog';
import ConfirmationModal from './ConfirmationModal';
import { cn } from '../utils';

const stripHtml = (html) => {
    if (!html) return '';
    if (typeof window !== 'undefined' && window.DOMParser) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return doc.body.textContent || '';
    }
    return html.replace(/<[^>]*>/g, ' ');
};

const formatFileSize = (bytes) => {
    if (!Number.isFinite(bytes)) {
        return '';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let index = 0;

    while (size >= 1024 && index < units.length - 1) {
        size /= 1024;
        index += 1;
    }

    return `${size.toFixed(1)} ${units[index]}`;
};

const resolveCsrfToken = () => {
    const inertiaToken = router?.page?.props?.csrf_token;
    if (inertiaToken) return inertiaToken;
    if (typeof document === 'undefined') return null;
    const tokenMeta = document.querySelector('meta[name="csrf-token"]');
    return tokenMeta?.content ?? null;
};

export default function ContextPanel({ selectedTask = null, linkedTodos = [], className, onTaskUpdate }) {
    const safeLinked = Array.isArray(linkedTodos) ? linkedTodos : [];
    const contentRef = useRef(null);
    const toggleForm = useForm({ reason: '' });
    const archiveForm = useForm({ reason: '' });
    const restoreForm = useForm({ reason: '' });
    const deleteForm = useForm();
    const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
    const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [reasonTargetState, setReasonTargetState] = useState(null);
    const [archiveAction, setArchiveAction] = useState(null);

    const relatedTodos = useMemo(() => {
        if (!selectedTask) return [];
        return safeLinked.filter(t => t.id !== selectedTask.id);
    }, [selectedTask, safeLinked]);

    useEffect(() => {
        if (!selectedTask) return;
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
    }, [selectedTask?.id]);

    const handleToggle = () => {
        const target = selectedTask.is_completed ? 'pending' : 'completed';
        setReasonTargetState(target);
        toggleForm.clearErrors();
        setReasonDialogOpen(true);
    };

    const submitToggleReason = (reason) => {
        toggleForm.setData('reason', reason);
        toggleForm.post(`/todos/${selectedTask.id}/toggle`, {
            preserveScroll: true,
            onSuccess: () => {
                setReasonDialogOpen(false);
                toggleForm.reset('reason');
                if (onTaskUpdate) onTaskUpdate();
            },
            onError: () => {
                setReasonDialogOpen(true);
            },
        });
    };

    const openArchiveDialog = (action) => {
        archiveForm.reset('reason');
        archiveForm.clearErrors();
        restoreForm.reset('reason');
        restoreForm.clearErrors();
        setArchiveAction(action);
        setArchiveDialogOpen(true);
    };

    const closeArchiveDialog = () => {
        setArchiveDialogOpen(false);
        setArchiveAction(null);
        archiveForm.reset('reason');
        archiveForm.clearErrors();
        restoreForm.reset('reason');
        restoreForm.clearErrors();
    };

    const handleArchiveSubmit = (reason) => {
        if (!archiveAction) {
            return;
        }

        const token = resolveCsrfToken();
        const form = archiveAction === 'archive' ? archiveForm : restoreForm;
        const url = archiveAction === 'archive'
            ? `/todos/${selectedTask.id}/archive`
            : `/todos/${selectedTask.id}/restore`;

        form.transform(() => ({
            reason,
            ...(token ? { _token: token } : {}),
        }));

        form.post(url, {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('reason');
                closeArchiveDialog();
                if (onTaskUpdate) onTaskUpdate();
                form.transform((data) => data);
            },
            onError: () => {
                form.transform(() => ({
                    reason,
                    ...(token ? { _token: token } : {}),
                }));
            },
            onFinish: () => {
                form.transform((data) => data);
            },
        });
    };

    const handleDeleteClick = () => {
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = () => {
        deleteForm.delete(`/todos/${selectedTask.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setShowDeleteModal(false);
                if (onTaskUpdate) onTaskUpdate();
            },
        });
    };

    if (!selectedTask) {
        return null;
    }

    const attachments = Array.isArray(selectedTask.attachments) ? selectedTask.attachments : [];
    const isArchived = Boolean(selectedTask.archived);
    const isNote = (selectedTask.type ?? '').toLowerCase() === 'note';

    return (
        <div className={cn('flex h-full flex-col overflow-hidden', className)}>
            <div
                ref={contentRef}
                className="flex-1 overflow-y-auto px-6 py-6 space-y-6"
            >
            <header className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-indigo-500 dark:text-indigo-300">
                    Context
                </p>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{selectedTask.title}</h2>
                {selectedTask.description && (
                    <SanitizedHtml
                        html={selectedTask.description}
                        className="prose prose-sm text-gray-600 dark:prose-invert dark:text-gray-300 max-w-none"
                    />
                )}
            </header>

            <section className="space-y-4">
                <div className="space-y-2">
                    {/* Priority & Importance */}
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Priority
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2">
                            {selectedTask.priority && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                    style={{
                                        backgroundColor: selectedTask.priority_color + '20',
                                        color: selectedTask.priority_color,
                                    }}>
                                    {selectedTask.priority.charAt(0).toUpperCase() + selectedTask.priority.slice(1)}
                                </span>
                            )}
                            {selectedTask.importance && (
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    selectedTask.importance === 'high'
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                }`}>
                                    {selectedTask.importance === 'high' ? '⭐ Important' : 'Regular'}
                                </span>
                            )}
                        </div>
                    </div>

                </div>

                {/* Status */}
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Status
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-sm">
                        {selectedTask.is_completed ? (
                            <>
                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <span className="font-medium text-green-600 dark:text-green-400">Completed</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                <span className="font-medium text-gray-600 dark:text-gray-300">Pending</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Created Date */}
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Created
                    </p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {new Date(selectedTask.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </p>
                </div>

                {Array.isArray(selectedTask.tags) && selectedTask.tags.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Tags
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {selectedTask.tags.map((tag) => (
                                <TagBadge key={tag.id} tag={tag} />
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {attachments.length > 0 && (
                <section>
                    <div className="mb-3 flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Attachments ({attachments.length})
                        </p>
                    </div>
                    <div className="space-y-2">
                        {attachments.map((attachment) => {
                            const isImage = (attachment?.type ?? '').toLowerCase() === 'image';
                            const previewUrl = attachment?.thumbnail_url || attachment?.url;

                            return (
                                <a
                                    key={attachment.id ?? attachment.file_path ?? attachment.url}
                                    href={attachment?.url ?? '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 transition-colors hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-indigo-500/40 dark:hover:bg-slate-800"
                                >
                                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-100 dark:border-slate-700 dark:bg-slate-900">
                                        {isImage && previewUrl ? (
                                            <img
                                                src={previewUrl}
                                                alt={attachment?.original_name ?? 'Attachment preview'}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <FileText className="h-5 w-5 text-gray-500" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                            {attachment?.original_name ?? 'Attachment'}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatFileSize(Number(attachment?.file_size))}
                                        </p>
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                </section>
            )}

            {relatedTodos.length > 0 && (
                <section>
                    <div className="mb-3 flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Related Tasks ({relatedTodos.length})
                        </p>
                    </div>
                    <div className="space-y-2">
                        {relatedTodos.map((todo) => (
                            <Link key={todo.id} href={`/todos/${todo.id}`}>
                                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 transition-colors hover:border-indigo-200 hover:bg-white dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-indigo-500/40">
                                    <div className="flex items-start gap-2">
                                        {todo.is_completed ? (
                                            <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" />
                                        ) : (
                                            <Circle className="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                                                {todo.title}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {todo.is_completed ? 'Completed' : 'Pending'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}
            </div>

            <div className="border-t border-gray-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-start gap-2">
                    {!isNote && (
                        <Button
                            type="button"
                            onClick={handleToggle}
                            disabled={toggleForm.processing}
                            size="icon"
                            title={selectedTask.is_completed ? 'Mark as pending' : 'Mark as complete'}
                            aria-label={selectedTask.is_completed ? 'Mark as pending' : 'Mark as complete'}
                            className={cn(
                                'rounded-lg text-white shadow-sm hover:shadow focus-visible:ring-offset-gray-900',
                                selectedTask.is_completed
                                    ? 'bg-amber-500 hover:bg-amber-500/90 focus-visible:ring-amber-300'
                                    : 'bg-green-500 hover:bg-green-500/90 focus-visible:ring-green-300'
                            )}
                        >
                            {selectedTask.is_completed ? <Undo2 className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </Button>
                    )}

                    {selectedTask.is_completed && !isArchived && !isNote && (
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => openArchiveDialog('archive')}
                            disabled={archiveForm.processing || restoreForm.processing}
                            title="Archive todo"
                            aria-label="Archive todo"
                            className="rounded-lg"
                        >
                            <Archive className="h-4 w-4" />
                        </Button>
                    )}

                    {isArchived && !isNote && (
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => openArchiveDialog('restore')}
                            disabled={archiveForm.processing || restoreForm.processing}
                            title="Restore from archive"
                            aria-label="Restore from archive"
                            className="rounded-lg"
                        >
                            <ArchiveRestore className="h-4 w-4" />
                        </Button>
                    )}

                    <Button
                        asChild
                        variant="outline"
                        size="icon"
                        title="Edit todo"
                        aria-label="Edit todo"
                        className="rounded-lg"
                    >
                        <Link href={`/todos/${selectedTask.id}/edit`}>
                            <Edit className="h-4 w-4" />
                        </Link>
                    </Button>

                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={handleDeleteClick}
                        disabled={deleteForm.processing}
                        title="Delete todo"
                        aria-label="Delete todo"
                        className="rounded-lg"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Dialogs */}
            <CompletionReasonDialog
                open={reasonDialogOpen}
                onCancel={() => {
                    setReasonDialogOpen(false);
                    toggleForm.reset('reason');
                }}
                onSubmit={submitToggleReason}
                processing={toggleForm.processing}
                initialState={selectedTask.is_completed ? 'completed' : 'pending'}
                targetState={reasonTargetState}
                error={toggleForm.errors?.reason}
            />

            <CompletionReasonDialog
                open={archiveDialogOpen}
                onCancel={closeArchiveDialog}
                onSubmit={handleArchiveSubmit}
                processing={archiveAction === 'archive' ? archiveForm.processing : restoreForm.processing}
                initialState={archiveAction === 'archive' ? (selectedTask.is_completed ? 'completed' : 'pending') : 'archived'}
                targetState={archiveAction === 'archive' ? 'archived' : selectedTask.is_completed ? 'completed' : 'pending'}
                error={(archiveAction === 'archive' ? archiveForm.errors?.reason : restoreForm.errors?.reason) ?? null}
            />

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete Todo"
                message={`Are you sure you want to delete "${selectedTask.title}"? This action cannot be undone.`}
                confirmText="Delete"
                confirmButtonVariant="destructive"
                isLoading={deleteForm.processing}
            />
        </div>
    );
}
