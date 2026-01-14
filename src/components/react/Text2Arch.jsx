
import React, { useState } from 'react';

// Logic ported from text2arch.js
const textToBase4 = (text) => {
  const encoder = new TextEncoder();
  const binaryRepresentation = Array.from(encoder.encode(text)).map(byte =>
    byte.toString(2).padStart(8, '0')
  ).join('');

  let base4Representation = '';
  for (let i = 0; i < binaryRepresentation.length; i += 2) {
    base4Representation += parseInt(binaryRepresentation.slice(i, i + 2), 2).toString();
  }
  return base4Representation;
};

const base4ToText = (base4Text) => {
  const binaryRepresentation = Array.from(base4Text).map(digit =>
    parseInt(digit).toString(2).padStart(2, '0')
  ).join('');

  const bytes = [];
  for (let i = 0; i < binaryRepresentation.length; i += 8) {
    // Only push if we have a full byte
    if (i + 8 <= binaryRepresentation.length) {
      bytes.push(parseInt(binaryRepresentation.slice(i, i + 8), 2));
    }
  }

  const decoder = new TextDecoder();
  return decoder.decode(new Uint8Array(bytes));
};

const replaceBase4WithWords = (base4Text) => {
  const replacements = { '0': 'i', '1': 'use', '2': 'arch', '3': 'btw' };
  return Array.from(base4Text).map(digit => replacements[digit]).join(' ');
};

const wordsToBase4 = (replacedText) => {
  const replacements = { 'i': '0', 'use': '1', 'arch': '2', 'btw': '3' };

  // Split by spaces and filter out empty strings
  const words = replacedText.split(' ').filter(word => word.trim() !== '');

  return words.map(word => {
    const normalizedWord = word.toLowerCase();
    if (replacements[normalizedWord] !== undefined) {
      return replacements[normalizedWord];
    } else {
      // For React, we'll throw and catch in the handler
      throw new Error(`Invalid word: ${word}`);
    }
  }).join('');
};

export default function Text2Arch() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState('encrypt'); // 'encrypt' or 'decrypt'
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Real-time processing
  React.useEffect(() => {
    if (!input.trim()) {
      setOutput('Your converted text will appear here...');
      setError('');
      return;
    }

    try {
      let result = '';
      if (mode === 'encrypt') {
        const base4Text = textToBase4(input);
        result = replaceBase4WithWords(base4Text);
      } else {
        const base4Text = wordsToBase4(input);
        result = base4ToText(base4Text);
      }
      setOutput(result);
      setError('');
    } catch (e) {
      // Only show error if we have substantial input to avoid flashing on partial typing
      if (input.length > 3) {
        setError(e.message || "An error occurred during processing");
        setOutput('');
      }
    }
  }, [input, mode]);

  const handleCopy = () => {
    if (!output || output === 'Your converted text will appear here...') return;
    navigator.clipboard.writeText(output).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div className={`bg-[#222] p-8 rounded-xl shadow-lg border transition-colors duration-300 max-w-2xl mx-auto ${error ? 'border-red-500' : copySuccess ? 'border-green-500' : 'border-white/5'}`}>
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => { setMode('encrypt'); setInput(''); setOutput(''); setError(''); }}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${mode === 'encrypt'
              ? 'bg-white text-black'
              : 'bg-[#333] text-gray-400 hover:bg-[#444]'
            }`}
        >
          Encryption
        </button>
        <button
          onClick={() => { setMode('decrypt'); setInput(''); setOutput(''); setError(''); }}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${mode === 'decrypt'
              ? 'bg-white text-black'
              : 'bg-[#333] text-gray-400 hover:bg-[#444]'
            }`}
        >
          Decryption
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            {mode === 'encrypt' ? 'Input Text' : 'Input ArchBase4 Code'}
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-32 bg-[#111] text-white p-4 rounded-lg focus:ring-2 focus:ring-white/20 outline-none resize-none border border-white/10"
            placeholder={mode === 'encrypt' ? "Type something to encrypt..." : "Paste code to decrypt (e.g. 'arch btw use i')..."}
          />
        </div>

        {/* Button removed for real-time update */}

        <div className="relative group cursor-pointer" onClick={handleCopy}>
          <label className="block text-sm text-gray-400 mb-2">Output {copySuccess && <span className="text-green-500 ml-2">- Copied!</span>}</label>
          <div className="relative">
            <textarea
              readOnly
              value={error || output}
              className={`w-full h-32 bg-[#1a1a1a] font-mono p-4 rounded-lg border border-white/10 outline-none resize-none cursor-pointer ${error ? 'text-red-400' : 'text-green-400'}`}
              placeholder="Result will appear here..."
            />
            {!error && output && output !== 'Your converted text will appear here...' && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white text-xs px-2 py-1 rounded">
                Click to Copy
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
