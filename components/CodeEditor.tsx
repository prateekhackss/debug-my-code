"use client";

import { useEffect, useRef, useState } from "react";
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, rectangularSelection, placeholder as cmPlaceholder } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from "@codemirror/language";
import { oneDark } from "@codemirror/theme-one-dark";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import type { Extension } from "@codemirror/state";
import type { SupportedLanguage } from "@/types";

// --- Dynamic language loading (only imports what's needed) ---
async function loadLanguageExtension(lang: SupportedLanguage): Promise<Extension> {
  switch (lang) {
    case "javascript": {
      const { javascript } = await import("@codemirror/lang-javascript");
      return javascript();
    }
    case "typescript": {
      const { javascript } = await import("@codemirror/lang-javascript");
      return javascript({ typescript: true });
    }
    case "python": {
      const { python } = await import("@codemirror/lang-python");
      return python();
    }
    case "java": {
      const { java } = await import("@codemirror/lang-java");
      return java();
    }
    case "cpp": {
      const { cpp } = await import("@codemirror/lang-cpp");
      return cpp();
    }
    default:
      return [];
  }
}

// --- Line highlight decorations ---
import { Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

type HighlightColor = "red" | "green" | "none";

const redLineDeco = Decoration.line({ class: "cm-highlighted-red" });
const greenLineDeco = Decoration.line({ class: "cm-highlighted-green" });

function createLineHighlightPlugin(highlightLines: number[], color: HighlightColor) {
  if (!highlightLines.length || color === "none") return [];

  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.buildDecorations(update.view);
        }
      }
      buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        const deco = color === "red" ? redLineDeco : greenLineDeco;
        for (const lineNum of highlightLines) {
          if (lineNum >= 1 && lineNum <= view.state.doc.lines) {
            const line = view.state.doc.line(lineNum);
            builder.add(line.from, line.from, deco);
          }
        }
        return builder.finish();
      }
    },
    { decorations: (v) => v.decorations }
  );
}

// --- Component ---
interface CodeEditorProps {
  value: string;
  language: SupportedLanguage;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  /** Line numbers to highlight (1-indexed) */
  highlightLines?: number[];
  /** Color for highlighted lines */
  highlightColor?: HighlightColor;
  /** Min height in pixels */
  minHeight?: number;
  /** Placeholder text */
  placeholder?: string;
}

export default function CodeEditor({
  value,
  language,
  onChange,
  readOnly = false,
  highlightLines = [],
  highlightColor = "none",
  minHeight = 200,
  placeholder,
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const languageCompartment = useRef(new Compartment());
  const highlightCompartment = useRef(new Compartment());
  const [isReady, setIsReady] = useState(false);

  // Stable onChange ref to avoid recreating the editor
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Initialize editor
  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && onChangeRef.current) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const baseTheme = EditorView.theme({
      "&": {
        fontSize: "13px",
        minHeight: `${minHeight}px`,
        backgroundColor: "#18181b", // zinc-900
        borderRadius: "12px",
      },
      "&.cm-focused": {
        outline: "none",
      },
      ".cm-scroller": {
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
        padding: "12px 0",
        overflow: "auto",
      },
      ".cm-content": {
        padding: "0 4px",
      },
      ".cm-gutters": {
        backgroundColor: "#18181b",
        color: "#52525b",
        border: "none",
        paddingLeft: "8px",
      },
      ".cm-activeLineGutter": {
        backgroundColor: "transparent",
        color: "#a1a1aa",
      },
      ".cm-activeLine": {
        backgroundColor: readOnly ? "transparent" : "#27272a40",
      },
      ".cm-cursor": {
        borderLeftColor: "#f97316",
      },
      ".cm-selectionBackground": {
        backgroundColor: "#f9731630 !important",
      },
      // Highlighted line backgrounds
      ".cm-highlighted-red": {
        backgroundColor: "#ef444420",
        borderLeft: "3px solid #ef4444",
        paddingLeft: "8px",
      },
      ".cm-highlighted-green": {
        backgroundColor: "#22c55e20",
        borderLeft: "3px solid #22c55e",
        paddingLeft: "8px",
      },
      // Placeholder
      ".cm-placeholder": {
        color: "#71717a",
        fontStyle: "italic",
      },
    });

    const extensions: Extension[] = [
      baseTheme,
      oneDark,
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      bracketMatching(),
      drawSelection(),
      rectangularSelection(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      languageCompartment.current.of([]),
      highlightCompartment.current.of(
        createLineHighlightPlugin(highlightLines, highlightColor)
      ),
      updateListener,
      EditorView.lineWrapping,
    ];

    if (placeholder) {
      extensions.push(cmPlaceholder(placeholder));
    }

    if (readOnly) {
      extensions.push(EditorState.readOnly.of(true));
      extensions.push(EditorView.editable.of(false));
    }

    const state = EditorState.create({
      doc: value,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;
    setIsReady(true);

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, minHeight]);

  // Sync external value changes (for read-only views)
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !isReady) return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc !== value) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
      });
    }
  }, [value, isReady]);

  // Dynamic language switching
  useEffect(() => {
    if (!viewRef.current || !isReady) return;

    loadLanguageExtension(language).then((langExt) => {
      viewRef.current?.dispatch({
        effects: languageCompartment.current.reconfigure(langExt),
      });
    });
  }, [language, isReady]);

  // Update line highlights
  useEffect(() => {
    if (!viewRef.current || !isReady) return;

    viewRef.current.dispatch({
      effects: highlightCompartment.current.reconfigure(
        createLineHighlightPlugin(highlightLines, highlightColor)
      ),
    });
  }, [highlightLines, highlightColor, isReady]);

  return (
    <div
      ref={containerRef}
      className={`
        rounded-xl border overflow-hidden transition-colors
        ${readOnly
          ? "border-zinc-800"
          : "border-zinc-700 hover:border-zinc-600 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/30"
        }
      `}
    />
  );
}
