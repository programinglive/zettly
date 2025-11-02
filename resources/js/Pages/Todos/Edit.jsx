import React, { useEffect, useState } from 'react';
import { Link, useForm, router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { ZettlyEditor } from '@programinglive/zettly-editor';

import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../Components/ui/card';
import { Input } from '../../Components/ui/input';
import { Checkbox } from '../../Components/ui/checkbox';
import TagSelector from '../../Components/TagSelector';
import TodoSelector from '../../Components/TodoSelector';
import PrioritySelector from '../../Components/PrioritySelector';
import FormFileUpload from '../../Components/FormFileUpload';
import AttachmentList from '../../Components/AttachmentList';
import ChecklistEditor from '../../Components/ChecklistEditor';

export default function Edit({ todo, tags, todos, linkedTodoIds = [], selectedLinkedTodos = [] }) {
    // Build initial linked ids from both directions (supports camelCase and snake_case)
    const relatedList = (todo.relatedTodos || todo.related_todos || []);
    const linkedByList = (todo.linkedByTodos || todo.linked_by_todos || []);
    const initialLinkedIds = Array.from(new Set([
        ...relatedList.map(t => t.id),
        ...linkedByList.map(t => t.id),
    ]));

    const initialType = ['todo', 'note'].includes(todo.type) ? todo.type : 'todo';
    const { data, setData, put, processing, errors } = useForm({
        type: initialType,
        title: todo.title || '',
        description: todo.description || '',
        priority: initialType === 'note' ? null : (todo.priority ?? null),
        importance: initialType === 'note' ? null : (todo.importance ?? null),
        is_completed: todo.is_completed || false,
        due_date: initialType === 'note' ? '' : (todo.due_date ?? ''),
        tag_ids: (todo.tags || []).map(tag => tag.id),
        related_todo_ids: (linkedTodoIds.length ? linkedTodoIds : initialLinkedIds),
        checklist_items: (todo.checklistItems || todo.checklist_items || []).map((item, index) => ({
            id: item.id ?? null,
            title: item.title ?? '',
            is_completed: !!item.is_completed,
            position: item.position ?? index,
        })),
    });

    const [attachmentFiles, setAttachmentFiles] = useState([]);
    const [existingAttachments, setExistingAttachments] = useState(todo.attachments || []);
    const [debugEnabled, setDebugEnabled] = useState(false);

    const handleDebugEvent = React.useCallback((event) => {
        if (!debugEnabled) {
            return;
        }

        console.log('zettly debug event', {
            ...event,
            context: {
                todoId: todo?.id ?? null,
                type: todo?.type ?? null,
            },
        });
    }, [debugEnabled, todo?.id, todo?.type]);
    const isNote = data.type === 'note';

    const checklistErrors = Object.keys(errors)
        .filter((key) => key.startsWith('checklist_items'))
        .map((key) => errors[key]);

    // Keep selection in sync if server props change (navigating back to edit, linking elsewhere, etc.)
    useEffect(() => {
        const nextIds = (linkedTodoIds && linkedTodoIds.length)
            ? linkedTodoIds
            : initialLinkedIds;
        setData(prev => ({ ...prev, related_todo_ids: nextIds }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(linkedTodoIds), JSON.stringify(initialLinkedIds)]);

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Always send multipart/form-data via POST + _method=PUT
        const formData = new FormData();
        formData.append('_method', 'PUT');
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
        if (csrfToken) {
            formData.append('_token', csrfToken);
        }
        formData.append('type', data.type);
        formData.append('title', (data.title || '').trim());
        formData.append('description', data.description || '');
        if (!isNote && data.priority && data.importance) {
            formData.append('priority', data.priority);
            formData.append('importance', data.importance);
        }
        if (!isNote && data.due_date) {
            formData.append('due_date', data.due_date);
        }
        formData.append('is_completed', data.is_completed ? '1' : '0');

        // Arrays
        (data.tag_ids || []).forEach((id) => formData.append('tag_ids[]', id));
        (data.related_todo_ids || []).forEach((id) => formData.append('related_todo_ids[]', id));

        // Checklist items
        (data.checklist_items || []).forEach((item, index) => {
            formData.append(`checklist_items[${index}][title]`, item.title ?? '');
            formData.append(`checklist_items[${index}][is_completed]`, item.is_completed ? '1' : '0');
            if (item.id) {
                formData.append(`checklist_items[${index}][id]`, item.id);
            }
        });

        // Files (may be zero and that's fine)
        attachmentFiles.forEach((file) => formData.append('attachments[]', file));

        router.post(`/todos/${todo.id}`, formData, {
            preserveScroll: true,
            onSuccess: () => {
                setAttachmentFiles([]);
            },
            onError: (errors) => {
                // Error handling via Inertia
            }
        });
    };

    const handleAttachmentDeleted = (attachmentId) => {
        setExistingAttachments(prev => prev.filter(att => att.id !== attachmentId));
    };

    const handleTagsChange = (tagIds) => {
        setData('tag_ids', tagIds);
    };

    const handleTodosChange = (todoIds) => {
        setData('related_todo_ids', todoIds);
    };

    const handlePriorityChange = (selection) => {
        setData('priority', selection?.priority ?? null);
        setData('importance', selection?.importance ?? null);
    };

    return (
        <AppLayout title={`Edit ${todo.title}`}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-6 md:py-10">
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg">
                    <CardHeader className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/95 pb-6 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:border-gray-700/60 dark:bg-gray-900/80 lg:px-10 lg:py-8">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between lg:gap-10">
                            <div className="space-y-3 lg:max-w-3xl">
                                <CardTitle className="text-2xl text-gray-900 dark:text-white md:text-3xl">{isNote ? 'Edit Note' : 'Edit Todo'}</CardTitle>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Update details, adjust priorities, and keep related tasks in sync.</p>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                <Link
                                    href={isNote ? '/notes' : '/todos'}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:text-white"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back
                                </Link>
                                <Button
                                    type="submit"
                                    form="edit-todo-form"
                                    disabled={processing}
                                    className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                                >
                                    {processing ? 'Updating…' : isNote ? 'Update Note' : 'Update Todo'}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 sm:p-8 lg:px-10 lg:py-10">
                        <form id="edit-todo-form" onSubmit={handleSubmit} className="space-y-6 lg:space-y-8">
                            <div className="lg:grid lg:grid-cols-12 lg:gap-8">
                                <div className="space-y-6 lg:col-span-8">
                                    <div className="space-y-2">
                                        <label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Title <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            id="title"
                                            type="text"
                                            placeholder="Enter todo title..."
                                            value={data.title}
                                            onChange={(e) => setData('title', e.target.value)}
                                            className={`bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${errors.title ? 'border-red-500' : ''}`}
                                        />
                                        {errors.title && (
                                            <p className="text-sm text-red-600 dark:text-red-400">{errors.title}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Description
                                        </label>
                                        <div className="rounded-xl border border-transparent">
                                            <ZettlyEditor
                                                value={data.description || ''}
                                                onChange={(value) => setData('description', value)}
                                                debug={debugEnabled}
                                                onDebugToggle={setDebugEnabled}
                                                onDebugEvent={handleDebugEvent}
                                            />
                                        </div>
                                        {errors.description && (
                                            <p className="text-sm text-red-600 dark:text-red-400">{errors.description}</p>
                                        )}
                                        <p className="text-xs text-gray-400 dark:text-gray-500">Tip: Title and description are enough to update this entry.</p>
                                    </div>

                                    {todos && todos.length > 0 && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Link to Other Todos
                                            </label>
                                            <TodoSelector
                                                availableTodos={todos}
                                                selectedTodoIds={data.related_todo_ids}
                                                selectedTodosData={(selectedLinkedTodos && selectedLinkedTodos.length) ? selectedLinkedTodos : (() => {
                                                    const merge = [...relatedList, ...linkedByList];
                                                    const map = new Map();
                                                    merge.forEach(t => map.set(t.id, t));
                                                    return Array.from(map.values());
                                                })()}
                                                onTodosChange={handleTodosChange}
                                            />
                                        </div>
                                    )}

                                    <ChecklistEditor
                                        items={data.checklist_items || []}
                                        onChange={(items) => setData('checklist_items', items)}
                                        errors={checklistErrors}
                                    />

                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="is_completed"
                                            checked={data.is_completed}
                                            onChange={(e) => setData('is_completed', e.target.checked)}
                                            className="border-gray-300 dark:border-gray-600"
                                        />
                                        <label
                                            htmlFor="is_completed"
                                            className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                                        >
                                            Mark as completed
                                        </label>
                                    </div>

                                    {existingAttachments.length > 0 && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Current Attachments
                                            </label>
                                            <AttachmentList
                                                attachments={existingAttachments}
                                                onAttachmentDeleted={handleAttachmentDeleted}
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Add New Attachments
                                        </label>
                                        <FormFileUpload
                                            files={attachmentFiles}
                                            onFilesChange={setAttachmentFiles}
                                        />
                                    </div>
                                </div>

                                <div className="mt-6 space-y-6 lg:col-span-4 lg:mt-0">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Tags
                                        </label>
                                        <TagSelector
                                            availableTags={tags}
                                            selectedTagIds={data.tag_ids}
                                            onTagsChange={handleTagsChange}
                                        />
                                    </div>

                                    {!isNote && (
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label htmlFor="due_date" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Due Date
                                                </label>
                                                <Input
                                                    id="due_date"
                                                    type="date"
                                                    min={new Date().toISOString().slice(0, 10)}
                                                    value={data.due_date || ''}
                                                    onChange={(e) => setData('due_date', e.target.value)}
                                                    className={`bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white ${errors.due_date ? 'border-red-500' : ''}`}
                                                />
                                                {errors.due_date && (
                                                    <p className="text-sm text-red-600 dark:text-red-400">{errors.due_date}</p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Priority
                                                </label>
                                                <PrioritySelector
                                                    selectedPriority={data.priority}
                                                    selectedImportance={data.importance}
                                                    onChange={handlePriorityChange}
                                                    error={errors.priority || errors.importance}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
