import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Edit, Trash2, CheckCircle, Circle, ChevronDown, ChevronUp, Archive } from 'lucide-react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';

import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';
import TagBadge from '../../Components/TagBadge';
import ConfirmationModal from '../../Components/ConfirmationModal';
import CompletionReasonDialog from '../../Components/CompletionReasonDialog';
import TodoLinkManager from '../../Components/TodoLinkManager';
import FileUpload from '../../Components/FileUpload';
import AttachmentList from '../../Components/AttachmentList';
import Checkbox from '../../Components/Checkbox';
import SanitizedHtml from '../../Components/SanitizedHtml';

const getCookieCsrfToken = () => {
    if (typeof document === 'undefined') {
        return null;
    }

    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);

    if (!match) {
        return null;
    }

    try {
        return decodeURIComponent(match[1]);
    } catch (error) {
        return null;
    }
};

const resolveCsrfToken = () => {
    const inertiaToken = router?.page?.props?.csrf_token;

    if (inertiaToken) {
        return inertiaToken;
    }

    if (typeof document === 'undefined') {
        return null;
    }

    const tokenMeta = document.querySelector('meta[name="csrf-token"]');

    return tokenMeta?.content ?? null;
};

const formatPriorityText = (priority) => {
        if (!priority) return priority;
        return priority.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

export default function Show({ todo, availableTodos, statusEvents = [] }) {
    const toggleForm = useForm({ reason: '' });
    const archiveForm = useForm({ reason: '' });
    const restoreForm = useForm({ reason: '' });
    const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
    const [archiveAction, setArchiveAction] = useState(null);

    // Confirmation modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteProcessing, setDeleteProcessing] = useState(false);
    const [attachments, setAttachments] = useState(todo.attachments || []);
    const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
    const [reasonTargetState, setReasonTargetState] = useState(todo.is_completed ? 'pending' : 'completed');
    const isNote = (todo.type ?? '').toLowerCase() === 'note';
    const isArchived = Boolean(todo.archived);

    const [csrfToken, setCsrfToken] = useState(resolveCsrfToken());

    useEffect(() => {
        setCsrfToken(resolveCsrfToken());
    }, [todo.id]);

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
        const target = todo.is_completed ? 'pending' : 'completed';
        setReasonTargetState(target);
        toggleForm.clearErrors();
        setReasonDialogOpen(true);
    };

    const submitReason = (reason) => {
        const token = resolveCsrfToken();
        toggleForm.setData('reason', reason);
        toggleForm.transform(() => ({
            reason,
            ...(token ? { _token: token } : {}),
        }));
        toggleForm.post(`/todos/${todo.id}/toggle`, {
            preserveScroll: true,
            onSuccess: () => {
                setReasonDialogOpen(false);
                toggleForm.reset('reason');
                toggleForm.transform((data) => data);
            },
            onError: () => {
                setReasonDialogOpen(true);
                toggleForm.transform(() => ({
                    reason,
                    ...(token ? { _token: token } : {}),
                }));
            },
            onFinish: () => {
                toggleForm.transform((data) => data);
            },
        });
    };

    const handleDeleteClick = () => {
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = () => {
        setDeleteProcessing(true);

        // Submit a hidden form so Laravel receives classic POST with _token + _method
        const form = document.getElementById('delete-todo-form');
        if (form) {
            const input = form.querySelector('input[name="_token"]');
            if (input) {
                input.value = resolveCsrfToken() || '';
            }
            form.submit();
        } else {
            setDeleteProcessing(false);
        }
    };

    const handleDeleteCancel = () => {
        setShowDeleteModal(false);
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
            ? `/todos/${todo.id}/archive`
            : `/todos/${todo.id}/restore`;

        form.transform(() => ({
            reason,
            ...(token ? { _token: token } : {}),
        }));

        form.post(url, {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('reason');
                closeArchiveDialog();
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

    const createdAt = useMemo(() => new Date(todo.created_at), [todo.created_at]);
    const updatedAt = useMemo(() => new Date(todo.updated_at), [todo.updated_at]);
    const completedAt = useMemo(() => (todo.completed_at ? new Date(todo.completed_at) : null), [todo.completed_at]);
    const descriptionMarkup = useMemo(() => {
        if (todo.description == null) {
            return '';
        }

        if (typeof todo.description === 'string') {
            return todo.description;
        }

        try {
            return String(todo.description);
        } catch (error) {
            return '';
        }
    }, [todo.description]);
    const cleanedDescriptionMarkup = useMemo(() => {
        if (!descriptionMarkup) {
            return '';
        }

        const trailingZeroPattern = /(?:\s|&nbsp;)*(?:<p[^>]*>\s*(?:&nbsp;|\s)*0(?:\s|&nbsp;)*<\/p>|<div[^>]*>\s*(?:&nbsp;|\s)*0(?:\s|&nbsp;)*<\/div>|(?:<br\s*\/?>(?:\s|&nbsp;)*)*0)(?:\s|&nbsp;)*$/gi;

        let next = descriptionMarkup.trim();
        let previous;

        do {
            previous = next;
            next = next.replace(trailingZeroPattern, '').trim();
        } while (next !== previous);

        return next;
    }, [descriptionMarkup]);
    const hasDescription = useMemo(() => {
        if (!cleanedDescriptionMarkup) {
            return false;
        }

        const plainText = cleanedDescriptionMarkup
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .trim();

        return Boolean(plainText);
    }, [cleanedDescriptionMarkup]);
    const relatedTodosCount = useMemo(() => {
        const forward = Array.isArray(todo.related_todos) ? todo.related_todos.length : 0;
        const backward = Array.isArray(todo.relatedTodos) ? todo.relatedTodos.length : 0;

        return forward + backward;
    }, [todo.related_todos, todo.relatedTodos]);
    const [extrasOpen, setExtrasOpen] = useState(false);

    const formatTimestamp = useMemo(() => {
        const formatter = new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });

        return (date) => formatter.format(date).replace(', ', ' • ').replace(', ', ' • ');
    }, []);

    const metaRows = useMemo(() => {
        const rows = [
            {
                label: 'Created',
                value: formatTimestamp(createdAt),
            },
            {
                label: 'Last Updated',
                value: formatTimestamp(updatedAt),
            },
        ];

        if (todo.user?.name) {
            rows.push({ label: 'Owner', value: todo.user.name });
        }

        if (todo.is_completed && completedAt) {
            rows.push({
                label: 'Completed',
                value: formatTimestamp(completedAt),
            });
        }

        return rows;
    }, [createdAt, updatedAt, completedAt, todo.user?.name, todo.is_completed, formatTimestamp]);

    const checklistProgress = useMemo(() => {
        if (!checklistItems.length) {
            return null;
        }

        const percent = Math.round((completedChecklistCount / checklistItems.length) * 100);
        return {
            completed: completedChecklistCount,
            total: checklistItems.length,
            percent,
        };
    }, [checklistItems.length, completedChecklistCount]);

    return (
        <AppLayout title={todo.title}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 pb-16 lg:pb-20">
                <Head title={`${todo.title} · ${isNote ? 'Note' : 'Todo'} Details`} />

                <Link
                    href={isNote ? '/todos?type=note' : '/todos'}
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to {isNote ? 'Notes' : 'Todos'}
                </Link>

                <article className="mt-6 rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <header className="flex flex-col gap-6 border-b border-gray-200/60 px-5 py-6 dark:border-gray-800 lg:flex-row lg:items-start lg:justify-between lg:gap-12 lg:px-10 lg:py-10">
                        <div className="space-y-4 lg:max-w-3xl">
                            <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                {isNote ? 'Note' : 'Todo'}
                            </span>
                            <h1 className="text-3xl font-semibold leading-snug text-gray-900 dark:text-white md:text-4xl">
                                {todo.title}
                            </h1>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                {metaRows.map((row, index) => (
                                    <React.Fragment key={row.label}>
                                        {index > 0 && <span className="text-gray-300">•</span>}
                                        <span>
                                            {row.label} {row.value}
                                        </span>
                                    </React.Fragment>
                                ))}
                            </div>
                            {todo.tags && todo.tags.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {todo.tags.map((tag) => (
                                        <TagBadge key={tag.id} tag={tag} />
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 lg:max-w-sm lg:justify-end">
                            {!isNote && (
                                <button
                                    onClick={handleToggle}
                                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                                        todo.is_completed
                                            ? 'bg-green-100 text-green-700 ring-green-200 ring-offset-white dark:bg-green-900/30 dark:text-green-200 dark:ring-green-700/50 dark:ring-offset-gray-900'
                                            : 'bg-amber-100 text-amber-700 ring-amber-200 ring-offset-white dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-700/50 dark:ring-offset-gray-900'
                                    }`}
                                >
                                    {todo.is_completed ? <CheckCircle className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                                    {todo.is_completed ? 'Completed' : 'Mark complete'}
                                </button>
                            )}

                            {todo.is_completed && !isArchived && !isNote && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => openArchiveDialog('archive')}
                                    disabled={archiveForm.processing || restoreForm.processing}
                                    className="w-full gap-2 border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                                >
                                    <Archive className="w-4 h-4" />
                                    Archive
                                </Button>
                            )}

                            {todo.archived && !isNote && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => openArchiveDialog('restore')}
                                    disabled={archiveForm.processing || restoreForm.processing}
                                    className="w-full gap-2 border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                                >
                                    <Archive className="w-4 h-4" />
                                    Restore from archive
                                </Button>
                            )}

                            {todo.priority && !isNote && !todo.is_completed && (
                                <span
                                    className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase text-white"
                                    style={{ backgroundColor: todo.priority_color ?? '#6B7280' }}
                                >
                                    {formatPriorityText(todo.priority)}
                                </span>
                            )}

                            {isArchived && (
                                <span className="inline-flex items-center gap-2 rounded-full bg-gray-800 px-3 py-1 text-xs font-semibold uppercase text-white dark:bg-gray-200 dark:text-gray-900">
                                    Archived
                                </span>
                            )}

                            {checklistProgress && (
                                <span className="inline-flex items-center gap-2 rounded-full bg-gray-600 px-3 py-1 text-xs font-semibold text-white dark:bg-gray-700 dark:text-gray-200">
                                    {checklistProgress.completed}/{checklistProgress.total} tasks {checklistProgress.percent}%
                                </span>
                            )}
                        </div>
                    </header>

                    <div className="px-5 py-6 text-gray-700 dark:text-gray-200 lg:px-10 lg:py-10">
                        <section>
                            {hasDescription ? (
                                <SanitizedHtml className="prose prose-gray max-w-none text-base dark:prose-invert" html={cleanedDescriptionMarkup} />
                            ) : (
                                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-400">
                                    No description provided yet.
                                </div>
                            )}
                        </section>

                        {(checklistItems.length > 0 || attachments.length > 0 || relatedTodosCount > 0 || statusEvents.length > 0) && (
                            <div className="mt-8 border-t border-gray-200 pt-4 dark:border-gray-800 lg:mt-12 lg:pt-6">
                                <button
                                    type="button"
                                    onClick={() => setExtrasOpen((open) => !open)}
                                    className="flex w-full items-center justify-between rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                    <span>More details</span>
                                    {extrasOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>

                                {extrasOpen && (
                                    <div className="mt-4 space-y-6 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
                                        {checklistItems.length > 0 && (
                                            <section className="space-y-3 lg:col-span-2">
                                                <div className="flex items-center justify-between">
                                                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Checklist</h2>
                                                    <span className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                                        {completedChecklistCount}/{checklistItems.length} complete
                                                    </span>
                                                </div>
                                                <ul className="space-y-2">
                                                    {checklistItems.map((item) => (
                                                        <li key={item.id ?? item.title}>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleChecklistToggle(item)}
                                                                disabled={!item.id || updatingChecklistIds.includes(item.id)}
                                                                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 ${
                                                                    item.is_completed
                                                                        ? 'border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200'
                                                                        : 'border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
                                                                }`}
                                                            >
                                                                <Checkbox
                                                                    checked={!!item.is_completed}
                                                                    onChange={() => handleChecklistToggle(item)}
                                                                    className="h-5 w-5"
                                                                    disabled={!item.id || updatingChecklistIds.includes(item.id)}
                                                                />
                                                                <span className="font-medium">{item.title}</span>
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </section>
                                        )}


                                        <section className="space-y-3">
                                            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Linked Todos</h2>
                                            <TodoLinkManager
                                                todo={todo}
                                                availableTodos={availableTodos}
                                                onLink={handleLink}
                                                onUnlink={handleUnlink}
                                            />
                                        </section>

                                        <section className="space-y-3">
                                            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Attachments</h2>
                                            <FileUpload todoId={todo.id} onUploadSuccess={handleUploadSuccess} />
                                            <AttachmentList attachments={attachments} onAttachmentDeleted={handleAttachmentDeleted} />
                                        </section>
                                        {statusEvents.length > 0 && (
                                            <section className="space-y-3 lg:col-span-2">
                                                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Status history</h2>
                                                <div className="space-y-3">
                                                    {statusEvents.map((event) => (
                                                        <div key={event.id} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                                                            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                                                    {event.from_state ?? 'unknown'} → {event.to_state}
                                                                </span>
                                                                <span>{event.created_at_human ?? ''}</span>
                                                                {event.user?.name && (
                                                                    <span>by {event.user.name}</span>
                                                                )}
                                                            </div>
                                                            {event.reason && (
                                                                <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">{event.reason}</p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-12 flex flex-col gap-3 border-t border-gray-200 pt-6 dark:border-gray-800 sm:flex-row sm:justify-end lg:gap-4">
                            <Link href={`/todos/${todo.id}/edit`} className="sm:w-auto">
                                <button className="flex w-full items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 text-white rounded-md px-4 py-2 font-medium sm:w-auto">
                                    <Edit className="h-4 w-4" />
                                    Edit {isNote ? 'note' : 'todo'}
                                </button>
                            </Link>
                            <button
                                onClick={handleDeleteClick}
                                className="flex w-full items-center justify-center gap-2 border border-gray-300 text-gray-600 hover:text-gray-800 rounded-md px-4 py-2 font-medium dark:border-gray-600 dark:text-gray-400 dark:hover:text-gray-200 sm:w-auto"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete {isNote ? 'note' : 'todo'}
                            </button>
                        </div>
                    </div>
                </article>

                <CompletionReasonDialog
                    open={reasonDialogOpen}
                    onCancel={() => {
                        setReasonDialogOpen(false);
                        toggleForm.reset('reason');
                    }}
                    onSubmit={submitReason}
                    processing={toggleForm.processing}
                    initialState={todo.is_completed ? 'completed' : 'pending'}
                    targetState={reasonTargetState}
                    error={toggleForm.errors?.reason}
                />

                <CompletionReasonDialog
                    open={archiveDialogOpen}
                    onCancel={closeArchiveDialog}
                    onSubmit={handleArchiveSubmit}
                    processing={archiveAction === 'archive' ? archiveForm.processing : restoreForm.processing}
                    initialState={archiveAction === 'archive' ? (todo.is_completed ? 'completed' : 'pending') : 'archived'}
                    targetState={archiveAction === 'archive' ? 'archived' : todo.is_completed ? 'completed' : 'pending'}
                    error={(archiveAction === 'archive' ? archiveForm.errors?.reason : restoreForm.errors?.reason) ?? null}
                />

                <ConfirmationModal
                    isOpen={showDeleteModal}
                    onClose={handleDeleteCancel}
                    onConfirm={handleDeleteConfirm}
                    title={isNote ? 'Delete Note' : 'Delete Todo'}
                    message={`Are you sure you want to delete "${todo.title}"? This action cannot be undone.`}
                    confirmText={isNote ? 'Delete Note' : 'Delete Todo'}
                    confirmButtonVariant="destructive"
                    isLoading={deleteProcessing}
                />

                {/* Hidden form for reliable CSRF + method spoofing */}
                <form id="delete-todo-form" action={`/todos/${todo.id}`} method="POST" className="hidden">
                    <input type="hidden" name="_method" value="DELETE" />
                    <input type="hidden" name="_token" value={csrfToken || ''} />
                </form>
            </div>
        </AppLayout>
    );
}
