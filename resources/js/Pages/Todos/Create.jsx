import React, { useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { ZettlyEditor } from '@programinglive/zettly-editor';

import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../Components/ui/card';
import { Input } from '../../Components/ui/input';
import TagSelector from '../../Components/TagSelector';
import TodoSelector from '../../Components/TodoSelector';
import PrioritySelector from '../../Components/PrioritySelector';
import FormFileUpload from '../../Components/FormFileUpload';
import ChecklistEditor from '../../Components/ChecklistEditor';

export default function Create({ tags, todos, defaultType = 'todo' }) {
    const initialType = ['todo', 'note'].includes(defaultType) ? defaultType : 'todo';
    const { data, setData, post, processing, errors } = useForm({
        type: initialType,
        title: '',
        description: '',
        priority: initialType === 'note' ? null : 'not_urgent',
        importance: initialType === 'note' ? null : 'not_important',
        due_date: '',
        tag_ids: [],
        related_todo_ids: [],
        checklist_items: [],
    });

    const [attachmentFiles, setAttachmentFiles] = useState([]);

    const [debugEnabled, setDebugEnabled] = useState(false);

    const handleDebugEvent = React.useCallback((event) => {
        if (!debugEnabled) {
            return;
        }

        console.log('zettly debug event', event);
    }, [debugEnabled]);

    const isNote = data.type === 'note';

    const checklistErrors = Object.keys(errors)
        .filter((key) => key.startsWith('checklist_items'))
        .map((key) => errors[key]);

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Create FormData to handle file uploads
        const formData = new FormData();

        // Add CSRF token for Inertia FormData submissions
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
        if (csrfToken) {
            formData.append('_token', csrfToken);
        }

        formData.append('type', data.type);
        formData.append('title', data.title);
        formData.append('description', data.description);
        if (!isNote && data.priority && data.importance) {
            formData.append('priority', data.priority);
            formData.append('importance', data.importance);
        }
        if (!isNote && data.due_date) {
            formData.append('due_date', data.due_date);
        }
        
        // Append tag IDs
        data.tag_ids.forEach((tagId, index) => {
            formData.append(`tag_ids[${index}]`, tagId);
        });
        
        // Append related todo IDs
        data.related_todo_ids.forEach((todoId, index) => {
            formData.append(`related_todo_ids[${index}]`, todoId);
        });
        
        // Append checklist items
        (data.checklist_items || []).forEach((item, index) => {
            formData.append(`checklist_items[${index}][title]`, item.title ?? '');
            formData.append(`checklist_items[${index}][is_completed]`, item.is_completed ? '1' : '0');
            if (item.id) {
                formData.append(`checklist_items[${index}][id]`, item.id);
            }
        });

        // Append attachment files
        attachmentFiles.forEach((file, index) => {
            formData.append(`attachments[${index}]`, file);
        });

        post('/todos', {
            data: formData,
            forceFormData: true,
        });
    };

    const handleTagsChange = (tagIds) => {
        setData('tag_ids', tagIds);
    };

    const handleTodosChange = (todoIds) => {
        setData('related_todo_ids', todoIds);
    };

    const handlePriorityChange = (priority) => {
        setData('priority', priority?.priority ?? null);
        setData('importance', priority?.importance ?? null);
    };

    return (
        <AppLayout title={isNote ? 'Create Note' : 'Create Todo'}>
            <div className="max-w-3xl mx-auto px-4 py-6 md:py-10">
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg">
                    <CardHeader className="sticky top-0 z-50 space-y-4 border-b border-gray-200/60 bg-white/95 pb-6 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:border-gray-700/60 dark:bg-gray-900/80">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle className="text-2xl text-gray-900 dark:text-white">{isNote ? 'Create New Note' : 'Create New Todo'}</CardTitle>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Capture details, choose tags, and attach files to keep your work organized.</p>
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
                                    form="create-todo-form"
                                    disabled={processing}
                                    className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                                >
                                    {processing ? 'Creating…' : isNote ? 'Create Note' : 'Create Todo'}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 sm:p-8">
                        <form id="create-todo-form" onSubmit={handleSubmit} className="space-y-6">
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
                                    Tags
                                </label>
                                <TagSelector
                                    availableTags={tags}
                                    selectedTagIds={data.tag_ids}
                                    onTagsChange={handleTagsChange}
                                />
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
                                <p className="text-xs text-gray-400 dark:text-gray-500">Tip: Title and description are enough to create a todo.</p>
                            </div>

                            {!isNote && (
                                <>
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
                                </>
                            )}

                            <ChecklistEditor
                                items={data.checklist_items || []}
                                onChange={(items) => setData('checklist_items', items)}
                                errors={checklistErrors}
                            />

                            {todos && todos.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Link to Other Todos
                                    </label>
                                    <TodoSelector
                                        availableTodos={todos}
                                        selectedTodoIds={data.related_todo_ids}
                                        onTodosChange={handleTodosChange}
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Attachments
                                </label>
                                <FormFileUpload
                                    files={attachmentFiles}
                                    onFilesChange={setAttachmentFiles}
                                />
                            </div>

                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
