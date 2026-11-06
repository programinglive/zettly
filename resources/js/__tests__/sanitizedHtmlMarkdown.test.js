import { test } from 'node:test';
import assert from 'node:assert/strict';
import { marked } from 'marked';

test('Markdown parser converts Markdown headings, lists, bold and code into structured HTML', () => {
    marked.setOptions({ gfm: true, breaks: true });
    
    const markdown = `# HANDOVER 2026-11-06 — bw-server-clean
Lanjutan Todo #298.

## 1. Ringkasan tercepat
- Insiden CPU 100% pada **HTTP 422 storm**
- Rate limit pagar sementara

\`\`\`bash
systemctl restart tailscaled
\`\`\``;

    const parsed = marked.parse(markdown);
    assert.match(parsed, /<h1[^>]*>HANDOVER 2026-11-06 — bw-server-clean<\/h1>/);
    assert.match(parsed, /<h2[^>]*>1\. Ringkasan tercepat<\/h2>/);
    assert.match(parsed, /<ul>[\s\S]*<li>[\s\S]*<strong>HTTP 422 storm<\/strong>[\s\S]*<\/li>/);
    assert.match(parsed, /<pre><code class="language-bash">systemctl restart tailscaled\n<\/code><\/pre>/);
});

test('Markdown parser preserves existing rich HTML without breaking it', () => {
    marked.setOptions({ gfm: true, breaks: true });
    const tiptapHtml = '<p>Paragraph 1 with <strong>bold</strong></p><p>Paragraph 2</p>';
    const parsed = marked.parse(tiptapHtml);
    assert.equal(parsed.trim(), tiptapHtml);
});

test('Markdown parser preserves single line breaks as br tags', () => {
    marked.setOptions({ gfm: true, breaks: true });
    const textWithNewlines = 'Line 1\nLine 2\nLine 3';
    const parsed = marked.parse(textWithNewlines);
    assert.match(parsed, /<p>Line 1<br>\n?Line 2<br>\n?Line 3<\/p>/);
});
