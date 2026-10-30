
import React, { useState, useEffect } from 'react';

export default function MinecraftServerInfo() {
    const [javaSource, setJavaSource] = useState('Loading...');
    const [bedrockAddress, setBedrockAddress] = useState('Loading...');
    const [toastMessage, setToastMessage] = useState(null);

    // Fetch addresses on mount
    useEffect(() => {
        const fetchAddress = async (port, setter) => {
            try {
                const res = await fetch(`/ip.php?get=${port}`);
                const data = await res.json();
                if (data.success && data.data) {
                    setter(`${data.data.ip}:${data.data.port}`);
                } else {
                    setter("Unavailable");
                }
            } catch (e) {
                console.error(e);
                setter("Connection Failed");
            }
        };

        fetchAddress(25565, setJavaSource);
        fetchAddress(19132, setBedrockAddress);
    }, []);

    // Helper to copy text and show toast
    const copyToClipboard = (text) => {
        if (!text || text === 'Loading...' || text === 'Unavailable' || text === 'Connection Failed') return;

        navigator.clipboard.writeText(text).then(() => {
            setToastMessage('Address copied to clipboard!');
            setTimeout(() => setToastMessage(null), 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
            setToastMessage('Failed to copy');
            setTimeout(() => setToastMessage(null), 2000);
        });
    };

    return (
        <div className="pt-24 pb-20 px-6 max-w-4xl mx-auto text-center space-y-16">
            <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold text-white">Minecraft Server</h1>
                <p className="text-gray-400">Join our community!</p>
            </div>

            {/* Java Server */}
            <section className="space-y-6 bg-[#222] p-8 rounded-2xl border border-white/10 shadow-xl">
                <h2 className="text-2xl font-bold text-blue-400">Java Edition</h2>

                <div className="space-y-2">
                    <div className="text-gray-400 text-sm font-medium uppercase tracking-wider">Server Address</div>
                    <div className="text-3xl font-mono text-white font-bold break-all">play.mozi1924.com</div>
                    <button
                        className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors cursor-pointer"
                        onClick={() => copyToClipboard('play.mozi1924.com')}
                    >
                        Copy Address
                    </button>
                </div>

                <div className="pt-6 border-t border-white/5">
                    <details className="group">
                        <summary className="cursor-pointer text-gray-500 hover:text-gray-300 text-sm font-medium list-none select-none flex items-center justify-center gap-2 transition-colors">
                            <span>Show Backup Source Address (Use if SRV fails)</span>
                            <svg className="w-4 h-4 transform group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </summary>
                        <div className="mt-4 p-4 bg-[#111] rounded-xl border border-white/5 space-y-3 animate-fade-in">
                            <div className="font-mono text-lg text-gray-300">{javaSource}</div>
                            <button
                                className="text-sm px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors cursor-pointer"
                                onClick={() => copyToClipboard(javaSource)}
                            >
                                Copy Source
                            </button>
                        </div>
                    </details>
                </div>
            </section>

            {/* Bedrock Server */}
            <section className="space-y-6 bg-[#222] p-8 rounded-2xl border border-white/10 shadow-xl opacity-80">
                <h2 className="text-2xl font-bold text-green-400">Bedrock Edition</h2>

                <div className="space-y-2">
                    <div className="text-gray-400 text-sm font-medium uppercase tracking-wider">Server Address</div>
                    <div className="text-3xl font-mono text-white font-bold break-all">{bedrockAddress}</div>
                    <button
                        className="mt-4 px-6 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg font-medium transition-colors cursor-pointer"
                        onClick={() => copyToClipboard(bedrockAddress)}
                    >
                        Copy Address
                    </button>
                </div>
                <p className="text-xs text-gray-500">*Currently paused / In maintenance</p>
            </section>

            {/* Toast Notification */}
            <div
                className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-3 rounded-full shadow-2xl transform transition-all duration-300 z-50 font-medium ${toastMessage ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}
            >
                {toastMessage}
            </div>
        </div>
    );
}
