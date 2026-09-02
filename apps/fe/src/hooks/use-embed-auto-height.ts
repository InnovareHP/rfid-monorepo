import { useEffect } from "react";

export const EMBED_HEIGHT_MESSAGE = "refidly:embed:height";

// Reports the document height to the host page so its iframe can grow with the
// content. The host ignores it when it does not load the companion snippet.
export const useEmbedAutoHeight = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled || window.parent === window) return;

    const post = () => {
      const height = Math.ceil(
        document.documentElement.getBoundingClientRect().height
      );

      window.parent.postMessage(
        { type: EMBED_HEIGHT_MESSAGE, height },
        "*"
      );
    };

    const observer = new ResizeObserver(post);
    observer.observe(document.documentElement);
    post();

    return () => observer.disconnect();
  }, [enabled]);
};
