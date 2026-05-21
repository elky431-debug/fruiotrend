import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
}

export function Card({ selected, className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`card-base ${selected ? "border-2 border-accent ring-1 ring-accent" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
