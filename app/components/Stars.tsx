interface StarsProps {
  count: number;
  className?: string;
}

export function Stars({ count, className = "" }: StarsProps) {
  return (
    <span
      className={`text-accent-500 whitespace-nowrap ${className}`}
      title={`${count} / 5`}
    >
      {"★".repeat(count)}
      {"☆".repeat(5 - count)}
    </span>
  );
}
