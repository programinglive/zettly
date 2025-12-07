import React, { useEffect, useMemo, useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import { CheckCircle, Circle, ArrowRight, GripVertical } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
    DragOverlay,
} from '@dnd-kit/core';
import {
    useSortable,
    sortableKeyboardCoordinates,
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TagBadge from './TagBadge';
import CompletionReasonDialog from './CompletionReasonDialog';

const resolveCsrfToken = () => {
    const inertiaToken = router?.page?.props?.csrf_token;

    if (inertiaToken) {
        return inertiaToken;
    }

    if (typeof document === 'undefined') {
        return null;
    }

    const tokenMeta = document.querySelector('meta[name="csrf-token"]');

    return tokenMeta?.content ?? null;
};

const stripHtml = (html) => {
    if (!html) return '';
    if (typeof window !== 'undefined' && window.DOMParser) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return doc.body.textContent || '';
    }
    return html.replace(/<[^>]*>/g, ' ');
};

const getDescriptionPreview = (html, limit = 60) => {
    const text = stripHtml(html).replace(/\s+/g, ' ').trim();
    if (!text || text.length <= limit) return text;
    return `${text.slice(0, limit).trim()}…`;
};

function DraggableTaskCard({ todo, onToggle, onSelect, isSelected }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: String(todo.id),
        data: { type: 'task', todo },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`bg-white/95 dark:bg-slate-950/70 p-3 rounded-lg border transition-all shadow-sm hover:shadow-md ${isDragging ? 'z-50 opacity-50' : ''
                } ${isSelected
                    ? 'border-gray-400 ring-2 ring-gray-300/60 dark:border-gray-500 dark:ring-gray-500/40'
                    : 'border-gray-200 dark:border-slate-800'
                }`}
            onClick={() => {
                if (typeof onSelect === 'function') {
                    onSelect(todo);
                }
            }}
        >
            <div className="flex items-start space-x-3">
                <div
                    {...attributes}
                    {...listeners}
                    className="flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                    <GripVertical className="w-4 h-4" />
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggle(todo);
                    }}
                    className="flex-shrink-0 mt-0.5"
                >
                    {todo.is_completed ? (
                        <CheckCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    ) : (
                        <Circle className="w-5 h-5 text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-500" />
                    )}
                </button>

                <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-medium ${todo.is_completed ? 'line-through text-gray-500 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                        {todo.title}
                    </h4>
                    {todo.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {getDescriptionPreview(todo.description)}
                        </p>
                    )}

                    {todo.tags && todo.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {todo.tags.slice(0, 2).map(tag => (
                                <TagBadge key={tag.id} tag={tag} />
                            ))}
                            {todo.tags.length > 2 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300">
                                    +{todo.tags.length - 2}
                                </span>
                            )}
                        </div>
                    )}

                    <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400 dark:text-gray-400">
                            {new Date(todo.created_at).toLocaleDateString()}
                        </span>
                        <Link href={`/todos/${todo.id}`} onClick={(e) => e.stopPropagation()}>
                            <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                <ArrowRight className="w-3 h-3" />
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

const MAX_VISIBLE = 4;

const NO_OP = () => { };

export default function EisenhowerMatrix({ todos = [], onTaskSelect = NO_OP, selectedTaskId = null, onTaskUpdate = NO_OP }) {
    const [activeId, setActiveId] = useState(null);
    const [localTodos, setLocalTodos] = useState(todos);
    const [visibleCounts, setVisibleCounts] = useState({
        q1: MAX_VISIBLE,
        q2: MAX_VISIBLE,
        q3: MAX_VISIBLE,
        q4: MAX_VISIBLE,
    });
    const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
    const [pendingToggleTodo, setPendingToggleTodo] = useState(null);
    const toggleForm = useForm({ reason: '' });

    // Keep localTodos in sync with server-provided todos
    useEffect(() => {
        setLocalTodos(todos);
    }, [todos]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const closeReasonDialog = () => {
        setReasonDialogOpen(false);
        setPendingToggleTodo(null);
        toggleForm.reset();
        toggleForm.clearErrors();
    };

    const handleToggle = (todo) => {
        toggleForm.reset('reason');
        toggleForm.clearErrors();
        setPendingToggleTodo(todo);
        setReasonDialogOpen(true);
    };

    const handleReasonSubmit = (reason) => {
        if (!pendingToggleTodo) {
            return;
        }

        const token = resolveCsrfToken();

        toggleForm.transform(() => ({
            reason,
            _token: token ?? '',
        }));

        toggleForm.post(`/todos/${pendingToggleTodo.id}/toggle`, {
            preserveScroll: true,
            onSuccess: () => {
                onTaskUpdate();
                closeReasonDialog();
                toggleForm.transform((data) => data);
            },
            onError: () => {
                toggleForm.transform(() => ({
                    reason,
                    _token: token ?? '',
                }));
            },
            onFinish: () => {
                toggleForm.transform((data) => data);
            },
        });
    };

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const draggedId = String(active.id);
        const overId = String(over.id);
        const draggedTodo = localTodos.find(t => String(t.id) === draggedId);

        if (!draggedTodo) return;

        let targetQuadrant = null;
        if (['q1', 'q2', 'q3', 'q4'].includes(overId)) {
            targetQuadrant = overId;
        } else {
            const targetTodo = localTodos.find(t => String(t.id) === overId);
            if (targetTodo) {
                targetQuadrant = getQuadrant(targetTodo);
            }
        }

        if (!targetQuadrant) return;

        const [importance, priority] = quadrantToMatrix(targetQuadrant);

        const currentQuadrant = getQuadrant(draggedTodo);

        const lists = {
            q1: groupedTodos.q1.slice(),
            q2: groupedTodos.q2.slice(),
            q3: groupedTodos.q3.slice(),
            q4: groupedTodos.q4.slice(),
        };

        lists[currentQuadrant] = lists[currentQuadrant].filter(t => String(t.id) !== draggedId);

        let insertIndex = lists[targetQuadrant].length;
        if (!['q1', 'q2', 'q3', 'q4'].includes(overId)) {
            const overIndex = lists[targetQuadrant].findIndex(t => String(t.id) === overId);
            if (overIndex !== -1) {
                insertIndex = overIndex;
            }
        }

        const updatedDragged = { ...draggedTodo, importance, priority };
        lists[targetQuadrant] = [
            ...lists[targetQuadrant].slice(0, insertIndex),
            updatedDragged,
            ...lists[targetQuadrant].slice(insertIndex),
        ];

        const payload = {
            column: targetQuadrant,
            todo_ids: lists[targetQuadrant].map(t => t.id),
        };

        const postReorder = () => {
            axios.post('/todos/reorder', payload)
                .then((response) => {
                    if (process.env.NODE_ENV === 'development') {
                        console.log('Eisenhower reorder successful:', response.data);
                    }
                    onTaskUpdate();
                })
                .catch((error) => {
                    console.error('Eisenhower reorder failed:', error);
                    onTaskUpdate();
                });
        };

        const quadrantChanged = (importance !== draggedTodo.importance) || (priority !== draggedTodo.priority);

        // Optimistically update local state for smoother UX
        setLocalTodos(prev => {
            // Build ordered ids for target quadrant
            const targetIds = lists[targetQuadrant].map(t => t.id);
            const inTarget = new Set(targetIds);

            const others = prev.filter(t => getQuadrant(t) !== targetQuadrant || t.is_completed || t.archived);

            const reorderedTarget = prev
                .filter(t => getQuadrant(t) === targetQuadrant && !t.is_completed && !t.archived)
                .sort((a, b) => targetIds.indexOf(a.id) - targetIds.indexOf(b.id))
                .map(t => (t.id === updatedDragged.id ? updatedDragged : t));

            return [...others, ...reorderedTarget];
        });

        if (quadrantChanged) {
            const updatePayload = {
                importance,
                priority,
            };

            router.post(
                `/todos/${draggedTodo.id}/update-eisenhower`,
                updatePayload,
                {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => {
                        onTaskSelect(draggedTodo);
                        postReorder();
                    },
                }
            );
        } else {
            postReorder();
        }
    };

    const resolveImportance = (todo) => {
        const raw = todo.importance ?? todo.importance_level ?? null;

        if (typeof raw !== 'string') {
            return 'not_important';
        }

        const normalized = raw.toLowerCase();

        if (normalized === 'high' || normalized === 'important') {
            return 'important';
        }

        return 'not_important';
    };

    const resolvePriority = (todo) => {
        const raw = todo.priority ?? todo.priority_level ?? null;

        if (typeof raw !== 'string') {
            return 'not_urgent';
        }

        const normalized = raw.toLowerCase();

        if (normalized === 'urgent' || normalized === 'high') {
            return 'urgent';
        }

        return 'not_urgent';
    };

    const getQuadrant = (todo) => {
        const priority = resolvePriority(todo);
        const importance = resolveImportance(todo);

        if (importance === 'important' && priority === 'urgent') return 'q1';
        if (importance === 'important' && priority === 'not_urgent') return 'q2';
        if (importance === 'not_important' && priority === 'urgent') return 'q3';
        return 'q4';
    };

    const quadrantToMatrix = (quadrant) => {
        const map = {
            q1: ['important', 'urgent'],
            q2: ['important', 'not_urgent'],
            q3: ['not_important', 'urgent'],
            q4: ['not_important', 'not_urgent'],
        };
        return map[quadrant] || ['not_important', 'not_urgent'];
    };

    const groupedTodos = useMemo(() => {
        const groups = { q1: [], q2: [], q3: [], q4: [] };
        localTodos.forEach(todo => {
            if (!todo.is_completed && !todo.archived) {
                const quad = getQuadrant(todo);
                groups[quad].push(todo);
            }
        });
        return groups;
    }, [localTodos]);

    const QuadrantColumn = ({ id, title, description, todos: quadTodos, bgColor, icon }) => {
        const { isOver, setNodeRef } = useDroppable({ id });
        const visibleCount = Math.min(visibleCounts[id] || MAX_VISIBLE, quadTodos.length);
        const displayTodos = quadTodos.slice(0, visibleCount);
        const todoIds = displayTodos.map(t => String(t.id));

        return (
            <div
                ref={setNodeRef}
                className={`flex flex-col rounded-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden transition-all ${isOver ? 'ring-2 ring-gray-400 ring-opacity-50' : ''
                    }`}
            >
                <div className={`${bgColor} text-white p-4`}>
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-2xl">{icon}</span>
                                <h3 className="font-semibold text-lg">{title}</h3>
                            </div>
                            <p className="text-sm opacity-90">{description}</p>
                        </div>
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-white/20 text-sm font-semibold">
                            {quadTodos.length}
                        </span>
                    </div>
                </div>

                <SortableContext items={todoIds} strategy={verticalListSortingStrategy}>
                    <div className="bg-gray-50/90 dark:bg-slate-950/60 p-3 min-h-[200px] space-y-3 flex-1">
                        {displayTodos.length > 0 ? (
                            displayTodos.map(todo => (
                                <DraggableTaskCard
                                    key={todo.id}
                                    todo={todo}
                                    onToggle={handleToggle}
                                    onSelect={onTaskSelect}
                                    isSelected={selectedTaskId === todo.id}
                                />
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                                <p className="text-xs">{icon} No tasks</p>
                            </div>
                        )}
                        {quadTodos.length > visibleCount && (
                            <button
                                onClick={() => setVisibleCounts(prev => ({
                                    ...prev,
                                    [id]: prev[id] + MAX_VISIBLE
                                }))}
                                className="w-full text-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 py-2"
                            >
                                +{quadTodos.length - visibleCount} more
                            </button>
                        )}
                    </div>
                </SortableContext>
            </div>
        );
    };

    return (
        <>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Eisenhower Matrix</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Prioritize by urgency and importance</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <QuadrantColumn
                            id="q1"
                            title="Q1: Do First"
                            description="Urgent & Important"
                            todos={groupedTodos.q1}
                            bgColor="bg-gray-800"
                            icon="🚨"
                        />
                        <QuadrantColumn
                            id="q2"
                            title="Q2: Schedule"
                            description="Not Urgent & Important"
                            todos={groupedTodos.q2}
                            bgColor="bg-gray-700"
                            icon="📅"
                        />
                        <QuadrantColumn
                            id="q3"
                            title="Q3: Delegate"
                            description="Urgent & Not Important"
                            todos={groupedTodos.q3}
                            bgColor="bg-gray-600"
                            textColor="text-white"
                            icon="👥"
                        />
                        <QuadrantColumn
                            id="q4"
                            title="Q4: Eliminate"
                            description="Not Urgent & Not Important"
                            todos={groupedTodos.q4}
                            bgColor="bg-gray-500"
                            icon="🗑️"
                        />
                    </div>
                </div>

                <DragOverlay>
                    {activeId ? (
                        <DraggableTaskCard
                            todo={localTodos.find(t => String(t.id) === String(activeId))}
                            onToggle={() => { }}
                        />
                    ) : null}
                </DragOverlay>
            </DndContext>

            <CompletionReasonDialog
                open={reasonDialogOpen}
                onCancel={closeReasonDialog}
                onSubmit={handleReasonSubmit}
                processing={toggleForm.processing}
                initialState={pendingToggleTodo?.is_completed ? 'completed' : 'pending'}
                targetState={pendingToggleTodo?.is_completed ? 'pending' : 'completed'}
                error={toggleForm.errors.reason}
            />
        </>
    );
}
