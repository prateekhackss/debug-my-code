"use client";

import { useState } from "react";
import { SUPPORTED_LANGUAGES, SupportedLanguage } from "@/types";
import CodeEditor from "@/components/CodeEditor";

// Display names for the language dropdown
const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  javascript: "JavaScript",
  python: "Python",
  typescript: "TypeScript",
  java: "Java",
  cpp: "C++",
};

interface CodeInputProps {
  onSubmit: (code: string, language: SupportedLanguage, context: string) => void;
  isLoading: boolean;
}

export default function CodeInput({ onSubmit, isLoading }: CodeInputProps) {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<SupportedLanguage>("javascript");
  const [context, setContext] = useState("");

  const handleSubmit = () => {
    if (!code.trim() || isLoading) return;
    onSubmit(code, language, context);
  };

  const charCount = code.length;
  const isOverLimit = charCount > 5000;
  const isEmpty = code.trim().length === 0;

  return (
    <div className="w-full space-y-4">
      {/* Code Editor */}
      <div className="relative">
        <CodeEditor
          value={code}
          language={language}
          onChange={setCode}
          readOnly={isLoading}
          minHeight={200}
          placeholder="Paste your broken code here..."
        />

        {/* Character count */}
        <div
          className={`absolute bottom-3 right-3 text-xs font-mono z-10 px-1.5 py-0.5 rounded bg-zinc-900/80 ${
            isOverLimit ? "text-red-400" : "text-zinc-500"
          }`}
        >
          {charCount.toLocaleString()} / 5,000
        </div>
      </div>

      {/* Controls Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Language Dropdown */}
        <select
          id="language-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
          disabled={isLoading}
          className="
            px-4 py-2.5 rounded-lg
            bg-zinc-900 text-zinc-100
            border border-zinc-700 hover:border-zinc-600
            focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
            disabled:opacity-50 disabled:cursor-not-allowed
            text-sm font-medium
            cursor-pointer
            appearance-none
          "
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 12px center",
            paddingRight: "36px",
          }}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {LANGUAGE_LABELS[lang]}
            </option>
          ))}
        </select>

        {/* Context Input */}
        <input
          id="context-input"
          type="text"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="What should this code do? (optional)"
          disabled={isLoading}
          className="
            flex-1 px-4 py-2.5 rounded-lg
            bg-zinc-900 text-zinc-100
            border border-zinc-700 hover:border-zinc-600
            focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
            disabled:opacity-50 disabled:cursor-not-allowed
            text-sm
            placeholder:text-zinc-500
          "
        />

        {/* Submit Button */}
        <button
          id="submit-button"
          onClick={handleSubmit}
          disabled={isLoading || isEmpty || isOverLimit}
          className={`
            px-6 py-2.5 rounded-lg
            font-semibold text-sm
            transition-all duration-200
            disabled:cursor-not-allowed
            ${
              isLoading || isEmpty || isOverLimit
                ? "bg-zinc-700 text-zinc-400 opacity-60"
                : "bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 active:scale-95"
            }
          `}
        >
          {isLoading ? "DEBUGGING..." : "DEBUG THIS 🔍"}
        </button>
      </div>

      {/* Helper text */}
      <p className="text-xs text-zinc-500">
        Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[10px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[10px]">Enter</kbd> to submit
      </p>
    </div>
  );
}
