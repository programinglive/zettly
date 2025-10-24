const PRIORITY_ORDER = { urgent: 2, not_urgent: 1 };
const IMPORTANCE_ORDER = { important: 2, not_important: 1 };

const isTruthyDate = (value) => {
    if (!value) {
        return 0;
    }

    const timestamp = Date.parse(value);

    return Number.isNaN(timestamp) ? 0 : timestamp;
};

const resolveDueRank = (todo) => {
    if (!todo || !todo.due_date) {
        return Number.POSITIVE_INFINITY;
    }

    const timestamp = isTruthyDate(todo.due_date);

    return timestamp === 0 ? Number.POSITIVE_INFINITY : timestamp;
};

const isCompleted = (todo) => Boolean(todo && todo.is_completed);

const resolvePriorityRank = (priority) => {
    if (typeof priority !== 'string') {
        return PRIORITY_ORDER.not_urgent;
    }

    const normalized = priority.toLowerCase();

    return PRIORITY_ORDER[normalized] ?? PRIORITY_ORDER.not_urgent;
};

const resolveImportanceRank = (importance) => {
    if (typeof importance !== 'string') {
        return IMPORTANCE_ORDER.not_important;
    }

    const normalized = importance.toLowerCase();

    return IMPORTANCE_ORDER[normalized] ?? IMPORTANCE_ORDER.not_important;
};

const applyFilter = (items, filter) => {
    switch (filter) {
        case 'completed':
            return items.filter((todo) => isCompleted(todo));
        case 'pending':
            return items.filter((todo) => !isCompleted(todo));
        case 'urgent':
            return items.filter((todo) => (todo?.priority || '').toLowerCase() === 'urgent');
        case 'not_urgent':
            return items.filter((todo) => (todo?.priority || '').toLowerCase() === 'not_urgent');
        case 'important':
            return items.filter((todo) => (todo?.importance || todo?.importance_level || '').toLowerCase() === 'important');
        case 'not_important':
            return items.filter((todo) => (todo?.importance || todo?.importance_level || '').toLowerCase() === 'not_important');
        default:
            return items;
    }
};

const sortNotes = (items) => [...items].sort((a, b) => isTruthyDate(b?.created_at) - isTruthyDate(a?.created_at));

const sortTasks = (items) => [...items].sort((a, b) => {
    const aCompleted = isCompleted(a);
    const bCompleted = isCompleted(b);

    if (aCompleted !== bCompleted) {
        return Number(aCompleted) - Number(bCompleted);
    }

    const priorityDelta = resolvePriorityRank(b?.priority) - resolvePriorityRank(a?.priority);
    if (priorityDelta !== 0) {
        return priorityDelta;
    }

    const importanceDelta = resolveImportanceRank(b?.importance) - resolveImportanceRank(a?.importance);
    if (importanceDelta !== 0) {
        return importanceDelta;
    }

    const dueDelta = resolveDueRank(a) - resolveDueRank(b);
    if (dueDelta !== 0) {
        return dueDelta;
    }

    return isTruthyDate(b?.created_at) - isTruthyDate(a?.created_at);
});

const toArray = (input) => {
    if (Array.isArray(input)) {
        return input;
    }

    return [];
};

export default function filterAndSortTodos(rawTodos, filter, isNoteView = false) {
    const items = toArray(rawTodos);

    if (items.length === 0) {
        return [];
    }

    const filtered = isNoteView ? items : applyFilter(items, filter);

    return isNoteView ? sortNotes(filtered) : sortTasks(filtered);
}
