import { forwardRef, useState, type HTMLAttributes } from "react";
import { cn } from "~/lib/cn";

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  name: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "h-8 w-8 text-label-sm",
  md: "h-10 w-10 text-label",
  lg: "h-14 w-14 text-headline-md",
};

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, name, size = "md", className, ...props }, ref) => {
    const [hasError, setHasError] = useState(false);
    const [lastSrc, setLastSrc] = useState(src);

    if (src !== lastSrc) {
      setLastSrc(src);
      setHasError(false);
    }

    const initials = name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");

    return (
      <div
        ref={ref}
        className={cn(
          "flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full border border-border-subtle bg-navy-secondary/10 font-semibold text-navy",
          sizes[size],
          className,
        )}
        {...props}
      >
        {src && !hasError ? (
          <img
            src={src}
            alt={name}
            className="h-full w-full object-cover"
            onError={() => setHasError(true)}
          />
        ) : (
          <span aria-hidden>{initials}</span>
        )}
      </div>
    );
  },
);
Avatar.displayName = "Avatar";
