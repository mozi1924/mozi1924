
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { scrollLock } from "../../../utils/scroll-lock";

const LightboxPortal = ({ children }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    return mounted ? createPortal(children, document.body) : null;
};

export default function Lightbox({ items }) {
    const [selectedIndex, setSelectedIndex] = useState(null);

    const openLightbox = (index) => setSelectedIndex(index);
    const closeLightbox = () => setSelectedIndex(null);

    const nextImage = (e) => {
        e.stopPropagation();
        setSelectedIndex((prev) => (prev + 1) % items.length);
    };

    const prevImage = (e) => {
        e.stopPropagation();
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
    };

    // Scroll Locking
    useEffect(() => {
        if (selectedIndex !== null) {
            scrollLock.lock();
        } else {
            // Unlocking with a delay to allow the fade-out animation
            scrollLock.unlock(400);
        }
    }, [selectedIndex !== null]);

    // Close on escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowRight') nextImage(e);
            if (e.key === 'ArrowLeft') prevImage(e);
        };
        if (selectedIndex !== null) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIndex]);

    if (!items || items.length === 0) return null;

    const currentItem = selectedIndex !== null ? items[selectedIndex] : null;

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 justify-center items-center">
                {items.map((item, index) => (
                    <div
                        key={index}
                        onClick={() => openLightbox(index)}
                        className="group relative aspect-video bg-[#222] rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
                    >
                        <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            loading="lazy"
                            decoding="async"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-6 text-center">
                            <h3 className="text-white font-bold text-xl mb-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">{item.title}</h3>
                            <span className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-full translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-100">View Project</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Lightbox Overlay */}
            {selectedIndex !== null && (
                <LightboxPortal>
                    <div
                        className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={closeLightbox}
                    >
                        <div className="relative w-full max-w-7xl h-[85vh] lg:h-[80vh] flex flex-col lg:flex-row bg-[#111] rounded-2xl overflow-hidden shadow-2xl border border-white/10" onClick={(e) => e.stopPropagation()}>

                            {/* Image Container */}
                            <div className="flex-1 relative bg-black flex items-center justify-center min-h-0">
                                <img
                                    src={currentItem.fullSize}
                                    alt={currentItem.title}
                                    className="max-w-full max-h-full object-contain cursor-pointer"
                                    onClick={nextImage}
                                    decoding="async"
                                />

                                {/* Navigation Buttons */}
                                <button
                                    onClick={prevImage}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-white/20 text-white rounded-full transition-colors"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={nextImage}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-white/20 text-white rounded-full transition-colors"
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Sidebar Info (Optional) */}
                            {currentItem.description && (
                                <div className="flex-shrink-0 lg:w-96 p-8 bg-[#161616] border-l border-white/5 overflow-y-auto h-[40%] lg:h-full">
                                    <div className="space-y-6">
                                        <div>
                                            <div className="text-gray-500 text-sm mb-1">{currentItem.date}</div>
                                            <h2 className="text-2xl font-bold text-white">{currentItem.title}</h2>
                                        </div>
                                        <div className="prose prose-invert prose-sm text-gray-400">
                                            {/* Simple markdown rendering or just text */}
                                            <p>{currentItem.description}</p>
                                        </div>

                                        {/* Optional Action Button */}
                                        {currentItem.button && (
                                            <div className="pt-4">
                                                <a
                                                    href={currentItem.button.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                                >
                                                    {currentItem.button.text}
                                                    <ExternalLink />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Close Button */}
                            <button
                                onClick={closeLightbox}
                                className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-red-500/80 text-white rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </LightboxPortal>
            )}
        </>
    );
}
