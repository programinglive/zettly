import React, { useState } from 'react';
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

export default function Show({ todo, availableTodos }) {
    const { delete: destroy } = useForm();
    const toggleForm = useForm();
    const linkForm = useForm();
    const unlinkForm = useForm();

    // Confirmation modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [attachments, setAttachments] = useState(todo.attachments || []);

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

    return (
        <AppLayout title={todo.title}>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                        <Link href="/todos">
                            <Button variant="outline" size="sm" className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Todos
                            </Button>
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Todo Details</h1>
                    </div>
                    <div className="flex items-center space-x-3">
                        <Link href={`/todos/${todo.id}/edit`}>
                            <Button variant="outline" className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                            </Button>
                        </Link>
                        <Button variant="destructive" onClick={handleDeleteClick} className="bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-800 text-white border-red-600 dark:border-red-700">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Main Content */}
                    <div className="lg:col-span-2">
                        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className={`text-2xl ${todo.is_completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                            {todo.title}
                                        </CardTitle>
                                        <div className="flex items-center gap-3 mt-2">
                                            <button
                                                onClick={handleToggle}
                                                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                                    todo.is_completed
                                                        ? 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700'
                                                        : 'bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-700'
                                                }`}
                                            >
                                                {todo.is_completed ? (
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                ) : (
                                                    <Circle className="w-4 h-4 mr-1" />
                                                )}
                                                {todo.is_completed ? 'Completed' : 'Pending'}
                                            </button>
                                            
                                            {/* Priority Badge */}
                                            {todo.priority && (
                                                <span
                                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                                                    style={{ 
                                                        backgroundColor: todo.priority === 'low' ? '#10B981' : 
                                                                        todo.priority === 'medium' ? '#F59E0B' : 
                                                                        todo.priority === 'high' ? '#EF4444' : 
                                                                        todo.priority === 'urgent' ? '#DC2626' : '#6B7280'
                                                    }}
                                                >
                                                    {todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)} Priority
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {todo.description ? (
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Description</h3>
                                        <div className="prose dark:prose-invert max-w-none">
                                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                                {todo.description}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="text-gray-400 dark:text-gray-600 text-4xl mb-2">📝</div>
                                        <p className="text-gray-500 dark:text-gray-400">No description provided</p>
                                    </div>
                                )}

                                {/* Tags */}
                                {todo.tags && todo.tags.length > 0 && (
                                    <div className="mt-6">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Tags</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {todo.tags.map(tag => (
                                                <TagBadge key={tag.id} tag={tag} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Linked Todos */}
                                <div className="mt-6">
                                    <TodoLinkManager
                                        todo={todo}
                                        availableTodos={availableTodos}
                                        onLink={handleLink}
                                        onUnlink={handleUnlink}
                                    />
                                </div>

                                {/* Attachments */}
                                <div className="mt-6">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Attachments</h3>
                                    
                                    {/* File Upload */}
                                    <div className="mb-4">
                                        <FileUpload 
                                            todoId={todo.id}
                                            onUploadSuccess={handleUploadSuccess}
                                        />
                                    </div>

                                    {/* Attachment List */}
                                    <AttachmentList 
                                        attachments={attachments}
                                        onAttachmentDeleted={handleAttachmentDeleted}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Status Card */}
                        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-lg text-gray-900 dark:text-white">Status</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Current Status</span>
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        todo.is_completed
                                            ? 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700'
                                            : 'bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-700'
                                    }`}>
                                        {todo.is_completed ? 'Completed' : 'Pending'}
                                    </span>
                                </div>
                                
                                {/* Priority Status */}
                                {todo.priority && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Priority</span>
                                        <span
                                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                                            style={{ 
                                                backgroundColor: todo.priority === 'low' ? '#10B981' : 
                                                                todo.priority === 'medium' ? '#F59E0B' : 
                                                                todo.priority === 'high' ? '#EF4444' : 
                                                                todo.priority === 'urgent' ? '#DC2626' : '#6B7280'
                                            }}
                                        >
                                            {todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}
                                        </span>
                                    </div>
                                )}
                                <Button 
                                    onClick={handleToggle}
                                    className={`w-full ${todo.is_completed ? 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600' : 'bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-800 text-white'}`}
                                    variant={todo.is_completed ? "outline" : "default"}
                                >
                                    {todo.is_completed ? (
                                        <>
                                            <Circle className="w-4 h-4 mr-2" />
                                            Mark as Pending
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Mark as Complete
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Details Card */}
                        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-lg text-gray-900 dark:text-white">Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center space-x-3">
                                    <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">Created</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {new Date(todo.created_at).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center space-x-3">
                                    <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">Last Updated</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {new Date(todo.updated_at).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                </div>

                                {todo.user && (
                                    <div className="flex items-center space-x-3">
                                        <User className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">Owner</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{todo.user.name}</p>
                                        </div>
                                    </div>
                                )}

                                {todo.is_completed && todo.completed_at && (
                                    <div className="flex items-center space-x-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                                        <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">Completed</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {new Date(todo.completed_at).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Actions Card */}
                        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-lg text-gray-900 dark:text-white">Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Link href={`/todos/${todo.id}/edit`} className="block">
                                    <Button variant="outline" className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit Todo
                                    </Button>
                                </Link>
                                <Button variant="destructive" onClick={handleDeleteClick} className="w-full bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-800 text-white border-red-600 dark:border-red-700">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Todo
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={handleDeleteCancel}
                onConfirm={handleDeleteConfirm}
                title="Delete Todo"
                message={`Are you sure you want to delete "${todo.title}"? This action cannot be undone.`}
                confirmText="Delete Todo"
                confirmButtonVariant="destructive"
                isLoading={destroy.processing}
            />
        </AppLayout>
    );
}
