import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../Components/ui/card';
import { Input } from '../../Components/ui/input';
import { Textarea } from '../../Components/ui/textarea';
import { Checkbox } from '../../Components/ui/checkbox';



export default function Edit({ todo }) {
    const { data, setData, put, processing, errors } = useForm({
        title: todo.title,
        description: todo.description || '',
        is_completed: todo.is_completed,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        put(`/todos/${todo.id}`);
    };

    return (
        <AppLayout title={`Edit ${todo.title}`}>
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-2xl">Edit Todo</CardTitle>
                            <Link href="/todos">
                                <Button variant="ghost" size="sm">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back to Todos
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="title" className="text-sm font-medium text-foreground">
                                    Title <span className="text-destructive">*</span>
                                </label>
                                <Input
                                    id="title"
                                    type="text"
                                    placeholder="Enter todo title..."
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    className={errors.title ? 'border-destructive' : ''}
                                />
                                {errors.title && (
                                    <p className="text-sm text-destructive">{errors.title}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="description" className="text-sm font-medium text-foreground">
                                    Description
                                </label>
                                <Textarea
                                    id="description"
                                    placeholder="Enter todo description..."
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={4}
                                    className={errors.description ? 'border-destructive' : ''}
                                />
                                {errors.description && (
                                    <p className="text-sm text-destructive">{errors.description}</p>
                                )}
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="is_completed"
                                    checked={data.is_completed}
                                    onCheckedChange={(checked) => setData('is_completed', !!checked)}
                                />
                                <label
                                    htmlFor="is_completed"
                                    className="text-sm font-medium text-foreground cursor-pointer"
                                >
                                    Mark as completed
                                </label>
                            </div>

                            <div className="flex items-center justify-end space-x-4 pt-4 border-t">
                                <Link href="/todos">
                                    <Button type="button" variant="outline">
                                        Cancel
                                    </Button>
                                </Link>
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Updating...' : 'Update Todo'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
