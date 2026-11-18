import React, { useState } from 'react';
import axios from 'axios';
import { Sparkles, Check, X } from 'lucide-react';
import { Button } from './ui/button';

export default function AiTodoTriageCard({
    todoId,
    initialUpdatedAt,
    availableTodos = [],
    onApplied,
}) {
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [error, setError] = useState(null);
    const [draft, setDraft] = useState(null);
    const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(initialUpdatedAt || '');

    const todoTitleMap = new Map(availableTodos.map((t) => [Number(t.id), t.title]));

    const handleSuggest = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await axios.post(`/todos/${todoId}/ai-triage`);
            const suggestions = response.data?.suggestions || {};

            setExpectedUpdatedAt(response.data?.todo_updated_at || initialUpdatedAt || '');
            setDraft({
                priority: suggestions.priority || '',
                importance: suggestions.importance || '',
                due_date: suggestions.due_date || '',
                dependency_todo_ids: Array.isArray(suggestions.dependency_todo_ids)
                    ? suggestions.dependency_todo_ids
                    : [],
                rationale: suggestions.rationale || '',
                confidence: suggestions.confidence ?? null,
                model: response.data?.model || '',
            });
        } catch (err) {
            setError(err?.response?.data?.error || 'Failed to fetch AI triage suggestions.');
        } finally {
            setLoading(false);
        }
    };

    const handleReject = () => {
        setDraft(null);
        setError(null);
    };

    const handleToggleDependency = (depId) => {
        setDraft((prev) => {
            if (!prev) return prev;
            const exists = prev.dependency_todo_ids.includes(depId);
            return {
                ...prev,
                dependency_todo_ids: exists
                    ? prev.dependency_todo_ids.filter((id) => id !== depId)
                    : [...prev.dependency_todo_ids, depId],
            };
        });
    };

    const handleAccept = async () => {
        if (!draft) return;
        setApplying(true);
        setError(null);

        try {
            const response = await axios.post(`/todos/${todoId}/ai-triage/apply`, {
                expected_updated_at: expectedUpdatedAt,
                priority: draft.priority || null,
                importance: draft.importance || null,
                due_date: draft.due_date || null,
                dependency_todo_ids: draft.dependency_todo_ids,
            });

            const updated = response.data?.todo;
            if (updated?.updated_at) {
                setExpectedUpdatedAt(updated.updated_at);
            }
            if (typeof onApplied === 'function' && updated) {
                onApplied(updated);
            }
            setDraft(null);
        } catch (err) {
            setError(err?.response?.data?.error || 'Failed to apply AI triage suggestions.');
        } finally {
            setApplying(false);
        }
    };

    return (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        AI Triage Assistant
                    </span>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSuggest}
                    disabled={loading || applying}
                    className="text-xs"
                >
                    {loading ? 'Analyzing…' : 'Suggest with AI'}
                </Button>
            </div>

            {error && (
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            )}

            {draft && (
                <div className="space-y-3 pt-2 border-t border-indigo-200/70 dark:border-indigo-800/40 text-xs">
                    {draft.rationale && (
                        <p className="text-gray-700 dark:text-gray-300">
                            <span className="font-medium">Rationale:</span> {draft.rationale}
                        </p>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-gray-600 dark:text-gray-400 mb-1">Urgency</label>
                            <select
                                value={draft.priority}
                                onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
                                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-xs"
                            >
                                <option value="">Unset</option>
                                <option value="urgent">Urgent</option>
                                <option value="not_urgent">Not Urgent</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-600 dark:text-gray-400 mb-1">Importance</label>
                            <select
                                value={draft.importance}
                                onChange={(e) => setDraft({ ...draft, importance: e.target.value })}
                                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-xs"
                            >
                                <option value="">Unset</option>
                                <option value="important">Important</option>
                                <option value="not_important">Not Important</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-600 dark:text-gray-400 mb-1">Due Date</label>
                        <input
                            type="date"
                            value={draft.due_date}
                            onChange={(e) => setDraft({ ...draft, due_date: e.target.value })}
                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-xs"
                        />
                    </div>

                    {draft.dependency_todo_ids.length > 0 && (
                        <div className="space-y-1">
                            <span className="block text-gray-600 dark:text-gray-400">Suggested Blockers:</span>
                            {draft.dependency_todo_ids.map((depId) => (
                                <label key={depId} className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                                    <input
                                        type="checkbox"
                                        checked={draft.dependency_todo_ids.includes(depId)}
                                        onChange={() => handleToggleDependency(depId)}
                                    />
                                    <span>{todoTitleMap.get(Number(depId)) || `Todo #${depId}`}</span>
                                </label>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleReject}
                            disabled={applying}
                            className="text-xs"
                        >
                            <X className="w-3.5 h-3.5 mr-1" />
                            Reject
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleAccept}
                            disabled={applying}
                            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            <Check className="w-3.5 h-3.5 mr-1" />
                            {applying ? 'Applying…' : 'Accept & Apply'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
