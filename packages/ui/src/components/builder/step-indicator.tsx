import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

export interface StepIndicatorProps {
  steps: string[];
  current: number;
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((step, index) => {
        const isDone = index < current;
        const isActive = index === current;
        return (
          <li key={step} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold",
                  isDone && "border-primary bg-primary text-primary-foreground",
                  isActive &&
                    "border-primary bg-background text-primary ring-2 ring-primary/30",
                  !isDone && !isActive && "border-muted text-muted-foreground",
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <span
                className={cn(
                  "hidden text-sm font-medium sm:inline",
                  isActive
                    ? "text-foreground"
                    : isDone
                      ? "text-muted-foreground"
                      : "text-muted-foreground/60",
                )}
              >
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-px w-8",
                  index < current ? "bg-primary" : "bg-muted",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
