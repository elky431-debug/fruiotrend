import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "back" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  back: "btn-back",
  ghost:
    "rounded-xl px-4 py-2 text-text-secondary transition hover:bg-bg-card hover:text-white",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", fullWidth, className = "", children, ...props }, ref) => (
    <button
      ref={ref}
      className={`${variants[variant]} ${fullWidth ? "w-full" : ""} disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
);
Button.displayName = "Button";
