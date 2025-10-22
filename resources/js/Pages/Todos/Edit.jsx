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
        priority: initialType === 'note' ? null : (todo.priority || 'medium'),
        is_completed: todo.is_completed || false,
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
        formData.append('type', data.type);
        formData.append('title', (data.title || '').trim());
        formData.append('description', data.description || '');
        if (!isNote && data.priority) {
            formData.append('priority', data.priority);
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

    const handlePriorityChange = (priority) => {
        setData('priority', priority);
    };

    const handleTypeChange = (type) => {
        setData('type', type);
        if (type === 'note') {
            setData('priority', null);
            if (data.is_completed && todo.type !== 'note') {
                // allow keep completion
            }
        } else if (!data.priority) {
            setData('priority', todo.priority || 'medium');
        }
    };

    return (
        <AppLayout title={`Edit ${todo.title}`}>
            <div className="max-w-7xl mx-auto">
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-2xl text-gray-900 dark:text-white">{isNote ? 'Edit Note' : 'Edit Todo'}</CardTitle>
                            <Link href={isNote ? '/todos?type=note' : '/todos'}>
                                <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back to {isNote ? 'Notes' : 'Todos'}
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Type
                                </label>
                                <div className="flex rounded-md bg-gray-100 dark:bg-gray-800 p-1 w-fit">
                                    {[{ value: 'todo', label: 'Todo' }, { value: 'note', label: 'Note' }].map(option => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => handleTypeChange(option.value)}
                                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                                data.type === option.value
                                                    ? 'bg-black text-white dark:bg-white dark:text-black'
                                                    : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
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
                            </div>

                            {!isNote && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Priority
                                    </label>
                                    <PrioritySelector
                                        selectedPriority={data.priority}
                                        onPriorityChange={handlePriorityChange}
                                        error={errors.priority}
                                    />
                                </div>
                            )}

                            <ChecklistEditor
                                items={data.checklist_items || []}
                                onChange={(items) => setData('checklist_items', items)}
                                errors={checklistErrors}
                            />

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

                            {/* Existing Attachments */}
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

                            {/* New Attachments */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Add New Attachments
                                </label>
                                <FormFileUpload
                                    files={attachmentFiles}
                                    onFilesChange={setAttachmentFiles}
                                />
                            </div>

                            <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <Link href={isNote ? '/todos?type=note' : '/todos'}>
                                    <Button type="button" variant="outline" className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        Cancel
                                    </Button>
                                </Link>
                                <Button type="submit" disabled={processing} className="bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-800 text-white">
                                    {processing ? 'Updating...' : isNote ? 'Update Note' : 'Update Todo'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
