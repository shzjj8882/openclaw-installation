import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  title: string;
  macOnly?: boolean;
}

interface InstallProgressProps {
  steps: Step[];
  currentStep: number;
}

export function InstallProgress({ steps, currentStep }: InstallProgressProps) {
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>安装进度</span>
        <span className="font-medium text-foreground">
          {currentStep + 1} / {steps.length}
        </span>
      </div>
      <Progress value={progress} className="h-2.5" />
      <div className="flex gap-2">
        {steps.map((s, i) => (
          <div
            key={s.id}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition-all duration-300",
              i <= currentStep
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-white/5 text-muted-foreground border border-white/5"
            )}
          >
            {s.title}
          </div>
        ))}
      </div>
    </div>
  );
}
