import { useMemo, useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import php from 'highlight.js/lib/languages/php';
import bash from 'highlight.js/lib/languages/bash';

// Register languages once
if (!hljs.getLanguage('javascript')) {
    hljs.registerLanguage('javascript', javascript);
}
if (!hljs.getLanguage('typescript')) {
    hljs.registerLanguage('typescript', typescript);
}
if (!hljs.getLanguage('json')) {
    hljs.registerLanguage('json', json);
}
if (!hljs.getLanguage('php')) {
    hljs.registerLanguage('php', php);
}
if (!hljs.getLanguage('bash')) {
    hljs.registerLanguage('bash', bash);
}

marked.setOptions({
    gfm: true,
    breaks: true,
});

export default function SanitizedHtml({ html, className = '' }) {
    const sanitized = useMemo(() => {
        if (!html) {
            return '';
        }

        const raw = typeof html === 'string' ? html : String(html);
        let parsed;
        try {
            parsed = marked.parse(raw);
        } catch {
            parsed = raw;
        }

        let cleaned = DOMPurify.sanitize(parsed);

        if (!cleaned) {
            return '';
        }

        cleaned = cleaned.replace(/(<p[^>]*>\s*<\/p>|<div[^>]*>\s*<\/div>|<br\s*\/?>(?:\s|&nbsp;)*)+/gi, '').trim();

        const trailingZeroPattern = /(?:\s|&nbsp;)*(?:<p[^>]*>\s*(?:&nbsp;|\s)*0(?:\s|&nbsp;)*<\/p>|<div[^>]*>\s*(?:&nbsp;|\s)*0(?:\s|&nbsp;)*<\/div>|(?:<br\s*\/?>(?:\s|&nbsp;)*)*0)(?:\s|&nbsp;)*$/gi;

        let next = cleaned;
        let previous;

        do {
            previous = next;
            next = next.replace(trailingZeroPattern, '').trim();
        } while (next !== previous);

        return next;
    }, [html]);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!sanitized || typeof window === 'undefined') {
            return;
        }

        const container = containerRef.current;
        if (!container) {
            return;
        }

        container.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    }, [sanitized]);

    if (!sanitized) {
        return null;
    }

    const combinedClassName = className ? `sanitized-html ${className}` : 'sanitized-html';

    return <div ref={containerRef} className={combinedClassName} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
