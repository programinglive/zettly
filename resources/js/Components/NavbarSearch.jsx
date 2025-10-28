import React from 'react';
import { usePage, router } from '@inertiajs/react';
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { Search, Loader2 } from 'lucide-react';

import { cn } from '../utils';
import { Input } from './ui/input';

const APP_ID = import.meta.env.VITE_ALGOLIA_APP_ID;
const SEARCH_KEY = import.meta.env.VITE_ALGOLIA_SEARCH_KEY;
const INDEX_SEARCH =
    import.meta.env.VITE_ALGOLIA_INDEX_SEARCH ?? import.meta.env.VITE_ALGOLIA_INDEX_TODOS;

const ALGOLIA_ATTRIBUTION_URL =
    'https://www.algolia.com/?utm_source=zettly&utm_medium=referral&utm_campaign=oss_search';

const ENABLED = Boolean(APP_ID && SEARCH_KEY && INDEX_SEARCH);

// Debug: Log missing config
if (!ENABLED && typeof window !== 'undefined') {
    console.warn('[Algolia Search] Configuration incomplete:', {
        APP_ID: APP_ID ? '✓' : '✗ missing',
        SEARCH_KEY: SEARCH_KEY ? '✓' : '✗ missing',
        INDEX_SEARCH: INDEX_SEARCH ? '✓' : '✗ missing',
    });
}

const searchClient = ENABLED ? algoliasearch(APP_ID, SEARCH_KEY) : null;

function buildSearchQueries(query) {
    // Search only in combined index to avoid duplicates
    const indexes = [
        { key: 'all', label: 'Results', indexName: INDEX_SEARCH },
    ].filter((entry) => Boolean(entry.indexName));

    return indexes.map((entry) => ({
        ...entry,
        searchParams: {
            indexName: entry.indexName,
            query,
            params: {
                hitsPerPage: 10,
            },
        },
    }));
}

function getHitTitle(hit) {
    return (
        hit.title ||
        hit.name ||
        hit.label ||
        (typeof hit.content === 'string' ? hit.content.slice(0, 60) : null) ||
        `Result ${hit.objectID}`
    );
}

function getHitDescription(hit) {
    if (typeof hit.description === 'string' && hit.description.trim()) {
        return hit.description.trim();
    }

    if (Array.isArray(hit.tags) && hit.tags.length > 0) {
        return hit.tags.slice(0, 3).join(', ');
    }

    if (typeof hit.content === 'string') {
        const text = hit.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        if (text) {
            return text.slice(0, 120) + (text.length > 120 ? '…' : '');
        }
    }

    if (typeof hit.snippet === 'string') {
        return hit.snippet;
    }

    return null;
}

function resolveUrl(hit, sectionKey) {
    if (typeof hit.url === 'string' && hit.url.length > 0) {
        return hit.url;
    }

    const hitType = typeof hit.type === 'string' ? hit.type.toLowerCase() : null;

    if (sectionKey === 'todos' || hitType === 'todo') {
        const id = hit.id || hit.todo_id || hit.objectID;
        if (id) {
            return `/todos/${id}`;
        }
    }

    if (sectionKey === 'notes' || hitType === 'note') {
        const id = hit.id || hit.note_id || hit.objectID;
        if (id) {
            return `/todos/${id}`;
        }
    }

    if (sectionKey === 'tags' || hit.tag_id !== undefined) {
        const id = hit.tag_id || hit.id || hit.objectID;
        if (id) {
            return `/manage/tags?highlight=${id}`;
        }
    }

    return null;
}
export function NavbarSearch({ className }) {
    const { props } = usePage();
    const userId = props?.auth?.user?.id;

    const [query, setQuery] = React.useState('');
    const [sections, setSections] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [open, setOpen] = React.useState(false);
    const [activeIndex, setActiveIndex] = React.useState(-1);

    const containerRef = React.useRef(null);
    const inputRef = React.useRef(null);
    const debounceRef = React.useRef(null);

    const queries = React.useMemo(() => {
        if (!query.trim()) {
            return [];
        }

        return buildSearchQueries(query.trim());
    }, [query]);

    const flatResults = React.useMemo(() => {
        const items = [];
        sections.forEach((section, sectionIdx) => {
            section.hits.forEach((hit, hitIdx) => {
                items.push({ section, hit, sectionIdx, hitIdx });
            });
        });
        return items;
    }, [sections]);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (!containerRef.current) return;
            if (containerRef.current.contains(event.target)) return;
            setOpen(false);
            setActiveIndex(-1);
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    React.useEffect(() => {
        if (!ENABLED) {
            setSections([]);
            setLoading(false);
            setError(null);
            return;
        }

        if (!query.trim()) {
            setSections([]);
            setLoading(false);
            setError(null);
            return;
        }

        if (query.trim().length < 2) {
            setSections([]);
            setLoading(false);
            setError(null);
            return;
        }

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        setLoading(true);
        setError(null);

        debounceRef.current = setTimeout(async () => {
            const entries = queries;
            if (!entries.length || !searchClient) {
                setSections([]);
                setLoading(false);
                return;
            }

            try {
                // Show full-page loading overlay
                const overlay = document.getElementById('search-loading-overlay');
                if (overlay) overlay.style.display = 'flex';

                const { results } = await searchClient.search(
                    entries.map((entry) => entry.searchParams)
                );

                // Hide overlay
                if (overlay) overlay.style.display = 'none';

                console.log('[NavbarSearch] Raw results:', results);
                console.log('[NavbarSearch] Query:', query);
                console.log('[NavbarSearch] Entries:', entries);

                // Deep debug: log each result structure
                results.forEach((result, idx) => {
                    console.log(`[NavbarSearch] Result ${idx} (${entries[idx]?.key}):`, {
                        hasHits: !!result.hits,
                        hitsCount: result.hits?.length || 0,
                        hitsStructure: result.hits?.[0],
                        fullResult: result,
                    });
                });

                const sectionsByType = {
                    todos: { key: 'todos', label: 'Todos', hits: [] },
                    notes: { key: 'notes', label: 'Notes', hits: [] },
                    tags: { key: 'tags', label: 'Tags', hits: [] },
                };

                results.forEach((result) => {
                    (result.hits || []).forEach((hit) => {
                        if (userId) {
                            const hitUserId = hit.user_id ?? hit.userId ?? hit.userID;
                            if (hitUserId === undefined || String(hitUserId) !== String(userId)) {
                                return;
                            }
                        }

                        const hitType = typeof hit.type === 'string' ? hit.type.toLowerCase() : null;

                        if (hitType === 'note') {
                            sectionsByType.notes.hits.push(hit);
                        } else if (hitType === 'todo') {
                            sectionsByType.todos.hits.push(hit);
                        } else if (hit.tag_id !== undefined) {
                            sectionsByType.tags.hits.push(hit);
                        } else {
                            sectionsByType.todos.hits.push(hit);
                        }
                    });
                });

                const mappedSections = Object.values(sectionsByType).filter(
                    (section) => section.hits.length > 0
                );

                console.log('[NavbarSearch] Mapped sections:', mappedSections);
                console.log('[NavbarSearch] Sections count:', mappedSections.length);

                setSections(mappedSections);
                setOpen(mappedSections.length > 0);
                setActiveIndex(mappedSections.length ? 0 : -1);
                setLoading(false);
            } catch (searchError) {
                console.error('Algolia search error', searchError);
                setError('Unable to load search results right now.');
                setLoading(false);
            }
        }, 250);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [query, queries]);

    const handleKeyDown = React.useCallback((event) => {
        if (!flatResults.length) {
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((prev) => {
                const next = prev + 1;
                return next >= flatResults.length ? 0 : next;
            });
            setOpen(true);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((prev) => {
                const next = prev - 1;
                return next < 0 ? flatResults.length - 1 : next;
            });
            setOpen(true);
        } else if (event.key === 'Enter') {
            if (activeIndex >= 0 && activeIndex < flatResults.length) {
                event.preventDefault();
                const selected = flatResults[activeIndex];
                const url = resolveUrl(selected.hit, selected.section.key);
                if (url) {
                    router.visit(url);
                    setOpen(false);
                    setQuery('');
                    inputRef.current?.blur();
                }
            }
        } else if (event.key === 'Escape') {
            setOpen(false);
            setActiveIndex(-1);
        }
    }, [flatResults, activeIndex]);

    const handleSubmit = React.useCallback((event) => {
        event.preventDefault();
        if (!flatResults.length) {
            return;
        }

        const first = flatResults[0];
        const url = resolveUrl(first.hit, first.section.key);
        if (url) {
            router.visit(url);
            setOpen(false);
            setQuery('');
        }
    }, [flatResults]);

    const renderContent = () => {
        if (!ENABLED) {
            return (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    <p className="mb-3">Configure Algolia to enable search.</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="px-4 py-4 text-sm text-red-600 dark:text-red-400">
                    {error}
                </div>
            );
        }

        if (loading) {
            return (
                <div className="px-4 py-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching…
                </div>
            );
        }

        if (!sections.length) {
            return (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    <p className="mb-3">No results found</p>
                </div>
            );
        }

        return (
            <div className="max-h-96 overflow-y-auto">
                {sections.map((section, sectionIdx) => (
                    <div key={section.key}>
                        {sectionIdx > 0 && <div className="border-t border-border" />}
                        <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30">
                            {section.label}
                        </div>
                        <ul className="divide-y divide-border">
                            {section.hits.map((hit) => {
                                const isActive = flatResults[activeIndex]?.hit?.objectID === hit.objectID;
                                const url = resolveUrl(hit, section.key);
                                const title = getHitTitle(hit);
                                const description = getHitDescription(hit);

                                return (
                                    <li key={`${section.key}-${hit.objectID}`}>
                                        <button
                                            type="button"
                                            disabled={!url}
                                            onMouseEnter={() => {
                                                const idx = flatResults.findIndex(
                                                    (item) => item.hit.objectID === hit.objectID && item.section.key === section.key
                                                );
                                                if (idx >= 0) {
                                                    setActiveIndex(idx);
                                                }
                                            }}
                                            onClick={() => {
                                                if (!url) return;
                                                router.visit(url);
                                                setOpen(false);
                                                setQuery('');
                                            }}
                                            className={cn(
                                                'w-full text-left px-4 py-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                                                isActive
                                                    ? 'bg-indigo-50 dark:bg-indigo-500/10'
                                                    : 'hover:bg-muted'
                                            )}
                                        >
                                            <div className="font-medium text-foreground line-clamp-1">{title}</div>
                                            {description && (
                                                <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                                                    {description}
                                                </div>
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
                <div className="border-t border-border px-4 py-2 bg-muted/30 text-right">
                    <a
                        href={ALGOLIA_ATTRIBUTION_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <span>Search by</span>
                        <img
                            src="/images/algolia.svg"
                            alt="Algolia"
                            className="h-4"
                            loading="lazy"
                        />
                    </a>
                </div>
            </div>
        );
    };

    return (
        <div ref={containerRef} className={cn('relative w-full', className)}>
            <form onSubmit={handleSubmit}>
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        ref={inputRef}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => {
                            if (sections.length) {
                                setOpen(true);
                            }
                        }}
                        placeholder={ENABLED ? 'Search todos, notes, tags…' : 'Search unavailable'}
                        className="pl-9 h-11 rounded-full border border-border/60 bg-white/95 text-foreground shadow-sm transition focus-visible:ring-2 focus-visible:ring-indigo-400/40 focus-visible:ring-offset-0 dark:bg-slate-900/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:border-slate-700"
                        aria-expanded={open}
                        aria-autocomplete="list"
                        aria-controls="navbar-search-results"
                    />
                </div>
            </form>

            {open && (
                <div
                    id="navbar-search-results"
                    className="absolute left-0 right-0 top-full mt-2 rounded-lg border border-border bg-popover shadow-lg max-h-96 overflow-y-auto sm:max-h-80"
                >
                    {renderContent()}
                </div>
            )}
        </div>
    );
}

export default NavbarSearch;
