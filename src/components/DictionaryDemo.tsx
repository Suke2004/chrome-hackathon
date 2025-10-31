import { useState } from "react";
import { DictionaryTooltip } from "./DictionaryTooltip";

export const DictionaryDemo = () => {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [inputValue, setInputValue] = useState("");

  const handleWordClick = (word: string, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.top - 10 });
    setSelectedWord(word);
  };

  const closeTooltip = () => {
    setSelectedWord(null);
  };

  const highlightWords = [
    "dictionary",
    "extension",
    "instant",
    "definitions",
    "webpage",
    "highlighted",
  ];

  const demoText = `The dictionary extension provides instant word definitions when you select text on any webpage. Simply click on any highlighted word below to see how it works:`;

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim().length > 0) {
      // use the typed value as the selected word to show tooltip/demo
      setSelectedWord(inputValue.trim());
      setInputValue("");
    }
    if (e.key === "Escape") {
      setInputValue("");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4">
      <div className="mt-10 bg-[#0b0f13] border border-neutral-800 rounded-2xl shadow-lg overflow-hidden">
        {/* Header with mac-style buttons and title */}
        <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-b from-[#0d1113]/50 to-transparent border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-[#ff5f56] rounded-full shadow-sm"></span>
            <span className="w-3 h-3 bg-[#ffbd2e] rounded-full shadow-sm"></span>
            <span className="w-3 h-3 bg-[#27c93f] rounded-full shadow-sm"></span>
          </div>
          <div className="text-sm text-neutral-300 font-medium select-none">Dictionary Terminal v1.0</div>
          <div className="flex items-center gap-3 text-neutral-400 text-sm">
            <span className="cursor-default">history</span>
            <span className="cursor-default">settings</span>
          </div>
        </div>

        {/* Terminal body */}
        <div className="px-6 py-6 font-mono text-sm text-neutral-200">
          <div className="flex items-center gap-3">
            <div className="text-green-400">dict@lookup:~$</div>
            <input
              className="flex-1 bg-transparent outline-none text-neutral-100 placeholder:text-neutral-500 caret-green-400"
              placeholder="enter word to lookup ..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={onInputKeyDown}
            />
          </div>

          <div className="mt-6 text-green-300 font-semibold">Welcome to Dictionary Terminal!</div>
          <div className="mt-3 text-neutral-400">Type any word and press Enter to get definitions, pronunciations, and synonyms.</div>

          <div className="mt-8 border border-neutral-800 rounded-lg p-4 bg-[#071014]/40">
            <p className="text-neutral-200">
              {demoText.split(" ").map((word, index) => {
                const cleanWord = word.replace(/[.,;:!?]/g, "");
                const punctuation = word.replace(/[^.,;:!?]/g, "");

                if (highlightWords.includes(cleanWord.toLowerCase())) {
                  return (
                    <span key={index}>
                      <span
                        className="px-1 py-0.5 cursor-pointer rounded text-green-300 hover:bg-white/5 transition-colors"
                        onClick={(e) => handleWordClick(cleanWord, e)}>
                        {cleanWord}
                      </span>
                      {punctuation}{" "}
                    </span>
                  );
                }
                return word + " ";
              })}
            </p>
            <p className="text-xs text-neutral-500 mt-3">Click any highlighted word to open the tooltip demo.</p>
          </div>

          <div className="mt-6 flex items-center justify-between text-xs text-neutral-500">
            <div>Press Enter to search • ↑/↓ for history • ESC to clear input</div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-4 bg-neutral-700 rounded-full p-0.5 flex items-center">
                  <div className="w-3 h-3 bg-white rounded-full ml-0.5"></div>
                </div>
                <div className="text-neutral-300"> AI Mode</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <div className="text-neutral-400">online</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedWord && (
        <DictionaryTooltip word={selectedWord} position={tooltipPosition} onClose={closeTooltip} />
      )}
    </div>
  );
};
