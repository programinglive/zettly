import React from 'react';

export default function TagBadge({ tag, removable = false, onRemove }) {
    if (removable && onRemove) {
        return (
            <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity"
                style={{
                    backgroundColor: tag.color + '20',
                    color: tag.color,
                    border: `1px solid ${tag.color}40`
                }}
                onClick={() => onRemove(tag.id)}
            >
                {tag.name}
                <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </span>
        );
    }

    return (
        <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{
                backgroundColor: tag.color + '20',
                color: tag.color,
                border: `1px solid ${tag.color}40`
            }}
        >
            {tag.name}
        </span>
    );
}
