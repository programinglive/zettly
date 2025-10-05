import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { CheckCircle, Circle, Plus, Eye, Edit, Trash2 } from 'lucide-react';

import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../Components/ui/card';

export default function Index({ todos, filter }) {
    const toggleForm = useForm();

    const handleToggle = (todo) => {
        toggleForm.post(`/todos/${todo.id}/toggle`);
    };

    const getFilteredTodos = () => {
        if (!filter || filter === 'all') return todos;
        return todos.filter(todo =>
            filter === 'completed' ? todo.is_completed : !todo.is_completed
        );
    };

    const filteredTodos = getFilteredTodos();

    return (
        <AppLayout title="Todos">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-foreground">My Todos</h1>
                    <Link href="/todos/create">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            New Todo
                        </Button>
                    </Link>
                </div>

                {/* Filters */}
                <div className="flex space-x-2">
                    {[
                        { key: null, label: 'All' },
                        { key: 'pending', label: 'Pending' },
                        { key: 'completed', label: 'Completed' },
                    ].map(({ key, label }) => (
                        <Link
                            key={key || 'all'}
                            href={key ? `/todos?filter=${key}` : '/todos'}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                filter === key
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                            }`}
                        >
                            {label}
                        </Link>
                    ))}
                </div>

                {/* Todos List */}
                {filteredTodos.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredTodos.map((todo) => (
                            <Card key={todo.id} className={todo.is_completed ? 'opacity-75' : ''}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <CardTitle className={`text-lg ${todo.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                                            {todo.title}
                                        </CardTitle>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleToggle(todo)}
                                            className="p-1 h-8 w-8"
                                        >
                                            {todo.is_completed ? (
                                                <CheckCircle className="w-5 h-5 text-green-500" />
                                            ) : (
                                                <Circle className="w-5 h-5" />
                                            )}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {todo.description && (
                                        <p className="text-sm text-muted-foreground">
                                            {todo.description}
                                        </p>
                                    )}

                                    <div className="text-xs text-muted-foreground space-y-1">
                                        <div>Created: {new Date(todo.created_at).toLocaleDateString()}</div>
                                        {todo.is_completed && todo.completed_at && (
                                            <div className="text-green-600">
                                                ✓ Completed: {new Date(todo.completed_at).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex space-x-2 pt-2">
                                        <Link href={`/todos/${todo.id}`}>
                                            <Button variant="outline" size="sm">
                                                <Eye className="w-4 h-4 mr-1" />
                                                View
                                            </Button>
                                        </Link>
                                        <Link href={`/todos/${todo.id}/edit`}>
                                            <Button variant="outline" size="sm">
                                                <Edit className="w-4 h-4 mr-1" />
                                                Edit
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => {
                                                if (confirm('Are you sure you want to delete this todo?')) {
                                                    // Handle delete
                                                }
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            Delete
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="text-center py-12">
                            <div className="text-6xl mb-4">📝</div>
                            <h3 className="text-lg font-medium text-foreground mb-2">No todos yet</h3>
                            <p className="text-muted-foreground mb-6">
                                Get started by creating your first todo item.
                            </p>
                            <Link href="/todos/create">
                                <Button>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Your First Todo
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
