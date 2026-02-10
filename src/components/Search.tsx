
import React, { useState, useEffect } from 'react';
import Fuse from 'fuse.js';
import { Search as SearchIcon, Loader2 } from 'lucide-react';

interface SearchItem {
    title: string;
    description: string;
    url: string;
    type: 'blog' | 'page';
}

export default function Search() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchItem[]>([]);
    const [fuse, setFuse] = useState<Fuse<SearchItem> | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        fetch('/search.json')
            .then(response => response.json())
            .then((data: SearchItem[]) => {
                const fuseInstance = new Fuse(data, {
                    keys: ['title', 'description'],
                    threshold: 0.3,
                    includeScore: true,
                });
                setFuse(fuseInstance);
                setIsLoading(false);
            })
            .catch((error) => {
                console.error("Error fetching search index:", error);
                setIsLoading(false);
            });
    }, []);

    useEffect(() => {
        if (fuse && query.length > 0) {
            const searchResults = fuse.search(query).map(result => result.item);
            setResults(searchResults.slice(0, 5));
        } else {
            setResults([]);
        }
    }, [query, fuse]);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    return (
        <div className="w-full max-w-md mx-auto relative">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="w-full px-4 py-3 pl-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-left text-gray-400 hover:bg-white/15 transition-all group flex items-center justify-between"
            >
                <div className="flex items-center gap-3">
                    <SearchIcon className="w-5 h-5 group-hover:text-white transition-colors" />
                    <span>Search posts and pages...</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-black/20 rounded text-xs text-gray-500 font-mono">
                    <span className="text-xs">⌘</span>
                    <span>K</span>
                </div>
            </button>

            {/* Modal Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Modal Content */}
                    <div className="relative w-full max-w-2xl bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center border-b border-white/10 px-4">
                            <SearchIcon className="w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search documentation, blogs, and more..."
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
                                            className="block px-4 py-3 rounded-lg hover:bg-white/5 transition-colors group"
                                            onClick={() => setIsOpen(false)}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className="text-gray-200 font-medium group-hover:text-blue-400 transition-colors">
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
                        ) : query.length > 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <p>No results found for "{query}"</p>
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
            )}
        </div>
    );
}
