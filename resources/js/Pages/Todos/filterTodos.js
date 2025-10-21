const PRIORITY_ORDER = { urgent: 4, high: 3, medium: 2, low: 1 };

const isTruthyDate = (value) => {
    if (!value) {
        return 0;
    }

    const timestamp = Date.parse(value);

    return Number.isNaN(timestamp) ? 0 : timestamp;
};

const isCompleted = (todo) => Boolean(todo && todo.is_completed);

const resolvePriorityRank = (priority) => {
    if (typeof priority !== 'string') {
        return PRIORITY_ORDER.medium;
    }

    const normalized = priority.toLowerCase();

    return PRIORITY_ORDER[normalized] ?? PRIORITY_ORDER.medium;
};

const applyFilter = (items, filter) => {
    switch (filter) {
        case 'completed':
            return items.filter((todo) => isCompleted(todo));
        case 'pending':
            return items.filter((todo) => !isCompleted(todo));
        case 'high_priority':
            return items.filter((todo) => {
                const priority = (todo?.priority || '').toLowerCase();

                return priority === 'urgent' || priority === 'high';
            });
        case 'low_priority':
            return items.filter((todo) => {
                const priority = (todo?.priority || '').toLowerCase();

                return priority === 'medium' || priority === 'low';
            });
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
