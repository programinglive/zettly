import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useForm, router } from '@inertiajs/react';
import { CheckCircle, Circle, Plus, Eye, ArrowRight, GripVertical, Archive } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import CompletionReasonDialog from './CompletionReasonDialog';
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useDroppable,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TagBadge from './TagBadge';

const stripHtml = (html) => {
    if (!html) {
        return '';
    }

    if (typeof window !== 'undefined' && window.DOMParser) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return doc.body.textContent || '';
    }

    return html.replace(/<[^>]*>/g, ' ');
};

const getDescriptionPreview = (html, limit = 80) => {
    const text = stripHtml(html).replace(/\s+/g, ' ').trim();

    if (!text) {
        return '';
    }

    if (text.length <= limit) {
        return text;
    }

    return `${text.slice(0, limit).trim()}…`;
};

// Draggable Todo Card Component
function DraggableTodoCard({ todo, onToggle, onSelect }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ 
        id: String(todo.id),
        data: {
            type: 'todo',
            todo: todo,
        }
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
            className={`bg-white/95 dark:bg-slate-950/70 p-3 rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all ${
                isDragging ? 'z-50 opacity-50' : ''
            }`}
            onClick={() => {
                if (!isDragging && typeof onSelect === 'function') {
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
                        <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />
                    ) : (
                        <Circle className="w-5 h-5 text-gray-400 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400" />
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
                    
                    {/* Tags */}
                    {todo.tags && todo.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2 mb-1">
                            {todo.tags.slice(0, 3).map(tag => (
                                <TagBadge key={tag.id} tag={tag} />
                            ))}
                            {todo.tags.length > 3 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300">
                                    +{todo.tags.length - 3}
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

const MAX_VISIBLE_TODOS = 5;
const LOAD_INCREMENT = 5;
const KANBAN_COLUMNS = ['q1', 'q2', 'q3', 'q4', 'completed'];

const getColumnKey = (todo) => {
    if (todo.is_completed) {
        return 'completed';
    }

    const importance = todo.importance ?? 'not_important';
    const priority = todo.priority ?? 'not_urgent';

    if (importance === 'important' && priority === 'urgent') {
        return 'q1';
    }
    if (importance === 'important' && priority === 'not_urgent') {
        return 'q2';
    }
    if (importance === 'not_important' && priority === 'urgent') {
        return 'q3';
    }

    return 'q4';
};

const columnKeyToProps = {
    q1: { importance: 'important', priority: 'urgent', is_completed: false },
    q2: { importance: 'important', priority: 'not_urgent', is_completed: false },
    q3: { importance: 'not_important', priority: 'urgent', is_completed: false },
    q4: { importance: 'not_important', priority: 'not_urgent', is_completed: false },
    completed: { importance: null, priority: null, is_completed: true },
};

export default function KanbanBoard({ todos: initialTodos, showCreateButton = true, onSelect }) {
    const toggleForm = useForm({ reason: '' });
    const updateForm = useForm({ reason: '', priority: null, importance: null, is_completed: false });
    const [todos, setTodos] = useState(initialTodos);
    const [activeId, setActiveId] = useState(null);
    const [showArchiveModal, setShowArchiveModal] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const [visibleCounts, setVisibleCounts] = useState({
        q1: MAX_VISIBLE_TODOS,
        q2: MAX_VISIBLE_TODOS,
        q3: MAX_VISIBLE_TODOS,
        q4: MAX_VISIBLE_TODOS,
        completed: MAX_VISIBLE_TODOS,
    });
    const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
    const [reasonContext, setReasonContext] = useState(null);

    const computeVisible = useCallback((current, total) => {
        if (total <= 0) {
            return 0;
        }
        const base = typeof current === 'number' ? current : MAX_VISIBLE_TODOS;
        const normalized = Math.max(base, MAX_VISIBLE_TODOS);
        return Math.min(normalized, total);
    }, []);

    // Sync with prop changes
    useEffect(() => {
        setTodos(initialTodos);
    }, [initialTodos]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );
    const openReasonDialog = (context) => {
        setReasonContext(context);
        setReasonDialogOpen(true);
    };

    const closeReasonDialog = () => {
        setReasonDialogOpen(false);
        setReasonContext(null);
        toggleForm.reset('reason');
        toggleForm.clearErrors();
        updateForm.reset();
        updateForm.clearErrors();
    };

    const handleReasonSubmit = (reason) => {
        if (!reasonContext) {
            return;
        }

        if (reasonContext.type === 'toggle') {
            toggleForm.transform(() => ({
                reason,
            }));
            toggleForm.post(`/todos/${reasonContext.todo.id}/toggle`, {
                preserveScroll: true,
                onSuccess: () => {
                    closeReasonDialog();
                    toggleForm.transform((data) => data);
                },
                onError: () => {
                    toggleForm.transform(() => ({
                        reason,
                    }));
                },
                onFinish: () => {
                    toggleForm.transform((data) => data);
                },
            });

            return;
        }

        if (reasonContext.type === 'updatePriority') {
            const { todo, payload, originalState } = reasonContext;

            setTodos((prev) => prev.map((t) => (
                String(t.id) === String(todo.id)
                    ? {
                        ...t,
                        priority: payload.priority,
                        importance: payload.importance,
                        is_completed: payload.is_completed,
                    }
                    : t
            )));

            updateForm.transform(() => ({
                priority: payload.priority,
                importance: payload.importance,
                is_completed: payload.is_completed,
                reason,
            }));

            updateForm.post(`/todos/${todo.id}/update-priority`, {
                preserveScroll: true,
                preserveState: true,
                onError: () => {
                    setTodos((prev) => prev.map((t) => (
                        String(t.id) === String(todo.id)
                            ? {
                                ...t,
                                priority: originalState.priority,
                                importance: originalState.importance,
                                is_completed: originalState.is_completed,
                            }
                            : t
                    )));
                },
                onSuccess: () => {
                    closeReasonDialog();
                    updateForm.transform((data) => data);
                },
                onFinish: () => {
                    updateForm.transform((data) => data);
                },
            });
        }
    };

    const handleToggle = (todo) => {
        toggleForm.reset('reason');
        toggleForm.clearErrors();
        openReasonDialog({
            type: 'toggle',
            todo,
            targetState: todo.is_completed ? 'pending' : 'completed',
        });
    };

    const handleArchiveCompleted = () => {
        if (completedTodos.length === 0) {
            return;
        }
        setShowArchiveModal(true);
    };

    const confirmArchive = () => {
        setIsArchiving(true);
        router.post('/todos/archive-completed', {}, {
            preserveScroll: true,
            onSuccess: () => {
                // Mark completed todos as archived in local state
                setTodos(prevTodos => 
                    prevTodos.map(todo => 
                        todo.is_completed 
                            ? { ...todo, archived: true, archived_at: new Date().toISOString() }
                            : todo
                    )
                );
                setShowArchiveModal(false);
                setIsArchiving(false);
            },
            onError: () => {
                setIsArchiving(false);
            }
        });
    };

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) {
            return;
        }

        const draggedId = String(active.id);
        const overId = String(over.id);

        const draggedIndex = todos.findIndex((todo) => String(todo.id) === draggedId);
        if (draggedIndex === -1) {
            return;
        }

        const draggedTodo = todos[draggedIndex];

        const resolveDropColumn = () => {
            if (KANBAN_COLUMNS.includes(overId)) {
                return overId;
            }

            const targetTodo = todos.find((todo) => String(todo.id) === overId);
            if (!targetTodo) {
                return null;
            }

            return getColumnKey(targetTodo);
        };

        const targetColumn = resolveDropColumn();

        if (!targetColumn) {
            return;
        }

        const currentColumn = getColumnKey(draggedTodo);

        const columnLists = KANBAN_COLUMNS.reduce((acc, columnKey) => {
            acc[columnKey] = todos.filter((todo) => getColumnKey(todo) === columnKey && !todo.archived);
            return acc;
        }, {});

        const nextColumnLists = { ...columnLists };

        // Remove from current column
        nextColumnLists[currentColumn] = columnLists[currentColumn].filter((todo) => String(todo.id) !== draggedId);

        // Determine insertion index
        let insertIndex = nextColumnLists[targetColumn].length;

        if (!KANBAN_COLUMNS.includes(overId)) {
            const overIndex = nextColumnLists[targetColumn].findIndex((todo) => String(todo.id) === overId);
            if (overIndex !== -1) {
                insertIndex = overIndex;
            }
        }

        const updatedDragged = {
            ...draggedTodo,
            ...columnKeyToProps[targetColumn],
        };

        nextColumnLists[targetColumn] = [
            ...nextColumnLists[targetColumn].slice(0, insertIndex),
            updatedDragged,
            ...nextColumnLists[targetColumn].slice(insertIndex),
        ];

        const newTodos = todos.map((todo) => {
            if (String(todo.id) === draggedId) {
                return updatedDragged;
            }

            return todo;
        });

        setTodos(newTodos);

        const payload = {
            column: targetColumn,
            todo_ids: nextColumnLists[targetColumn].map((todo) => todo.id),
        };

        router.post('/todos/reorder', payload, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: (page) => {
                // Refresh todos from server without full page reload
                if (page.props?.todos) {
                    setTodos(page.props.todos);
                }
            },
            onError: (errors) => {
                console.error('Reorder failed:', errors);
                setTodos(prevTodos => prevTodos);
            },
        });
    };

    // Separate todos by status (exclude archived todos)
    const pendingTodos = todos.filter(todo => !todo.is_completed && !todo.archived);
    const completedTodos = todos.filter(todo => todo.is_completed && !todo.archived);

    const quadrantTodos = {
        q1: pendingTodos.filter((todo) => getColumnKey(todo) === 'q1'),
        q2: pendingTodos.filter((todo) => getColumnKey(todo) === 'q2'),
        q3: pendingTodos.filter((todo) => getColumnKey(todo) === 'q3'),
        q4: pendingTodos.filter((todo) => getColumnKey(todo) === 'q4'),
    };

    useEffect(() => {
        setVisibleCounts((prev) => {
            const next = {
                q1: computeVisible(prev.q1, quadrantTodos.q1.length),
                q2: computeVisible(prev.q2, quadrantTodos.q2.length),
                q3: computeVisible(prev.q3, quadrantTodos.q3.length),
                q4: computeVisible(prev.q4, quadrantTodos.q4.length),
                completed: computeVisible(prev.completed, completedTodos.length),
            };

            if (
                next.q1 === prev.q1 &&
                next.q2 === prev.q2 &&
                next.q3 === prev.q3 &&
                next.q4 === prev.q4 &&
                next.completed === prev.completed
            ) {
                return prev;
            }

            return next;
        });
    }, [computeVisible, quadrantTodos.q1.length, quadrantTodos.q2.length, quadrantTodos.q3.length, quadrantTodos.q4.length, completedTodos.length]);

    const handleLoadMore = useCallback((columnId, total) => {
        setVisibleCounts((prev) => {
            const current = prev[columnId] ?? MAX_VISIBLE_TODOS;
            const next = Math.min(current + LOAD_INCREMENT, total);
            if (next === current) {
                return prev;
            }
            return { ...prev, [columnId]: next };
        });
    }, []);

    const loadMoreHandlers = useMemo(
        () => ({
            q1: () => handleLoadMore('q1', quadrantTodos.q1.length),
            q2: () => handleLoadMore('q2', quadrantTodos.q2.length),
            q3: () => handleLoadMore('q3', quadrantTodos.q3.length),
            q4: () => handleLoadMore('q4', quadrantTodos.q4.length),
            completed: () => handleLoadMore('completed', completedTodos.length),
        }),
        [handleLoadMore, quadrantTodos.q1.length, quadrantTodos.q2.length, quadrantTodos.q3.length, quadrantTodos.q4.length, completedTodos.length]
    );

    const getVisibleCount = useCallback(
        (key, total) => {
            if (total <= 0) {
                return 0;
            }
            const value = visibleCounts[key];
            if (typeof value !== 'number') {
                return Math.min(MAX_VISIBLE_TODOS, total);
            }
            return Math.min(value, total);
        },
        [visibleCounts]
    );

    const q1Visible = getVisibleCount('q1', quadrantTodos.q1.length);
    const q2Visible = getVisibleCount('q2', quadrantTodos.q2.length);
    const q3Visible = getVisibleCount('q3', quadrantTodos.q3.length);
    const q4Visible = getVisibleCount('q4', quadrantTodos.q4.length);
    const completedVisible = getVisibleCount('completed', completedTodos.length);

    const q1HasMore = q1Visible < quadrantTodos.q1.length;
    const q2HasMore = q2Visible < quadrantTodos.q2.length;
    const q3HasMore = q3Visible < quadrantTodos.q3.length;
    const q4HasMore = q4Visible < quadrantTodos.q4.length;
    const completedHasMore = completedVisible < completedTodos.length;

    const DroppableColumn = ({ id, title, subtitle, todos, totalCount, visibleCount, bgColor, textColor, icon, hasMore, onLoadMore }) => {
        const { isOver, setNodeRef } = useDroppable({
            id: id,
        });

        const sentinelRef = useRef(null);

        useEffect(() => {
            if (!hasMore) {
                return undefined;
            }
            if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
                return undefined;
            }

            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        onLoadMore();
                    }
                });
            }, { rootMargin: '200px 0px' });

            const sentinel = sentinelRef.current;
            if (sentinel) {
                observer.observe(sentinel);
            }

            return () => observer.disconnect();
        }, [hasMore, onLoadMore]);

        const displayTodos = todos.slice(0, visibleCount);
        const todoIds = displayTodos.map(todo => String(todo.id));
        
        return (
            <div
                ref={setNodeRef}
                className={`flex-1 min-w-0 transition-colors ${
                    isOver ? 'ring-2 ring-indigo-400 ring-opacity-60' : ''
                }`}
            >
                <div className={`${bgColor} ${textColor} p-4 rounded-t-2xl shadow-sm`}>
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2">
                            <span className="text-xl leading-none">{icon}</span>
                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-wide">{title}</h3>
                                {subtitle && <p className="text-xs opacity-80">{subtitle}</p>}
                            </div>
                        </div>
                        <span className="inline-flex items-center justify-center rounded-full bg-white/25 px-2 py-0.5 text-xs font-semibold">
                            {totalCount}
                        </span>
                    </div>
                    {id === 'completed' && totalCount > 0 && (
                        <div className="mt-3 flex justify-end">
                            <button
                                onClick={handleArchiveCompleted}
                                className="text-[11px] bg-white/25 hover:bg-white/35 px-2 py-1 rounded-full transition-colors flex items-center gap-1"
                                title="Archive all completed todos"
                            >
                                <Archive className="w-3 h-3" />
                                <span>Archive</span>
                            </button>
                        </div>
                    )}
                </div>
                <SortableContext items={todoIds} strategy={verticalListSortingStrategy}>
                    <div 
                        className="bg-gray-50/90 dark:bg-slate-950/60 p-3 rounded-b-2xl min-h-[220px] max-h-[540px] overflow-y-auto space-y-3 border border-gray-200/70 dark:border-slate-800/80"
                    >
                        {displayTodos.length > 0 ? (
                            displayTodos.map(todo => (
                                <DraggableTodoCard
                                    key={todo.id}
                                    todo={todo}
                                    onToggle={handleToggle}
                                    onSelect={onSelect}
                                />
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                                <div className="text-2xl mb-2">{icon}</div>
                                <p className="text-xs">No tasks yet</p>
                                <p className="text-xs mt-1">Drag todos here</p>
                            </div>
                        )}
                        {totalCount > displayTodos.length && (
                            <button
                                type="button"
                                onClick={onLoadMore}
                                className="w-full text-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 py-1 transition-colors"
                            >
                                +{totalCount - displayTodos.length} more
                            </button>
                        )}
                        {hasMore && (
                            <div ref={sentinelRef} className="h-1" />
                        )}
                    </div>
                </SortableContext>
            </div>
        );
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Todo Board</h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage priorities and capture new tasks in one place.</p>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                        <Link
                            href="/todos"
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            <Eye className="w-4 h-4" />
                            View All
                        </Link>
                        {showCreateButton && (
                            <Link
                                href="/todos/create"
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                            >
                                <Plus className="w-4 h-4" />
                                New Todo
                            </Link>
                        )}
                    </div>
                </div>

                {/* Kanban Board */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                    <DroppableColumn
                        id="q1"
                        title="Q1: Do First"
                        subtitle="Urgent & Important"
                        todos={quadrantTodos.q1}
                        totalCount={quadrantTodos.q1.length}
                        visibleCount={q1Visible}
                        hasMore={q1HasMore}
                        onLoadMore={loadMoreHandlers.q1}
                        bgColor="bg-rose-600"
                        textColor="text-white"
                        icon="🚨"
                    />
                    <DroppableColumn
                        id="q2"
                        title="Q2: Schedule"
                        subtitle="Not Urgent & Important"
                        todos={quadrantTodos.q2}
                        totalCount={quadrantTodos.q2.length}
                        visibleCount={q2Visible}
                        hasMore={q2HasMore}
                        onLoadMore={loadMoreHandlers.q2}
                        bgColor="bg-blue-600"
                        textColor="text-white"
                        icon="📅"
                    />
                    <DroppableColumn
                        id="q3"
                        title="Q3: Delegate"
                        subtitle="Urgent & Not Important"
                        todos={quadrantTodos.q3}
                        totalCount={quadrantTodos.q3.length}
                        visibleCount={q3Visible}
                        hasMore={q3HasMore}
                        onLoadMore={loadMoreHandlers.q3}
                        bgColor="bg-amber-500"
                        textColor="text-gray-900"
                        icon="👥"
                    />
                    <DroppableColumn
                        id="q4"
                        title="Q4: Eliminate"
                        subtitle="Not Urgent & Not Important"
                        todos={quadrantTodos.q4}
                        totalCount={quadrantTodos.q4.length}
                        visibleCount={q4Visible}
                        hasMore={q4HasMore}
                        onLoadMore={loadMoreHandlers.q4}
                        bgColor="bg-slate-600"
                        textColor="text-white"
                        icon="🗑️"
                    />
                    <DroppableColumn
                        id="completed"
                        title="Completed"
                        subtitle="Archived after review"
                        todos={completedTodos}
                        totalCount={completedTodos.length}
                        visibleCount={completedVisible}
                        hasMore={completedHasMore}
                        onLoadMore={loadMoreHandlers.completed}
                        bgColor="bg-green-500"
                        textColor="text-white"
                        icon="✅"
                    />
                </div>

                {todos.length === 0 && (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-4xl mb-4">📝</div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No todos yet</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">Create your first todo to get started!</p>
                        {showCreateButton && (
                            <Link href="/todos/create">
                                <button className="inline-flex items-center px-6 py-3 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-100 transition-colors">
                                    <Plus className="w-5 h-5 mr-2" />
                                    Create Your First Todo
                                </button>
                            </Link>
                        )}
                    </div>
                )}
            </div>
            
            <DragOverlay>
                {activeId ? (
                    <DraggableTodoCard 
                        todo={todos.find(todo => String(todo.id) === String(activeId))} 
                        onToggle={() => {}} 
                    />
                ) : null}
            </DragOverlay>

            <ConfirmationModal
                isOpen={showArchiveModal}
                onClose={() => setShowArchiveModal(false)}
                onConfirm={confirmArchive}
                title="Archive Completed Todos"
                message={`Archive ${completedTodos.length} completed todos? They will be moved to archive but not permanently deleted.`}
                confirmText="Archive"
                cancelText="Cancel"
                confirmButtonVariant="default"
                isLoading={isArchiving}
            />
            <CompletionReasonDialog
                open={reasonDialogOpen}
                onCancel={closeReasonDialog}
                onSubmit={handleReasonSubmit}
                processing={toggleForm.processing || updateForm.processing}
                initialState={reasonContext?.todo?.is_completed ? 'completed' : 'pending'}
                targetState={reasonContext?.targetState ?? (reasonContext?.todo?.is_completed ? 'pending' : 'completed')}
                error={reasonContext?.type === 'toggle' ? toggleForm.errors?.reason : updateForm.errors?.reason}
            />
        </DndContext>
    );
}
