import { useEffect, useRef } from 'react';

export function ChatList({ messages, isStreaming }) {
  const scrollerRef = useRef(null);
  const epsilon = 4;

  // RAF loop while streaming: keep scrolled to bottom.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (!isStreaming) return;

    let rafId;
    const tick = () => {
      el.scrollTop = el.scrollHeight;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isStreaming]);

  // ResizeObserver: when content size changes (e.g. images load), snap to bottom if near.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distanceFromBottom < epsilon) {
        el.scrollTop = el.scrollHeight;
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={scrollerRef} className="scroller">
      {messages.map((m) => (
        <div key={m.id} className="msg">{m.text}</div>
      ))}
    </div>
  );
}
