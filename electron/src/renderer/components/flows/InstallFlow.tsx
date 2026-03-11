import { useEffect, useState } from "react";
import { useEnv, useFooterSetter } from "@/contexts/AppContext";
import { InstallStepNodejs } from "./install/InstallStepNodejs";
import { InstallStepHomebrew } from "./install/InstallStepHomebrew";
import { InstallStepOpenClaw } from "./install/InstallStepOpenClaw";
import { InstallProgress } from "./install/InstallProgress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const STEPS = [
  { id: "nodejs", title: "Node.js", component: InstallStepNodejs, macOnly: false },
  { id: "homebrew", title: "Homebrew", component: InstallStepHomebrew, macOnly: true },
  { id: "openclaw", title: "OpenClaw", component: InstallStepOpenClaw, macOnly: false },
] as const;

export function InstallFlow() {
  const { envCheck, envCheckLoading, refreshEnvCheck, setAppState } = useEnv();
  const setFooterContent = useFooterSetter();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    refreshEnvCheck();
  }, [refreshEnvCheck]);

  useEffect(() => {
    if (envCheckLoading) setFooterContent(null);
  }, [envCheckLoading, setFooterContent]);

  const isMac = /Mac/.test(navigator.userAgent);
  const steps = STEPS.filter((s) => !s.macOnly || isMac);
  const StepComponent = steps[currentStep]?.component;

  const goNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((i) => i + 1);
    } else {
      setAppState("configure");
    }
  };

  const goPrev = () => {
    if (currentStep > 0) setCurrentStep((i) => i - 1);
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {!envCheckLoading && (
        <InstallProgress steps={steps} currentStep={currentStep} />
      )}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle>{envCheckLoading ? "检测环境" : steps[currentStep]?.title}</CardTitle>
          <CardDescription>
            {envCheckLoading
              ? (() => {
                  const isMac = /Mac/.test(navigator.userAgent);
                  return isMac
                    ? "正在检测 Node.js、Homebrew、OpenClaw 等环境…"
                    : "正在检测 Node.js、OpenClaw 等环境…";
                })()
              : "按照指引完成安装，完成后点击「下一步」继续"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {envCheckLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">请稍候…</p>
            </div>
          ) : (
            StepComponent && (
              <StepComponent
                envCheck={envCheck}
                onNext={goNext}
                onPrev={goPrev}
                isFirst={currentStep === 0}
                isLast={currentStep === steps.length - 1}
                onRefresh={refreshEnvCheck}
              />
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
