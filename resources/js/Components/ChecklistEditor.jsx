import React from 'react';
import { Plus, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';

import { Button } from './ui/button';
import { Input } from './ui/input';
import Checkbox from './Checkbox';
import { cn } from '../utils';

const reorderItems = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
};

export default function ChecklistEditor({
    label = 'Checklist Items',
    items,
    onChange,
    errors = [],
    className = '',
}) {
    const handleItemChange = (index, changes) => {
        const nextItems = items.map((item, i) => (i === index ? { ...item, ...changes } : item));
        onChange(nextItems);
    };

    const handleAddItem = () => {
        onChange([
            ...items,
            {
                id: null,
                title: '',
                is_completed: false,
            },
        ]);
    };

    const handleRemoveItem = (index) => {
        const nextItems = items.filter((_, i) => i !== index);
        onChange(nextItems);
    };

    const handleMoveUp = (index) => {
        if (index === 0) return;
        onChange(reorderItems(items, index, index - 1));
    };

    const handleMoveDown = (index) => {
        if (index === items.length - 1) return;
        onChange(reorderItems(items, index, index + 1));
    };

    return (
        <div className={cn('rounded-xl border border-border/70 dark:border-gray-600 bg-card/60 shadow-sm backdrop-blur-sm', className)}>
            <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">Break work into manageable steps for this todo.</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="hidden sm:inline">Need another step?</span>
                    <span className="sm:hidden">Add new step:</span>
                </div>
            </div>

            {errors.length > 0 && (
                <div className="px-4 pt-3">
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {errors.map((error, index) => (
                            <p key={index}>{error}</p>
                        ))}
                    </div>
                </div>
            )}

            <div className={cn('px-4 py-4', items.length > 0 ? 'space-y-3' : '')}>
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 dark:border-gray-600/60 bg-background/70 px-6 py-10 text-center text-sm text-muted-foreground">
                        <Plus className="h-6 w-6 text-muted-foreground/70" />
                        <div>
                            <p className="text-sm font-medium text-foreground">No checklist items yet</p>
                            <p>Use <span className="font-semibold text-foreground">Add Item</span> to start building a checklist.</p>
                        </div>
                    </div>
                ) : (
                    items.map((item, index) => (
                        <div
                            key={item.id ?? `new-${index}`}
                            className="flex flex-col gap-3 rounded-lg border border-border/80 dark:border-gray-600 bg-background/80 px-3 py-3 shadow-sm sm:flex-row sm:items-center"
                        >
                            <div className="flex flex-1 items-center gap-3">
                                <Checkbox
                                    checked={item.is_completed}
                                    onChange={(event) =>
                                        handleItemChange(index, { is_completed: event.target.checked })
                                    }
                                    className="h-5 w-5 border-border"
                                />
                                <Input
                                    value={item.title}
                                    onChange={(event) => handleItemChange(index, { title: event.target.value })}
                                    placeholder={`Checklist item ${index + 1}`}
                                    className="flex-1"
                                />
                            </div>
                            <div className="flex items-center gap-1 self-end sm:self-auto">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleMoveUp(index)}
                                    disabled={index === 0}
                                    className="text-muted-foreground hover:text-foreground"
                                    aria-label="Move item up"
                                >
                                    <ChevronUp className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleMoveDown(index)}
                                    disabled={index === items.length - 1}
                                    className="text-muted-foreground hover:text-foreground"
                                    aria-label="Move item down"
                                >
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveItem(index)}
                                    className="text-destructive hover:text-destructive"
                                    aria-label="Remove item"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                    {items.length} item{items.length === 1 ? '' : 's'} in this checklist
                </p>
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="gap-2"
                    onClick={handleAddItem}
                >
                    <Plus className="h-4 w-4" />
                    Add Item
                </Button>
            </div>
        </div>
    );
}
