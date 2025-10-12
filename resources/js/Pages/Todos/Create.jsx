import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../Components/ui/card';
import { Input } from '../../Components/ui/input';
import { Textarea } from '../../Components/ui/textarea';
import TagSelector from '../../Components/TagSelector';
import TodoSelector from '../../Components/TodoSelector';
import PrioritySelector from '../../Components/PrioritySelector';
import FormFileUpload from '../../Components/FormFileUpload';
import ChecklistEditor from '../../Components/ChecklistEditor';

export default function Create({ tags, todos }) {
    const { data, setData, post, processing, errors } = useForm({
        title: '',
        description: '',
        priority: 'medium',
        tag_ids: [],
        related_todo_ids: [],
        checklist_items: [],
    });

    const [attachmentFiles, setAttachmentFiles] = useState([]);

    const checklistErrors = Object.keys(errors)
        .filter((key) => key.startsWith('checklist_items'))
        .map((key) => errors[key]);

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Create FormData to handle file uploads
        const formData = new FormData();
        formData.append('title', data.title);
        formData.append('description', data.description);
        formData.append('priority', data.priority);
        
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
        setData('priority', priority);
    };

    return (
        <AppLayout title="Create Todo">
            <div className="max-w-7xl mx-auto">
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-2xl text-gray-900 dark:text-white">Create New Todo</CardTitle>
                            <Link href="/todos">
                                <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back to Todos
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
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
                                <label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Description
                                </label>
                                <Textarea
                                    id="description"
                                    placeholder="Enter todo description..."
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={4}
                                    className={`bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${errors.description ? 'border-red-500' : ''}`}
                                />
                                {errors.description && (
                                    <p className="text-sm text-red-600 dark:text-red-400">{errors.description}</p>
                                )}
                            </div>

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

                            <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <Link href="/todos">
                                    <Button type="button" variant="outline" className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        Cancel
                                    </Button>
                                </Link>
                                <Button type="submit" disabled={processing} className="bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-800 text-white">
                                    {processing ? 'Creating...' : 'Create Todo'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
