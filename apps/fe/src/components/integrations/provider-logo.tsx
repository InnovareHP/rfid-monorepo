import { useState } from "react";
import type { ReactNode } from "react";

type ProviderLogoProps = {
  src: string;
  alt: string;
  fallback: ReactNode;
};

// Falls back to an icon when the mark is missing, so a card that has no logo art
// yet renders the icon instead of a broken image.
export const ProviderLogo = ({ src, alt, fallback }: ProviderLogoProps) => {
  const [failed, setFailed] = useState(false);

  if (failed) return <>{fallback}</>;

  return (
    <img
      src={src}
      alt={alt}
      className="size-full object-contain"
      onError={() => setFailed(true)}
    />
  );
};
