import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}

export function Card({ children, className = "", as: Tag = "div" }: CardProps) {
  return (
    <Tag className={`bg-primary-50 dark:bg-slate-800 rounded-lg p-6 ${className}`}>
      {children}
    </Tag>
  );
}
