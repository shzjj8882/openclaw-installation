import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

interface StepFooterProps {
  onPrev: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
  nextDisabled?: boolean;
  nextLabel?: string;
  setFooterContent: (node: ReactNode) => void;
}

export function StepFooter({
  onPrev,
  onNext,
  isFirst,
  isLast,
  nextDisabled = false,
  nextLabel = "下一步",
  setFooterContent,
}: StepFooterProps) {
  useEffect(() => {
    setFooterContent(
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev} disabled={isFirst}>
          上一步
        </Button>
        <Button onClick={onNext} disabled={nextDisabled}>
          {nextLabel}
        </Button>
      </div>
    );
    return () => setFooterContent(null);
  }, [onPrev, onNext, isFirst, isLast, nextDisabled, nextLabel, setFooterContent]);
  return null;
}
