import type { ReactNode } from "react";

type BadgeColor = "primary" | "accent" | "green" | "red" | "blue" | "purple";

interface BadgeProps {
  children: ReactNode;
  color?: BadgeColor;
  className?: string;
}

const colors: Record<BadgeColor, string> = {
  primary: "bg-primary-100 text-primary-700 border-primary-300 dark:bg-primary-900 dark:text-primary-200 dark:border-primary-700",
  accent: "bg-accent-100 text-accent-700 border-accent-300 dark:bg-accent-900 dark:text-accent-200 dark:border-accent-700",
  green: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700",
  red: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-700",
  blue: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700",
  purple: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700",
};

export function Badge({ children, color = "primary", className = "" }: BadgeProps) {
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium ${colors[color]} ${className}`}>
      {children}
    </span>
  );
}
