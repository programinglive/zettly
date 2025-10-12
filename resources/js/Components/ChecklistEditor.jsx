import React from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import Checkbox from './Checkbox';

const reorderItems = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
};

export default function ChecklistEditor({ items, onChange, errors = [] }) {
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
        <div className="space-y-3">
            {items.map((item, index) => (
                <div
                    key={item.id ?? `new-${index}`}
                    className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-800"
                >
                    <Checkbox
                        checked={item.is_completed}
                        onChange={(event) =>
                            handleItemChange(index, { is_completed: event.target.checked })
                        }
                        className="h-5 w-5"
                    />
                    <Input
                        value={item.title}
                        onChange={(event) => handleItemChange(index, { title: event.target.value })}
                        placeholder={`Checklist item ${index + 1}`}
                        className="flex-1"
                    />
                    <div className="flex items-center space-x-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleMoveUp(index)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            ↑
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleMoveDown(index)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            ↓
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-700"
                        >
                            Remove
                        </Button>
                    </div>
                </div>
            ))}

            <Button type="button" variant="outline" onClick={handleAddItem}>
                Add Item
            </Button>
        </div>
    );
}
