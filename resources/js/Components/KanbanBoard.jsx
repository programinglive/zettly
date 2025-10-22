import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useForm, router } from '@inertiajs/react';
import { CheckCircle, Circle, Plus, Eye, ArrowRight, GripVertical, Archive } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
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
function DraggableTodoCard({ todo, onToggle }) {
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

export default function KanbanBoard({ todos: initialTodos, showCreateButton = true }) {
    const toggleForm = useForm();
    const updateForm = useForm();
    const [todos, setTodos] = useState(initialTodos);
    const [activeId, setActiveId] = useState(null);
    const [showArchiveModal, setShowArchiveModal] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const [visibleCounts, setVisibleCounts] = useState({
        urgent: MAX_VISIBLE_TODOS,
        high: MAX_VISIBLE_TODOS,
        mediumLow: MAX_VISIBLE_TODOS,
        completed: MAX_VISIBLE_TODOS,
    });

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
    const handleToggle = (todo) => {
        toggleForm.post(`/todos/${todo.id}/toggle`);
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

        // Find the todo being dragged
        const draggedTodo = todos.find(todo => String(todo.id) === draggedId);
        if (!draggedTodo) {
            return;
        }

        // Determine target column
        let targetColumn = null;
        
        // Check if dropped directly on a column
        if (['urgent', 'high', 'medium-low', 'completed'].includes(overId)) {
            targetColumn = overId;
        } else {
            // Dropped on another todo, find which column it belongs to
            const targetTodo = todos.find(todo => String(todo.id) === overId);
            if (targetTodo) {
                if (targetTodo.is_completed) {
                    targetColumn = 'completed';
                } else if (targetTodo.priority === 'urgent') {
                    targetColumn = 'urgent';
                } else if (targetTodo.priority === 'high') {
                    targetColumn = 'high';
                } else {
                    targetColumn = 'medium-low';
                }
            }
        }

        if (!targetColumn) {
            return;
        }

        // Determine new priority and completion status
        let newPriority = draggedTodo.priority;
        let newCompleted = draggedTodo.is_completed;

        switch (targetColumn) {
            case 'urgent':
                newPriority = 'urgent';
                newCompleted = false;
                break;
            case 'high':
                newPriority = 'high';
                newCompleted = false;
                break;
            case 'medium-low':
                if (!['medium', 'low'].includes(draggedTodo.priority)) {
                    newPriority = 'medium';
                }
                newCompleted = false;
                break;
            case 'completed':
                newCompleted = true;
                // When completed, priority becomes irrelevant - set to null
                newPriority = null;
                break;
        }

        // Only update if something changed
        if (newPriority !== draggedTodo.priority || newCompleted !== draggedTodo.is_completed) {

            // Optimistically update the UI
            setTodos(prevTodos => 
                prevTodos.map(todo => 
                    String(todo.id) === draggedId 
                        ? { ...todo, priority: newPriority, is_completed: newCompleted }
                        : todo
                )
            );

            // Send update to backend using the new priority endpoint
            const updateData = {
                priority: newPriority,
                is_completed: Boolean(newCompleted),
            };

            router.post(`/todos/${draggedTodo.id}/update-priority`, updateData, {
                preserveScroll: true,
                preserveState: true,
                onError: (errors) => {
                    // Revert the optimistic update on error
                    setTodos(prevTodos => 
                        prevTodos.map(todo => 
                            String(todo.id) === draggedId 
                                ? { ...todo, priority: draggedTodo.priority, is_completed: draggedTodo.is_completed }
                                : todo
                        )
                    );
                }
            });
        }
    };

    // Separate todos by status (exclude archived todos)
    const pendingTodos = todos.filter(todo => !todo.is_completed && !todo.archived);
    const completedTodos = todos.filter(todo => todo.is_completed && !todo.archived);

    // Group pending todos by priority
    const urgentTodos = pendingTodos.filter(todo => todo.priority === 'urgent');
    const highTodos = pendingTodos.filter(todo => todo.priority === 'high');
    const mediumTodos = pendingTodos.filter(todo => todo.priority === 'medium');
    const lowTodos = pendingTodos.filter(todo => todo.priority === 'low');
    const mediumLowTodos = useMemo(() => [...mediumTodos, ...lowTodos], [mediumTodos, lowTodos]);

    useEffect(() => {
        setVisibleCounts((prev) => {
            const next = {
                urgent: computeVisible(prev.urgent, urgentTodos.length),
                high: computeVisible(prev.high, highTodos.length),
                mediumLow: computeVisible(prev.mediumLow, mediumLowTodos.length),
                completed: computeVisible(prev.completed, completedTodos.length),
            };

            if (
                next.urgent === prev.urgent &&
                next.high === prev.high &&
                next.mediumLow === prev.mediumLow &&
                next.completed === prev.completed
            ) {
                return prev;
            }

            return next;
        });
    }, [computeVisible, urgentTodos.length, highTodos.length, mediumLowTodos.length, completedTodos.length]);

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
            urgent: () => handleLoadMore('urgent', urgentTodos.length),
            high: () => handleLoadMore('high', highTodos.length),
            mediumLow: () => handleLoadMore('mediumLow', mediumLowTodos.length),
            completed: () => handleLoadMore('completed', completedTodos.length),
        }),
        [handleLoadMore, urgentTodos.length, highTodos.length, mediumLowTodos.length, completedTodos.length]
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

    const urgentVisible = getVisibleCount('urgent', urgentTodos.length);
    const highVisible = getVisibleCount('high', highTodos.length);
    const mediumLowVisible = getVisibleCount('mediumLow', mediumLowTodos.length);
    const completedVisible = getVisibleCount('completed', completedTodos.length);

    const urgentHasMore = urgentVisible < urgentTodos.length;
    const highHasMore = highVisible < highTodos.length;
    const mediumLowHasMore = mediumLowVisible < mediumLowTodos.length;
    const completedHasMore = completedVisible < completedTodos.length;

    const DroppableColumn = ({ id, title, todos, totalCount, visibleCount, bgColor, textColor, icon, hasMore, onLoadMore }) => {
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
                    isOver ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
                }`}
            >
                <div className={`${bgColor} ${textColor} p-3 rounded-t-lg`}>
                    <div className="flex items-center gap-2">
                        <span className="text-lg">{icon}</span>
                        <h3 className="font-medium text-sm">{title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                            {totalCount}
                        </span>
                        {id === 'completed' && totalCount > 0 && (
                            <button
                                onClick={handleArchiveCompleted}
                                className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded-full transition-colors flex items-center gap-1"
                                title="Archive all completed todos"
                            >
                                <Archive className="w-3 h-3" />
                                <span>Archive</span>
                            </button>
                        )}
                    </div>
                </div>
                <SortableContext items={todoIds} strategy={verticalListSortingStrategy}>
                    <div 
                        className="bg-gray-50/90 dark:bg-slate-950/60 p-3 rounded-b-lg min-h-[200px] max-h-[520px] overflow-y-auto space-y-3 border-l border-r border-b border-gray-200 dark:border-slate-800"
                    >
                        {displayTodos.length > 0 ? (
                            displayTodos.map(todo => (
                                <DraggableTodoCard key={todo.id} todo={todo} onToggle={handleToggle} />
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                                <div className="text-2xl mb-2">{icon}</div>
                                <p className="text-xs">No {title.toLowerCase()}</p>
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
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Todo Board</h2>
                    <div className="flex space-x-3">
                        <Link href="/todos">
                            <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                                <Eye className="w-4 h-4 mr-2" />
                                View All
                            </button>
                        </Link>
                        {showCreateButton && (
                            <Link href="/todos/create">
                                <button className="inline-flex items-center px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-100 transition-colors">
                                    <Plus className="w-4 h-4 mr-2" />
                                    New Todo
                                </button>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Kanban Board */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <DroppableColumn
                        id="urgent"
                        title="Urgent"
                        todos={urgentTodos}
                        totalCount={urgentTodos.length}
                        visibleCount={urgentVisible}
                        hasMore={urgentHasMore}
                        onLoadMore={loadMoreHandlers.urgent}
                        bgColor="bg-red-600"
                        textColor="text-white"
                        icon="🚨"
                    />
                    <DroppableColumn
                        id="high"
                        title="High Priority"
                        todos={highTodos}
                        totalCount={highTodos.length}
                        visibleCount={highVisible}
                        hasMore={highHasMore}
                        onLoadMore={loadMoreHandlers.high}
                        bgColor="bg-orange-500"
                        textColor="text-white"
                        icon="🔥"
                    />
                    <DroppableColumn
                        id="medium-low"
                        title="Medium & Low"
                        todos={mediumLowTodos}
                        totalCount={mediumLowTodos.length}
                        visibleCount={mediumLowVisible}
                        hasMore={mediumLowHasMore}
                        onLoadMore={loadMoreHandlers.mediumLow}
                        bgColor="bg-blue-500"
                        textColor="text-white"
                        icon="📋"
                    />
                    <DroppableColumn
                        id="completed"
                        title="Completed"
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
        </DndContext>
    );
}
