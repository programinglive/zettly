import React from 'react';
import { inlineSegments, parseReport } from '../lib/reportParser';

/**
 * Renders the parsed blocks of a report into styled React nodes.
 *
 * Parsing lives in lib/reportParser.js (pure, unit-tested); this file only
 * maps blocks to markup, so there is no HTML parsing and no
 * dangerouslySetInnerHTML anywhere.
 */

/**
 * @param {{ text: string, bold: boolean }} segment
 * @param {string} keyPrefix
 */
function InlineSegments({ text, keyPrefix }) {
    return (
        <>
            {inlineSegments(text).map((segment, i) => (
                segment.bold
                    ? <strong key={`${keyPrefix}-b${i}`} className="font-semibold text-gray-900 dark:text-white">{segment.text}</strong>
                    : <React.Fragment key={`${keyPrefix}-t${i}`}>{segment.text}</React.Fragment>
            ))}
        </>
    );
}

function ListItem({ item }) {
    return (
        <li className="flex gap-2">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-300 dark:bg-slate-600" />
            <div className="min-w-0 space-y-1.5">
                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                    <InlineSegments text={item.text} keyPrefix={`li-${item.text.slice(0, 12)}`} />
                </p>
                {item.children.map((child, i) => (
                    <div key={i} className="flex gap-2 pl-1">
                        <span aria-hidden="true" className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-gray-300 dark:bg-slate-600" />
                        <p className="text-xs leading-relaxed text-gray-500 dark:text-slate-400">
                            <InlineSegments text={child} keyPrefix={`child-${i}`} />
                        </p>
                    </div>
                ))}
            </div>
        </li>
    );
}

/**
 * The report body itself: title, headline stats, sections and bullets.
 *
 * @param {{ content: string }} props
 */
export default function ReportContent({ content }) {
    const blocks = parseReport(content);

    return (
        <div className="space-y-1">
            {blocks.map((block) => {
                switch (block.type) {
                    case 'h1':
                        return (
                            <h1 key={block.key} className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                                <InlineSegments text={block.text} keyPrefix={block.key} />
                            </h1>
                        );
                    case 'h2':
                        return (
                            <h2 key={block.key} className="mb-2 mt-6 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">
                                <InlineSegments text={block.text} keyPrefix={block.key} />
                            </h2>
                        );
                    case 'h3':
                        return (
                            <h3 key={block.key} className="mb-1 mt-4 text-sm font-semibold text-gray-900 dark:text-white">
                                <InlineSegments text={block.text} keyPrefix={block.key} />
                            </h3>
                        );
                    case 'list':
                        return (
                            <ul key={block.key} className="space-y-2 py-1">
                                {block.items.map((item) => (
                                    <ListItem key={`${block.key}-${item.text.slice(0, 24)}`} item={item} />
                                ))}
                            </ul>
                        );
                    case 'p':
                    default:
                        return (
                            <p key={block.key} className="text-sm text-gray-700 dark:text-gray-300">
                                <InlineSegments text={block.text} keyPrefix={block.key} />
                            </p>
                        );
                }
            })}
        </div>
    );
}
