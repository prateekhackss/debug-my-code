"use client";

import { useState, useEffect } from "react";

const LOADING_MESSAGES = [
  "Reading your code... trying not to cry...",
  "Counting semicolons... or lack thereof...",
  "Consulting Stack Overflow on your behalf...",
  "Questioning your variable naming choices...",
  "Found something... this might hurt...",
  "Generating your debugging therapy session...",
];

const ROTATION_INTERVAL_MS = 2000;

export default function LoadingState() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out → swap message → fade in
      setIsVisible(false);

      setTimeout(() => {
        setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        setIsVisible(true);
      }, 300);
    }, ROTATION_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-6">
      {/* Pulsing dot animation */}
      <div className="flex space-x-2">
        <div className="w-3 h-3 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="w-3 h-3 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="w-3 h-3 rounded-full bg-orange-300 animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>

      {/* Rotating message */}
      <p
        className={`
          text-zinc-400 text-sm font-medium text-center
          transition-opacity duration-300 ease-in-out
          ${isVisible ? "opacity-100" : "opacity-0"}
        `}
      >
        {LOADING_MESSAGES[messageIndex]}
      </p>
    </div>
  );
}
