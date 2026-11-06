import { useState, type ReactNode } from "react";
import { IconBuilding } from "@tabler/icons-react";
import { cn } from "~/lib/cn";

export interface CompanyLogoProps {
  src?: string | null;
  alt?: string;
  name?: string;
  className?: string;
  fallbackIcon?: ReactNode;
  fallbackIconSize?: number;
  fallbackType?: "icon" | "initial";
  fallbackClassName?: string;
  loading?: "lazy" | "eager";
}

/**
 * CompanyLogo renders an image if available and valid.
 * If the image fails to load (HTTP 400/404, network error, invalid URL),
 * it gracefully switches to an icon or company name initial fallback
 * instead of displaying a broken image placeholder in the browser.
 */
export function CompanyLogo({
  src,
  alt = "",
  name,
  className = "h-full w-full object-cover",
  fallbackIcon,
  fallbackIconSize = 24,
  fallbackType = "icon",
  fallbackClassName,
  loading,
}: CompanyLogoProps) {
  const [hasError, setHasError] = useState(false);
  const [lastSrc, setLastSrc] = useState(src);

  if (src !== lastSrc) {
    setLastSrc(src);
    setHasError(false);
  }

  const initial = (name || alt || "C").trim().charAt(0).toUpperCase();

  if (!src || hasError) {
    if (fallbackIcon) {
      return <>{fallbackIcon}</>;
    }

    if (fallbackType === "initial") {
      return (
        <span
          className={cn("select-none font-bold text-navy", fallbackClassName)}
          aria-hidden="true"
        >
          {initial}
        </span>
      );
    }

    return (
      <IconBuilding
        size={fallbackIconSize}
        className={cn("shrink-0 text-navy", fallbackClassName)}
        aria-hidden="true"
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt || name || "Logo"}
      className={className}
      loading={loading}
      onError={() => setHasError(true)}
    />
  );
}
