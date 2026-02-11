import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search as SearchIcon, Loader2, Clock, X } from 'lucide-react';

interface Props {
    variant?: 'inline' | 'icon';
    type?: 'full' | 'trigger' | 'modal';
}

interface SearchResult {
    id: string;
    data: () => Promise<any>;
    url: string;
    excerpt: string;
    meta: {
        title: string;
        image?: string;
    };
}

// Custom event to trigger search open
const OPEN_SEARCH_EVENT = 'open-search-modal';

const openSearchModal = () => {
    window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT));
};

const SearchTrigger = ({ variant = 'inline' }: { variant?: 'inline' | 'icon' }) => {
    if (variant === 'inline') {
        return (
            <button
                onClick={openSearchModal}
                className="w-full px-4 py-3 pl-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-left text-gray-400 hover:bg-white/15 transition-all group flex items-center justify-between"
            >
                <div className="flex items-center gap-3">
                    <SearchIcon className="w-5 h-5 group-hover:text-white transition-colors" />
                    <span>Search...</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-black/20 rounded text-xs text-gray-500 font-mono">
                    <span className="text-xs">⌘</span>
                    <span>K</span>
                </div>
            </button>
        );
    }
    return (
        <button
            onClick={openSearchModal}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            aria-label="Search"
        >
            <SearchIcon className="w-5 h-5" />
        </button>
    );
};

const SearchDialog = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [pagefind, setPagefind] = useState<any>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [recents, setRecents] = useState<string[]>([]);

    // Refs for focus management
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);
    const interactionType = useRef<'mouse' | 'keyboard'>('keyboard');

    useEffect(() => {
        setIsMounted(true);
        // Pre-load pagefind
        const initPagefind = async () => {
            if (import.meta.env.DEV) return;
            try {
                // @ts-ignore
                if (typeof window.pagefind === "undefined") {
                    try {
                        // Dynamic import from the build output
                        // Use a variable to hide the path from Vite's static analysis during dev
                        const pagefindPath = "/pagefind/pagefind.js";
                        // @ts-ignore
                        const pf = await import(/* @vite-ignore */ pagefindPath);
                        if (pf.options) {
                            await pf.options({ showImages: false, excerptLength: 15 });
                            setPagefind(pf);
                        }
                    } catch (e) {
                        console.warn("Pagefind not found", e);
                    }
                } else {
                    // @ts-ignore
                    setPagefind(window.pagefind);
                }
            } catch (e) {
                console.error("Failed to initialize Pagefind:", e);
            }
        };
        initPagefind();
    }, []);

    // Listen for custom open event
    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener(OPEN_SEARCH_EVENT, handleOpen);
        return () => window.removeEventListener(OPEN_SEARCH_EVENT, handleOpen);
    }, []);

    const performSearch = useCallback(async (q: string) => {
        if (!q.trim() || !pagefind) {
            setResults([]);
            return;
        }

        setIsLoading(true);
        try {
            const search = await pagefind.search(q);
            // Load the top 8 results data immediately
            const topResults = await Promise.all(
                search.results.slice(0, 8).map((r: SearchResult) => r.data())
            );
            setResults(topResults);
            setSelectedIndex(0);
        } catch (e) {
            console.error("Search error:", e);
        } finally {
            setIsLoading(false);
        }
    }, [pagefind]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isOpen) performSearch(query);
        }, 150);
        return () => clearTimeout(timer);
    }, [query, isOpen, performSearch]);

    // Reset state/overflow when opening
    useEffect(() => {
        const updateOverflow = (hidden: boolean) => {
            const osInstance = (window as any).overlayscrollbarsInstance;
            if (osInstance) {
                osInstance.options({ overflow: { y: hidden ? 'hidden' : 'scroll' } });
            } else {
                if (hidden) {
                    document.body.classList.add('search-open');
                    document.body.style.paddingRight = "var(--os-scrollbar-placeholder-size, 0px)";
                } else {
                    document.body.classList.remove('search-open');
                    document.body.style.paddingRight = "";
                }
            }
        };

        if (isOpen) {
            updateOverflow(true);
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            updateOverflow(false);
        }
        return () => { updateOverflow(false); };
    }, [isOpen]);

    // Animation visibility
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => setIsVisible(true), 10);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [isOpen]);

    // Load Recents
    useEffect(() => {
        const stored = localStorage.getItem('search-recents');
        if (stored) setRecents(JSON.parse(stored).slice(0, 5));
    }, []);

    const addToRecents = (q: string) => {
        if (!q.trim()) return;
        setRecents(prev => {
            const newRecents = [q, ...prev.filter(r => r !== q)].slice(0, 5);
            localStorage.setItem('search-recents', JSON.stringify(newRecents));
            return newRecents;
        });
    };

    const removeFromRecents = (q: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setRecents(prev => {
            const newRecents = prev.filter(r => r !== q);
            localStorage.setItem('search-recents', JSON.stringify(newRecents));
            return newRecents;
        });
    };

    const handleSelect = (url: string) => {
        addToRecents(query);
        window.location.href = url.replace(/(\.html|\/index\.html)$/, '');
        setIsOpen(false);
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Global shortcut (Cmd+K) handled by dispatch event primarily, 
            // but we can also handle it here if focused anywhere
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                // If it's closed, the global listener opens it. If open, focus input?
                if (!isOpen) openSearchModal();
                else inputRef.current?.focus();
                return;
            }

            if (!isOpen) return;

            if (e.key === 'Escape') setIsOpen(false);

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                interactionType.current = 'keyboard';
                setSelectedIndex(i => (i + 1) % Math.max(1, results.length));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                interactionType.current = 'keyboard';
                setSelectedIndex(i => (i - 1 + results.length) % Math.max(1, results.length));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (results[selectedIndex]) {
                    handleSelect(results[selectedIndex].url);
                } else if (!query && recents.length > 0 && selectedIndex < recents.length) {
                    // Could handle recent selection here if desired
                    setQuery(recents[selectedIndex]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, results, selectedIndex, query, recents]);

    // Scroll selected index into view
    useEffect(() => {
        if (!resultsRef.current || interactionType.current !== 'keyboard') return;
        requestAnimationFrame(() => {
            const selectedElement = resultsRef.current?.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
            if (selectedElement) {
                const container = resultsRef.current as HTMLDivElement;
                const containerHeight = container.clientHeight;
                const itemTop = selectedElement.offsetTop;
                const itemHeight = selectedElement.clientHeight;
                const targetScroll = itemTop - (containerHeight / 2) + (itemHeight / 2);

                container.scrollTo({ top: targetScroll, behavior: 'smooth' });
            }
        });
    }, [selectedIndex, results]);

    if (!isMounted) return null;

    return createPortal(
        <div
            className={`fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 transition-all duration-300 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        >
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen && isVisible ? 'opacity-100' : 'opacity-0'}`}
                onClick={() => setIsOpen(false)}
            />

            {/* Content */}
            <div className={`relative w-full max-w-2xl bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] transition-all duration-300 delay-75 ${isOpen && isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-4'}`}>

                {/* Header/Input */}
                <div className="flex items-center border-b border-white/10 px-4 py-4 shrink-0">
                    <SearchIcon className="w-5 h-5 text-gray-400 mr-3" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder={pagefind ? "Search articles, blogs..." : (import.meta.env.DEV ? "Search (Styling Preview)" : "Search unavailable (build required)")}
                        disabled={!pagefind && !import.meta.env.DEV}
                        className="w-full bg-transparent text-white placeholder-gray-500 focus:outline-none text-lg"
                    />
                    {isLoading && <Loader2 className="w-5 h-5 animate-spin text-gray-500 ml-2" />}
                    {!isLoading && query && (
                        <button
                            onClick={() => setQuery('')}
                            className="text-gray-500 hover:text-gray-300 text-xs uppercase font-medium px-2"
                        >
                            Clear
                        </button>
                    )}
                </div>

                {/* Results Container */}
                <div className="overflow-y-auto custom-scrollbar flex-grow p-2 relative" ref={resultsRef}>
                    {!pagefind && (
                        <div className="p-8 text-center text-gray-500">
                            {import.meta.env.DEV ? (
                                <>
                                    <p>Search functionality is disabled in preview.</p>
                                    <p className="text-sm mt-2 opacity-50">Styling preview mode</p>
                                </>
                            ) : (
                                <>
                                    <p>Search index not found.</p>
                                    <p className="text-sm mt-2 opacity-50">Please run `npm run build` to generate the index.</p>
                                </>
                            )}
                        </div>
                    )}

                    {/* Recent Searches */}
                    {pagefind && !query && recents.length > 0 && (
                        <div className="px-2">
                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 mt-2 px-2">Recent</h4>
                            {recents.map((recent, index) => (
                                <div
                                    key={recent}
                                    onClick={() => setQuery(recent)}
                                    className="group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer text-gray-300 hover:text-white transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 text-gray-600 group-hover:text-gray-400">
                                            <Clock className="w-4 h-4" />
                                        </div>
                                        <span>{recent}</span>
                                    </div>
                                    <button
                                        onClick={(e) => removeFromRecents(recent, e)}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-gray-500 hover:text-gray-300"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Empty State */}
                    {pagefind && !query && recents.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            <p>Type to start searching...</p>
                        </div>
                    )}

                    {/* No Results */}
                    {pagefind && results.length === 0 && query.trim() && !isLoading && (
                        <div className="p-8 text-center text-gray-500">
                            <p>No results found for "{query}"</p>
                        </div>
                    )}

                    {/* Results List */}
                    {results.map((result, index) => (
                        <a
                            key={result.url}
                            data-index={index}
                            href={result.url.replace(/(\.html|\/index\.html)$/, '')}
                            className={`group block px-4 py-3 rounded-lg transition-colors mb-1 ${index === selectedIndex ? 'bg-white/10' : 'hover:bg-white/5'}`}
                            onClick={(e) => {
                                e.preventDefault();
                                handleSelect(result.url);
                            }}
                            onMouseEnter={() => {
                                interactionType.current = 'mouse';
                                setSelectedIndex(index);
                            }}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <h3 className={`font-medium text-lg leading-tight ${index === selectedIndex ? 'text-[#3F89FC]' : 'text-gray-200 group-hover:text-[#3F89FC]'}`}>
                                    {result.meta.title}
                                </h3>
                                <div className="flex gap-2">
                                    {result.url.includes('/blogs/') && (
                                        <span className="text-[10px] tracking-wider uppercase px-1.5 py-0.5 rounded border border-white/10 text-gray-500 bg-white/5">
                                            Blog
                                        </span>
                                    )}
                                    {result.url.includes('/article/') && (
                                        <span className="text-[10px] tracking-wider uppercase px-1.5 py-0.5 rounded border border-white/10 text-gray-500 bg-white/5">
                                            Article
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p
                                className="text-gray-400 text-sm line-clamp-2"
                                dangerouslySetInnerHTML={{ __html: result.excerpt }}
                            />
                        </a>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 bg-white/5 border-t border-white/10 flex justify-between items-center text-xs text-gray-500 shrink-0">
                    <div className="flex gap-4">
                        {results.length > 0 && <span>{results.length} results</span>}
                    </div>
                    <div className="flex gap-3">
                        <span className="flex items-center gap-1"><kbd className="bg-black/20 px-1 rounded border border-white/10 font-sans">↵</kbd> select</span>
                        <span className="flex items-center gap-1"><kbd className="bg-black/20 px-1 rounded border border-white/10 font-sans">↓↑</kbd> navigate</span>
                        <span className="flex items-center gap-1"><kbd className="bg-black/20 px-1 rounded border border-white/10 font-sans">esc</kbd> close</span>
                    </div>
                </div>
            </div>
        </div>
        , document.body);
};


export default function SearchModal({ variant = 'inline', type = 'full' }: Props) {
    // 1. Trigger Only - Render lightweight button
    if (type === 'trigger') {
        return <SearchTrigger variant={variant} />;
    }

    // 2. Modal Only - Render heavy logic
    if (type === 'modal') {
        return <SearchDialog />;
    }

    // 3. Full (Legacy) - Render both
    return (
        <>
            <SearchTrigger variant={variant} />
            <SearchDialog />
        </>
    );
}
