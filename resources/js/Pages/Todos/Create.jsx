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

const normalizeDateForInput = (value) => {
    if (!value) return '';

    if (typeof value === 'string') {
        const directMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
        if (directMatch) {
            return directMatch[0];
        }

        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toISOString().slice(0, 10);
        }

        return '';
    }

    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }

    if (typeof value === 'object' && value !== null) {
        try {
            const parsed = new Date(value);
            if (!Number.isNaN(parsed.getTime())) {
                return parsed.toISOString().slice(0, 10);
            }
        } catch (error) {
            return '';
        }
    }

    return '';
};

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

        formData.append('type', data.type);
        formData.append('title', data.title);
        formData.append('description', data.description);
        if (!isNote && data.priority && data.importance) {
            formData.append('priority', data.priority);
            formData.append('importance', data.importance);
        }
        if (!isNote && data.due_date) {
            formData.append('due_date', normalizeDateForInput(data.due_date));
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
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                    <div className="flex-1">
                        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white leading-[1.1] tracking-tight">
                            {isNote ? 'Create Note' : 'Create Todo'}
                        </h1>
                        <p className="mt-4 text-xl text-gray-500 dark:text-gray-400 font-light leading-relaxed max-w-2xl">
                            Capture details, choose tags, and attach files to keep your work organized.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href={isNote ? '/notes' : '/todos'}>
                            <Button variant="outline" className="rounded-full px-6 transition-all hover:bg-gray-100 dark:hover:bg-slate-800">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </Button>
                        </Link>
                        <Button
                            type="submit"
                            form="create-todo-form"
                            disabled={processing}
                            className="rounded-full px-8 bg-gray-900 text-white hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-all shadow-lg"
                        >
                            {processing ? 'Creating...' : isNote ? 'Create Note' : 'Create Todo'}
                        </Button>
                    </div>
                </div>

                <Card className="bg-white dark:bg-gray-900/40 border-gray-100 dark:border-gray-800 shadow-sm rounded-[2.5rem] overflow-hidden">
                    <CardContent className="p-8 sm:p-12 lg:p-16">
                        <form id="create-todo-form" onSubmit={handleSubmit} className="space-y-6 lg:space-y-8">
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
                                        <p className="text-xs text-gray-400 dark:text-gray-500">Tip: Title and description are enough to create a todo.</p>
                                    </div>

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

                                    <ChecklistEditor
                                        items={data.checklist_items || []}
                                        onChange={(items) => setData('checklist_items', items)}
                                        errors={checklistErrors}
                                    />

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Attachments
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
