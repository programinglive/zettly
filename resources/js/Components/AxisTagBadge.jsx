import React from 'react';

/**
 * Renders a tag as a chip that says which zettelkasten axis it belongs to.
 *
 * WHY THE AXIS IS SPELLED OUT
 * ---------------------------
 * A tag name already carries its axis (`proyek:dev-workflow-mcp-server`), but
 * the prefix is noise when a card shows four chips in a row. Dropping it
 * entirely is worse: two chips reading `monitor` and `dev-workflow-mcp-server`
 * look like the same kind of thing when one is an area and one is a project.
 *
 * So the axis becomes a short, quiet label in front of the value, hoverable for
 * the full name, and the chip keeps the full tag available as its title.
 */

/** Short, human labels for the four axes. Anything else is shown as-is. */
const AXIS_LABEL = {
    proyek: 'proyek',
    tipe: 'tipe',
    area: 'area',
    sumber: 'sumber',
};

const AXIS_HINT = {
    proyek: 'Repository or account this work belongs to',
    tipe: 'Kind of record: todo, note, journal, drawing or the task type',
    area: 'Subsystem or topic',
    sumber: 'Where the record came from: manual, sentry, factory, codex',
};

/** Splits `axis:value`, tolerating a tag with no prefix at all. */
export function splitTagName(name) {
    const text = String(name || '');
    const index = text.indexOf(':');
    if (index <= 0) return { axis: '', value: text };
    return { axis: text.slice(0, index), value: text.slice(index + 1) };
}

export default function AxisTagBadge({ tag, onClick }) {
    if (!tag || !tag.name) return null;
    const { axis, value } = splitTagName(tag.name);
    const label = AXIS_LABEL[axis] || axis;
    const color = tag.color || '#64748b';

    const chip = (
        <span
            className={
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium max-w-[220px] ' +
                (onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : '')
            }
            style={{ backgroundColor: color + '20', color, border: `1px solid ${color}40` }}
            title={AXIS_HINT[axis] ? `${AXIS_HINT[axis]} — ${tag.name}` : tag.name}
        >
            {label && (
                <span className="uppercase tracking-wide opacity-60 text-[9px]">{label}</span>
            )}
            <span className="truncate">{value}</span>
        </span>
    );

    if (!onClick) return chip;
    return (
        <button type="button" onClick={() => onClick(tag)} className="text-left">
            {chip}
        </button>
    );
}
