import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../Components/ui/card';
import { Input } from '../../Components/ui/input';
import { Textarea } from '../../Components/ui/textarea';

export default function Create({ users }) {
    const { data, setData, post, processing, errors } = useForm({
        title: '',
        description: '',
        user_id: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post('/todos');
    };

    return (
        <AppLayout title="Create Todo">
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-2xl">Create New Todo</CardTitle>
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

                            <div className="space-y-2">
                                <label htmlFor="user_id" className="text-sm font-medium text-foreground">
                                    Assign to User <span className="text-destructive">*</span>
                                </label>
                                <select
                                    id="user_id"
                                    value={data.user_id}
                                    onChange={(e) => setData('user_id', e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="">Select a user...</option>
                                    {users.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name} ({user.email})
                                        </option>
                                    ))}
                                </select>
                                {errors.user_id && (
                                    <p className="text-sm text-destructive">{errors.user_id}</p>
                                )}
                            </div>

                            <div className="flex items-center justify-end space-x-4 pt-4 border-t">
                                <Link href="/todos">
                                    <Button type="button" variant="outline">
                                        Cancel
                                    </Button>
                                </Link>
                                <Button type="submit" disabled={processing}>
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
