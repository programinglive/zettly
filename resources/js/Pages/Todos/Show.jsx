
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Edit, Trash2, CheckCircle, Circle, Calendar, User } from 'lucide-react';

import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../Components/ui/card';



export default function Show({ todo }) {
    const toggleForm = useForm();

    const handleToggle = () => {
        toggleForm.post(`/todos/${todo.id}/toggle`);
    };

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this todo?')) {
            // Handle delete - would need to implement this
        }
    };

    return (
        <AppLayout title={todo.title}>
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-2xl">{todo.title}</CardTitle>
                            <div className="flex space-x-2">
                                <Link href={`/todos/${todo.id}/edit`}>
                                    <Button variant="outline" size="sm">
                                        <Edit className="w-4 h-4 mr-1" />
                                        Edit
                                    </Button>
                                </Link>
                                <Link href="/todos">
                                    <Button variant="ghost" size="sm">
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back to Todos
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Status */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                Status
                            </h3>
                            <div className="flex items-center space-x-2">
                                {todo.is_completed ? (
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                ) : (
                                    <Circle className="w-5 h-5" />
                                )}
                                <span className={`text-sm font-medium ${
                                    todo.is_completed ? 'text-green-600' : 'text-muted-foreground'
                                }`}>
                                    {todo.is_completed ? 'Completed' : 'Pending'}
                                </span>
                            </div>
                            {todo.is_completed && todo.completed_at && (
                                <p className="text-sm text-muted-foreground">
                                    Completed on {new Date(todo.completed_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit'
                                    })}
                                </p>
                            )}
                        </div>

                        {/* Description */}
                        {todo.description && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                    Description
                                </h3>
                                <p className="text-foreground whitespace-pre-wrap">{todo.description}</p>
                            </div>
                        )}

                        {/* Timeline */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                Timeline
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                                    <Calendar className="w-4 h-4" />
                                    <span>
                                        Created on {new Date(todo.created_at).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: 'numeric',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                                <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                                    <User className="w-4 h-4" />
                                    <span>Assigned to {todo.user.name} ({todo.user.email})</span>
                                </div>
                                {todo.updated_at !== todo.created_at && (
                                    <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                                        <Edit className="w-4 h-4" />
                                        <span>
                                            Last updated on {new Date(todo.updated_at).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: 'numeric',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-4 border-t">
                            <div className="flex space-x-3">
                                <Button
                                    onClick={handleToggle}
                                    variant={todo.is_completed ? "secondary" : "default"}
                                >
                                    {todo.is_completed ? (
                                        <>
                                            <Circle className="w-4 h-4 mr-2" />
                                            Mark as Pending
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Mark as Completed
                                        </>
                                    )}
                                </Button>

                                <Button
                                    variant="destructive"
                                    onClick={handleDelete}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Todo
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
