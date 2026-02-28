import { useEffect } from "react";

export default function Toast({ message, onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
        background: "rgba(15,15,30,0.95)", backdropFilter: "blur(12px)",
        border: "1px solid rgba(59,130,246,0.3)", borderRadius: 12,
        padding: "10px 20px", color: "#fff", fontSize: 13, fontWeight: 600,
        zIndex: 9999, animation: "fadeIn 0.2s ease",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      {message}
    </div>
  );
}
