"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * ChatGPT-style stick-to-bottom for a scrollable container.
 *
 *   const { scrollRef, onScroll } = useStickToBottom(content);
 *   <div ref={scrollRef} onScroll={onScroll} className="overflow-y-auto">…</div>
 *
 * Auto-scrolls smoothly to the bottom whenever `content` changes — but only
 * if the user is currently near the bottom (within `threshold` px). If the
 * user has scrolled up to read earlier content, we leave them alone until
 * they scroll back down on their own.
 */
export function useStickToBottom<T extends HTMLElement = HTMLDivElement>(
  content: string,
  threshold = 80,
) {
  const scrollRef = useRef<T | null>(null);
  const stickyRef = useRef(true);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickyRef.current = distanceFromBottom < threshold;
  }, [threshold]);

  useEffect(() => {
    if (!stickyRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    // Defer to the next frame so layout has settled after the markdown re-render.
    const id = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [content]);

  return { scrollRef, onScroll };
}
