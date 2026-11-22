import React, { useEffect, useMemo, useState } from 'react';
import {
    ArrowLeft,
    Edit,
    Trash2,
    CheckCircle,
    Circle,
    Archive,
    Bot,
    Calendar,
    Target,
    ListChecks,
    Link2,
    Paperclip,
    Clock,
    FileText,
} from 'lucide-react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';

import AppLayout from '../../Layouts/AppLayout';
import ConfirmationModal from '../../Components/ConfirmationModal';
import CompletionReasonDialog from '../../Components/CompletionReasonDialog';
import TodoLinkManager from '../../Components/TodoLinkManager';
import FileUpload from '../../Components/FileUpload';
import AttachmentList from '../../Components/AttachmentList';
import Checkbox from '../../Components/Checkbox';
import SanitizedHtml from '../../Components/SanitizedHtml';

const resolveCsrfToken = () => {
    const inertiaToken = router?.page?.props?.csrf_token;
    if (inertiaToken) return inertiaToken;
    if (typeof document === 'undefined') return null;
    const tokenMeta = document.querySelector('meta[name="csrf-token"]');
    return tokenMeta?.content ?? null;
};

const formatPriorityText = (priority) => {
    if (!priority) return '';
    return priority.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

const splitTagName = (name) => {
    const text = String(name || '');
    const index = text.indexOf(':');
    if (index <= 0) return { axis: '', value: text };
    return { axis: text.slice(0, index), value: text.slice(index + 1) };
};

export default function Show({ todo, availableTodos, statusEvents = [], canonicalProject = null }) {
    const { canUseCodingAgent } = usePage().props;
    const toggleForm = useForm({ reason: '' });
    const archiveForm = useForm({ reason: '' });
    const restoreForm = useForm({ reason: '' });
    const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
    const [archiveAction, setArchiveAction] = useState(null);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [todo.id, JSON.stringify((todo.checklistItems || todo.checklist_items || []).map((item) => ({
        id: item.id,
        title: item.title,
        is_completed: item.is_completed,
    })))]);

    const completedChecklistCount = checklistItems.filter((item) => item.is_completed).length;

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

    const handleDeleteConfirm = () => {
        setDeleteProcessing(true);
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
        if (!archiveAction) return;

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
        router.post(`/todos/${todoId}/link`, { related_todo_id: relatedTodoId }, {
            preserveScroll: true,
            onSuccess: () => window.location.reload(),
        });
    };

    const handleUnlink = async (todoId, relatedTodoId) => {
        router.post(`/todos/${todoId}/unlink`, { related_todo_id: relatedTodoId }, {
            preserveScroll: true,
            onSuccess: () => window.location.reload(),
        });
    };

    const handleUploadSuccess = () => {
        window.location.reload();
    };

    const handleAttachmentDeleted = (attachmentId) => {
        setAttachments((prev) => prev.filter((att) => att.id !== attachmentId));
    };

    const handleChecklistToggle = (item) => {
        if (!item?.id || updatingChecklistIds.includes(item.id)) return;

        const previousItems = checklistItems.map((existing) => ({ ...existing }));
        const nextItems = checklistItems.map((existing) => (
            existing.id === item.id
                ? { ...existing, is_completed: !existing.is_completed }
                : existing
        ));

        setChecklistItems(nextItems);
        setUpdatingChecklistIds((prev) => [...prev, item.id]);

        router.patch(`/todos/${todo.id}/checklist/${item.id}/toggle`, {}, {
            preserveScroll: true,
            preserveState: true,
            onError: () => setChecklistItems(previousItems),
            onFinish: () => setUpdatingChecklistIds((prev) => prev.filter((id) => id !== item.id)),
        });
    };

    const cleanedDescriptionMarkup = useMemo(() => {
        if (todo.description == null) return '';
        const raw = typeof todo.description === 'string' ? todo.description : String(todo.description);
        const trailingZeroPattern = /(?:\s|&nbsp;)*(?:<p[^>]*>\s*(?:&nbsp;|\s)*0(?:\s|&nbsp;)*<\/p>|<div[^>]*>\s*(?:&nbsp;|\s)*0(?:\s|&nbsp;)*<\/div>|(?:<br\s*\/?>(?:\s|&nbsp;)*)*0)(?:\s|&nbsp;)*$/gi;

        let next = raw.trim();
        let previous;
        do {
            previous = next;
            next = next.replace(trailingZeroPattern, '').trim();
        } while (next !== previous);

        return next;
    }, [todo.description]);

    const hasDescription = useMemo(() => {
        if (!cleanedDescriptionMarkup) return false;
        const plain = cleanedDescriptionMarkup.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').trim();
        return Boolean(plain);
    }, [cleanedDescriptionMarkup]);

    const formatTimestamp = useMemo(() => {
        const formatter = new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
        return (value) => {
            if (!value) return '';
            const d = new Date(value);
            return Number.isNaN(d.getTime()) ? '' : formatter.format(d);
        };
    }, []);

    const secondaryTags = useMemo(() => {
        const all = Array.isArray(todo.tags) ? todo.tags : [];
        return all.filter((t) => !String(t.name || '').toLowerCase().startsWith('proyek:'));
    }, [todo.tags]);

    const backHref = isNote ? '/notes' : '/todos';

    return (
        <AppLayout title={todo.title}>
            <Head title={`${todo.title} · ${isNote ? 'Note' : 'Task'}`} />
            <div className="w-full px-4 sm:px-6 py-4 space-y-4">
                {/* Top Breadcrumb & Calm Action Bar */}
                <div className="pb-3 border-b border-gray-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <Link
                            href={backHref}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Back to {isNote ? 'Notes' : 'Tasks'}
                        </Link>
                        <span className="text-gray-300 dark:text-slate-700">/</span>
                        <span className="text-xs font-medium text-gray-500 dark:text-slate-400 tabular-nums">
                            #{todo.id}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        {!isNote && (
                            <button
                                type="button"
                                onClick={handleToggle}
                                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                    todo.is_completed
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300'
                                        : 'border-gray-200 bg-white text-gray-800 hover:border-gray-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                                }`}
                            >
                                {todo.is_completed ? <CheckCircle className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                                {todo.is_completed ? 'Completed · Reopen' : 'Mark Complete'}
                            </button>
                        )}

                        {todo.is_completed && !isArchived && !isNote && (
                            <button
                                type="button"
                                onClick={() => openArchiveDialog('archive')}
                                disabled={archiveForm.processing || restoreForm.processing}
                                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-200 hover:border-gray-400 transition-colors"
                            >
                                <Archive className="w-3.5 h-3.5" />
                                Archive
                            </button>
                        )}

                        {todo.archived && !isNote && (
                            <button
                                type="button"
                                onClick={() => openArchiveDialog('restore')}
                                disabled={archiveForm.processing || restoreForm.processing}
                                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-200 hover:border-gray-400 transition-colors"
                            >
                                <Archive className="w-3.5 h-3.5" />
                                Restore
                            </button>
                        )}

                        {canUseCodingAgent && !isNote && !todo.is_completed && (
                            <Link
                                href={`/agent/jobs?todo_id=${todo.id}`}
                                className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/80 transition-colors"
                            >
                                <Bot className="w-3.5 h-3.5" />
                                Dispatch to Agent
                            </Link>
                        )}

                        <Link
                            href={`/todos/${todo.id}/edit`}
                            className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 dark:bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
                        >
                            <Edit className="w-3.5 h-3.5" />
                            Edit
                        </Link>

                        <button
                            type="button"
                            onClick={() => setShowDeleteModal(true)}
                            className="inline-flex items-center justify-center rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 text-gray-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400 transition-colors"
                            title={`Delete ${isNote ? 'note' : 'task'}`}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Full-Width 2-Column Document + Properties Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* Main Document Canvas (8 cols) */}
                    <article className="lg:col-span-8 space-y-5">
                        <div className="rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 sm:p-6 space-y-5">
                            <header className="space-y-2 pb-4 border-b border-gray-100 dark:border-slate-800">
                                <h1 className="text-xl font-semibold leading-snug text-gray-900 dark:text-white tracking-tight">
                                    {todo.title}
                                </h1>
                                <p className="text-xs text-gray-400 dark:text-slate-500">
                                    Created {formatTimestamp(todo.created_at)}
                                    {todo.updated_at ? ` · Updated ${formatTimestamp(todo.updated_at)}` : ''}
                                </p>
                            </header>

                            <section>
                                {hasDescription ? (
                                    <SanitizedHtml
                                        className="prose prose-sm sm:prose-base prose-gray max-w-none dark:prose-invert leading-relaxed"
                                        html={cleanedDescriptionMarkup}
                                    />
                                ) : (
                                    <div className="rounded-md border border-dashed border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/40 px-4 py-6 text-xs text-gray-500 dark:text-slate-400">
                                        No description provided yet. Click Edit to add context or documentation.
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* Interactive Checklist (always visible when items exist) */}
                        {checklistItems.length > 0 && (
                            <section className="rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h2 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-400">
                                        <ListChecks className="w-3.5 h-3.5" />
                                        Checklist
                                    </h2>
                                    <span className="text-xs font-medium text-gray-500 dark:text-slate-400 tabular-nums">
                                        {completedChecklistCount}/{checklistItems.length} completed
                                    </span>
                                </div>
                                <ul className="space-y-1.5">
                                    {checklistItems.map((item) => (
                                        <li key={item.id ?? item.title}>
                                            <button
                                                type="button"
                                                onClick={() => handleChecklistToggle(item)}
                                                disabled={!item.id || updatingChecklistIds.includes(item.id)}
                                                className={`flex w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                                                    item.is_completed
                                                        ? 'border-gray-200 bg-gray-50/70 text-gray-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400'
                                                        : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200'
                                                }`}
                                            >
                                                <Checkbox
                                                    checked={!!item.is_completed}
                                                    onChange={() => handleChecklistToggle(item)}
                                                    className="h-4 w-4"
                                                    disabled={!item.id || updatingChecklistIds.includes(item.id)}
                                                />
                                                <span>{item.title}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {/* Linked Zettelkasten Items & Attachments */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <section className="rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3">
                                <h2 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-400">
                                    <Link2 className="w-3.5 h-3.5" />
                                    Linked Notes & Tasks
                                </h2>
                                <TodoLinkManager
                                    todo={todo}
                                    availableTodos={availableTodos}
                                    onLink={handleLink}
                                    onUnlink={handleUnlink}
                                />
                            </section>

                            <section className="rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3">
                                <h2 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-400">
                                    <Paperclip className="w-3.5 h-3.5" />
                                    Attachments ({attachments.length})
                                </h2>
                                <FileUpload todoId={todo.id} onUploadSuccess={handleUploadSuccess} />
                                <AttachmentList attachments={attachments} onAttachmentDeleted={handleAttachmentDeleted} />
                            </section>
                        </div>
                    </article>

                    {/* Right Properties Sidebar (4 cols, sticky) */}
                    <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-4">
                        <section className="rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3">
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                Properties
                            </h2>

                            <dl className="divide-y divide-gray-100 dark:divide-slate-800/80 text-xs">
                                <div className="py-2 flex items-center justify-between gap-2">
                                    <dt className="text-gray-500 dark:text-slate-400">Type</dt>
                                    <dd className="inline-flex items-center gap-1 font-medium text-gray-900 dark:text-slate-200">
                                        {isNote ? <FileText className="w-3.5 h-3.5 text-gray-400" /> : null}
                                        {isNote ? 'Note' : 'Task'}
                                    </dd>
                                </div>

                                {!isNote && (
                                    <div className="py-2 flex items-center justify-between gap-2">
                                        <dt className="text-gray-500 dark:text-slate-400">Status</dt>
                                        <dd>
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                                    isArchived
                                                        ? 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300'
                                                        : todo.is_completed
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                                }`}
                                            >
                                                {isArchived ? 'Archived' : todo.is_completed ? 'Completed' : 'Open'}
                                            </span>
                                        </dd>
                                    </div>
                                )}

                                {canonicalProject && (
                                    <div className="py-2 flex items-center justify-between gap-2">
                                        <dt className="text-gray-500 dark:text-slate-400">Project</dt>
                                        <dd>
                                            <Link
                                                href={`${isNote ? '/notes' : '/todos'}?project=${canonicalProject.key}`}
                                                className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-slate-800 px-2.5 py-0.5 font-medium text-gray-800 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                                            >
                                                <span
                                                    className="h-2 w-2 rounded-full shrink-0"
                                                    style={{ backgroundColor: canonicalProject.color }}
                                                />
                                                {canonicalProject.label}
                                            </Link>
                                        </dd>
                                    </div>
                                )}

                                {!isNote && todo.priority && (
                                    <div className="py-2 flex items-center justify-between gap-2">
                                        <dt className="text-gray-500 dark:text-slate-400">Priority</dt>
                                        <dd>
                                            <span
                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                                    todo.priority === 'urgent'
                                                        ? 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300'
                                                        : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300'
                                                }`}
                                            >
                                                {formatPriorityText(todo.priority)}
                                            </span>
                                        </dd>
                                    </div>
                                )}

                                {!isNote && todo.importance && (
                                    <div className="py-2 flex items-center justify-between gap-2">
                                        <dt className="text-gray-500 dark:text-slate-400">Importance</dt>
                                        <dd className="font-medium text-gray-800 dark:text-slate-200">
                                            {formatPriorityText(todo.importance)}
                                        </dd>
                                    </div>
                                )}

                                {!isNote && todo.due_date && (
                                    <div className="py-2 flex items-center justify-between gap-2">
                                        <dt className="text-gray-500 dark:text-slate-400">Due Date</dt>
                                        <dd className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {new Date(`${todo.due_date}T00:00:00`).toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })}
                                        </dd>
                                    </div>
                                )}

                                {todo.focus && (
                                    <div className="py-2 space-y-1">
                                        <dt className="text-gray-500 dark:text-slate-400 inline-flex items-center gap-1">
                                            <Target className="w-3.5 h-3.5" />
                                            Focus
                                        </dt>
                                        <dd className="font-medium text-gray-800 dark:text-slate-200 leading-snug">
                                            {todo.focus.title}
                                        </dd>
                                    </div>
                                )}

                                {secondaryTags.length > 0 && (
                                    <div className="py-2 space-y-1.5">
                                        <dt className="text-gray-500 dark:text-slate-400">Tags</dt>
                                        <dd className="flex flex-wrap gap-1">
                                            {secondaryTags.map((tag) => (
                                                <Link
                                                    key={tag.id}
                                                    href={`${isNote ? '/notes' : '/todos'}?tag=${tag.id}`}
                                                    title={tag.name}
                                                    className="inline-flex items-center rounded-full border border-gray-200 dark:border-slate-700 px-2 py-0.5 text-[11px] text-gray-600 dark:text-slate-300 hover:border-gray-400 transition-colors"
                                                >
                                                    {splitTagName(tag.name).value}
                                                </Link>
                                            ))}
                                        </dd>
                                    </div>
                                )}

                                {todo.completed_at && (
                                    <div className="py-2 flex items-center justify-between gap-2">
                                        <dt className="text-gray-500 dark:text-slate-400">Completed</dt>
                                        <dd className="text-gray-700 dark:text-slate-300">
                                            {formatTimestamp(todo.completed_at)}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </section>

                        {statusEvents.length > 0 && (
                            <section className="rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3">
                                <h2 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                    <Clock className="w-3.5 h-3.5" />
                                    Status History
                                </h2>
                                <div className="space-y-2.5">
                                    {statusEvents.map((event) => (
                                        <div
                                            key={event.id}
                                            className="rounded-md border border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-900/40 px-3 py-2 text-xs space-y-1"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-gray-500 dark:text-slate-400">
                                                <span className="font-medium text-gray-700 dark:text-slate-200">
                                                    {event.from_state ?? 'open'} → {event.to_state}
                                                </span>
                                                <span>{event.created_at_human ?? ''}</span>
                                            </div>
                                            {event.reason && (
                                                <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                                                    {event.reason}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </aside>
                </div>

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
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={handleDeleteConfirm}
                    title={isNote ? 'Delete Note' : 'Delete Todo'}
                    message={`Are you sure you want to delete "${todo.title}"? This action cannot be undone.`}
                    confirmText={isNote ? 'Delete Note' : 'Delete Todo'}
                    confirmButtonVariant="destructive"
                    isLoading={deleteProcessing}
                />

                <form id="delete-todo-form" action={`/todos/${todo.id}`} method="POST" className="hidden">
                    <input type="hidden" name="_method" value="DELETE" />
                    <input type="hidden" name="_token" value={csrfToken || ''} />
                </form>
            </div>
        </AppLayout>
    );
}
