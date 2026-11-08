/**
 * Pure parser for the fixed-shape markdown emitted by ReportGenerator
 * (h1/h2/h3, two-level bullets, **bold** inline).
 *
 * Kept free of JSX and React so it can be unit-tested with plain
 * `node --test`, and free of any HTML parsing so rendering has no
 * injection surface.
 */

/**
 * Split a string on **bold** markers. Odd-segment flag lets a renderer
 * style bold segments without this module knowing about React.
 *
 * @param {string} text
 * @returns {Array<{ text: string, bold: boolean }>}
 */
export function inlineSegments(text) {
    const parts = String(text ?? '').split(/\*\*(.+?)\*\*/g);

    // Empty plain segments at the edges of the split carry no content.
    return parts
        .map((part, i) => ({ text: part, bold: i % 2 === 1 }))
        .filter((segment) => segment.bold || segment.text !== '');
}

/**
 * Parse report lines into blocks.
 *
 * Headings and paragraph lines become standalone blocks; consecutive
 * "- " lines become one list, with "  - " lines nested under the
 * previous top-level item.
 *
 * @param {string} content
 * @returns {Array<{ key: string, type: 'h1'|'h2'|'h3'|'list'|'p', text?: string, items?: Array<{ text: string, children: string[] }> }>}
 */
export function parseReport(content) {
    const lines = String(content ?? '').split('\n');
    const blocks = [];
    let items = null;
    let key = 0;

    const closeList = () => {
        if (items && items.length > 0) {
            blocks.push({ key: `list-${key++}`, type: 'list', items });
        }
        items = null;
    };

    for (const rawLine of lines) {
        const line = rawLine.replace(/\r$/, '');

        if (/^###\s/.test(line)) {
            closeList();
            blocks.push({ key: `h3-${key++}`, type: 'h3', text: line.replace(/^###\s+/, '') });
            continue;
        }

        if (/^##\s/.test(line)) {
            closeList();
            blocks.push({ key: `h2-${key++}`, type: 'h2', text: line.replace(/^##\s+/, '') });
            continue;
        }

        if (/^#\s/.test(line)) {
            closeList();
            blocks.push({ key: `h1-${key++}`, type: 'h1', text: line.replace(/^#\s+/, '') });
            continue;
        }

        const nested = line.match(/^  - (.*)$/);
        const top = line.match(/^- (.*)$/);

        if (top || nested) {
            if (!items) {
                items = [];
            }

            if (nested) {
                // Attach to the previous top-level item; a nested line with
                // no parent is promoted to top-level instead of being lost.
                const parent = items[items.length - 1];
                if (parent) {
                    parent.children.push(nested[1]);
                } else {
                    items.push({ text: nested[1], children: [] });
                }
                continue;
            }

            items.push({ text: top[1], children: [] });
            continue;
        }

        if (line.trim() === '') {
            closeList();
            continue;
        }

        closeList();
        blocks.push({ key: `p-${key++}`, type: 'p', text: line });
    }

    closeList();

    return blocks;
}
