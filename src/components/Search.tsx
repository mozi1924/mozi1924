
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Fuse from 'fuse.js';
import { Search as SearchIcon, Loader2 } from 'lucide-react';

interface SearchItem {
    title: string;
    description: string;
    url: string;
    type: 'blog' | 'page' | 'article';
    content: string;
}

interface SearchProps {
    variant?: 'inline' | 'icon' | 'global';
}

export default function Search({ variant = 'inline' }: SearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchItem[]>([]);
    const [fuse, setFuse] = useState<Fuse<SearchItem> | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);
    const [hasLoadedIndex, setHasLoadedIndex] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const loadIndex = useCallback(async () => {
        if (hasLoadedIndex || isLoading) return;

        setIsLoading(true);
        try {
            const response = await fetch('/search.json');
            if (!response.ok) throw new Error('Failed to fetch search index');
            const data: SearchItem[] = await response.json();

            const fuseInstance = new Fuse(data, {
                keys: [
                    { name: 'title', weight: 0.7 },
                    { name: 'description', weight: 0.5 },
                    { name: 'content', weight: 0.3 }
                ],
                threshold: 0.3,
                includeScore: true,
            });

            setFuse(fuseInstance);
            setHasLoadedIndex(true);
        } catch (error) {
            console.error("Error fetching search index:", error);
        } finally {
            setIsLoading(false);
        }
    }, [hasLoadedIndex, isLoading]);

    const handleOpen = useCallback(() => {
        setIsOpen(true);
        loadIndex();
    }, [loadIndex]);

    useEffect(() => {
        if (fuse && query.length > 0) {
            const searchResults = fuse.search(query).map(result => result.item);
            setResults(searchResults.slice(0, 5));
            setSelectedIndex(0); // Reset selection when results change
        } else {
            setResults([]);
            setSelectedIndex(0);
        }
    }, [query, fuse]);

    const handleInputKeyDown = (e: React.KeyboardEvent) => {
        if (results.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selected = results[selectedIndex];
            if (selected) {
                window.location.href = selected.url;
                setIsOpen(false);
            }
        }
    };

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            // Small delay to allow mount before transition
            const timer = setTimeout(() => setIsVisible(true), 10);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
            const timer = setTimeout(() => setShouldRender(false), 500); // 500ms matches backdrop transition duration
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                handleOpen();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleOpen]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        const updateOverflow = (hidden: boolean) => {
            const osInstance = (window as any).overlayscrollbarsInstance;

            if (osInstance) {
                if (hidden) {
                    osInstance.options({ overflow: { y: 'hidden' } });
                } else {
                    osInstance.options({ overflow: { y: 'scroll' } });
                }
            } else {
                if (hidden) {
                    document.body.style.overflow = 'hidden';
                    // Add class for additionalCSS control if needed
                    document.body.classList.add('search-open');
                } else {
                    document.body.style.overflow = '';
                    document.body.classList.remove('search-open');
                }
            }
        };

        if (shouldRender) {
            updateOverflow(true);
        } else {
            // Only restore if we're not unmounting, or if we are unmounting and it was open
            updateOverflow(false);
        }

        return () => {
            updateOverflow(false);
        };
    }, [shouldRender]);

    return (
        <>
            {variant === 'inline' && (
                <div className="w-full max-w-md mx-auto relative">
                    {/* Trigger Button (Big) */}
                    <button
                        onClick={handleOpen}
                        className="w-full px-4 py-3 pl-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-left text-gray-400 hover:bg-white/15 transition-all group flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <SearchIcon className="w-5 h-5 group-hover:text-white transition-colors" />
                            <span>Search articles, blogs, and more...</span>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 bg-black/20 rounded text-xs text-gray-500 font-mono">
                            <span className="text-xs">⌘</span>
                            <span>K</span>
                        </div>
                    </button>
                </div>
            )}

            {variant === 'icon' && (
                <button
                    onClick={handleOpen}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                    aria-label="Search"
                >
                    <SearchIcon className="w-5 h-5" />
                </button>
            )}

            {/* Modal Overlay */}
            {shouldRender && createPortal(
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
                    {/* Backdrop */}
                    <div
                        className={`absolute inset-0 bg-black/60 shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isVisible ? 'opacity-100 backdrop-blur-md' : 'opacity-0 backdrop-blur-none'
                            }`}
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Modal Content */}
                    <div className={`relative w-full max-w-2xl bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1) ${isVisible
                        ? 'translate-y-0 opacity-100 scale-100 blur-0'
                        : '-translate-y-4 opacity-0 scale-95 blur-sm'
                        }`}>
                        <div className="flex items-center border-b border-white/10 px-4">
                            <SearchIcon className="w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleInputKeyDown}
                                placeholder="Search articles, blogs, and full-text content..."
                                className="w-full px-4 py-4 bg-transparent text-white placeholder-gray-500 focus:outline-none text-lg"
                                autoFocus
                            />
                            {isLoading && <Loader2 className="w-5 h-5 animate-spin text-gray-500" />}
                        </div>

                        {/* Results */}
                        {results.length > 0 ? (
                            <div className="max-h-[60vh] overflow-y-auto">
                                <div className="p-2 space-y-1">
                                    {results.map((result, index) => (
                                        <a
                                            key={index}
                                            href={result.url}
                                            className={`block px-4 py-3 rounded-lg transition-colors group ${index === selectedIndex ? 'bg-white/10' : 'hover:bg-white/5'
                                                }`}
                                            onClick={() => setIsOpen(false)}
                                            onMouseEnter={() => setSelectedIndex(index)}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className={`font-medium transition-colors ${index === selectedIndex ? 'text-blue-400' : 'text-gray-200 group-hover:text-blue-400'
                                                    }`}>
                                                    {result.title}
                                                </h3>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-500 border border-white/5 capitalize">
                                                    {result.type}
                                                </span>
                                            </div>
                                            {result.description && (
                                                <p className="text-gray-500 text-sm line-clamp-1">
                                                    {result.description}
                                                </p>
                                            )}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        ) : query.length > 0 && !isLoading ? (
                            <div className="p-8 text-center text-gray-500">
                                <p>No results found for "{query}"</p>
                            </div>
                        ) : isLoading ? (
                            <div className="p-8 text-center text-gray-500 text-sm">
                                <p>Loading search index...</p>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-gray-500 text-sm">
                                <p>Type to start searching...</p>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="px-4 py-3 bg-white/5 border-t border-white/10 flex justify-end gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-black/20 rounded border border-white/10">↵</kbd>
                                <span>to select</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-black/20 rounded border border-white/10">esc</kbd>
                                <span>to close</span>
                            </div>
                        </div>
                    </div>
                </div>
                , document.body)}
        </>
    );
}
