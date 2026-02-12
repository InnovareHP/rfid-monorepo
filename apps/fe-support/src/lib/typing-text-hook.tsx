import { useEffect, useState } from "react";

export function TypingText({
  text,
  speed = 25,
  className,
}: {
  text: string;
  speed?: number;
  className?: string;
}) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (displayed.length >= text.length) {
      setDone(true);
      return;
    }
    const t = setTimeout(() => {
      setDisplayed(text.slice(0, displayed.length + 1));
    }, speed);
    return () => clearTimeout(t);
  }, [text, displayed, speed]);

  return (
    <p className={className}>
      {displayed}
      {!done && (
        <span
          className="inline-block w-0.5 h-4 ml-0.5 bg-foreground animate-pulse align-middle"
          aria-hidden
        />
      )}
    </p>
  );
}
