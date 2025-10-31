import { useState, useEffect, useRef } from "react";
import { cn } from "../lib/utils";

interface Definition {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  example?: string;
}

interface DictionaryTooltipProps {
  word: string;
  position: { x: number; y: number };
  onClose: () => void;
}

export const DictionaryTooltip = ({ word, position, onClose }: DictionaryTooltipProps) => {
  const [definition, setDefinition] = useState<Definition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const fetchDefinition = async () => {
    try {
      setLoading(true);
      setError(null);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`,
        { signal: controller.signal }
      );

      clearTimeout(timeout);

      if (!response.ok) throw new Error("Word not found");

      const data = await response.json();
      const entry = data[0];
      const meaning = entry.meanings?.[0];
      const def = meaning?.definitions?.[0];

      setDefinition({
        word: entry.word,
        phonetic: entry.phonetic || entry.phonetics?.[0]?.text || "",
        partOfSpeech: meaning?.partOfSpeech || "",
        definition: def?.definition || "No definition available",
        example: def?.example || undefined,
      });
    } catch (err: any) {
      if (err.name === "AbortError") setError("Request timed out. Please try again.");
      else if (err instanceof TypeError) setError("Network error. Please check your connection.");
      else if (typeof err.message === "string") setError(err.message);
      else setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefinition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target as Node)) onClose();
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    const timer = setTimeout(onClose, 5000);

    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      clearTimeout(timer);
    };
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "dictionary-tooltip fixed z-50 max-w-xs min-w-[240px] rounded-2xl",
        "bg-[#0b0f13] text-neutral-100 border border-neutral-800 font-mono",
        "shadow-lg"
      )}
      style={{ left: `${Math.min(position.x, window.innerWidth - 320)}px`, top: `${Math.max(position.y - 10, 10)}px` }}
    >
      {/* header: terminal dots + title */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-[#ff5f56] rounded-full" />
          <span className="w-3 h-3 bg-[#ffbd2e] rounded-full" />
          <span className="w-3 h-3 bg-[#27c93f] rounded-full" />
        </div>

        <div className="text-sm text-neutral-300 font-medium select-none">Dictionary</div>

        <div className="text-xs text-neutral-400">term</div>
      </div>

      <div className="px-4 py-3">
        <div className="rounded-xl border border-green-700/20 bg-[#071514] p-3">
          {loading && (
            <div className="flex items-center gap-3 text-sm text-neutral-300">
              <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
              <span>Analyzing context for "{word}"...</span>
            </div>
          )}

          {error && (
            <div className="text-destructive text-sm space-y-2">
              <div>{error}</div>
              <button onClick={() => fetchDefinition()} className="text-sm bg-green-600 text-white px-2 py-1 rounded-md">Retry</button>
            </div>
          )}

          {definition && (
            <div className="space-y-4">
              <div className="text-sm leading-relaxed text-neutral-200">{definition.definition}</div>

              {definition.example && (
                <div className="text-xs italic text-neutral-300 bg-[#071514] border-l-2 border-green-600 pl-3 py-2 rounded">{`"${definition.example}"`}</div>
              )}

              <div className="text-xs text-neutral-400 mt-1">Source: dictionaryapi.dev</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
