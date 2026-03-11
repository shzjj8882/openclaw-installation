import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Check, ExternalLink, Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useSchema } from "@/contexts/AppContext";
import { ConfigFieldRenderer } from "@/components/ConfigFieldRenderer";
import { CONFIG_COMPLETE_DOC_URL, getChannelDocUrl } from "@/lib/channelDocs";

const CONFIG_STEPS = [
  { id: "model", title: "模型" },
  { id: "channels", title: "频道配置" },
  { id: "skills", title: "Skills 配置" },
  { id: "finish", title: "完成" },
] as const;

export function ConfigureFlow() {
  const { onboardSchema: schema, refreshOnboardSchema } = useSchema();

  // 每次进入配置流程时，从 openclaw onboard 重新获取步骤与选项，与 openclaw 保持一致
  useEffect(() => {
    refreshOnboardSchema?.();
  }, [refreshOnboardSchema]);

  // 当 schema 包含已有配置时，恢复表单（第二次打开时）
  const [hasAppliedConfig, setHasAppliedConfig] = useState(false);
  useEffect(() => {
    const cc = schema?.currentConfig;
    if (!cc || hasAppliedConfig) return;
    setHasAppliedConfig(true);
    if (cc.authChoice && schema?.authOptions?.length) {
      const exact = schema.authOptions.find((o) => o.value === cc.authChoice);
      const byPrefix = schema.authOptions.find((o) =>
        (cc.authChoice ?? "").startsWith(o.value.split("-")[0] ?? "")
      );
      setAuthChoice(exact?.value ?? byPrefix?.value ?? cc.authChoice);
    }
    if (cc.authFieldValues && Object.keys(cc.authFieldValues).length > 0) {
      const fv = { ...cc.authFieldValues };
      const isCustomVariant =
        cc.authChoice?.startsWith("custom-") &&
        cc.authChoice?.endsWith("-api-key") &&
        cc.authChoice !== "custom-api-key";
      if (isCustomVariant) {
        for (const k of Object.keys(fv)) {
          if (k.startsWith("custom-") && k.endsWith("-api-key") && k !== "custom-api-key" && !fv["custom-api-key"]) {
            fv["custom-api-key"] = fv[k];
          }
        }
        if (!fv["custom-base-url"] && cc.authChoice) {
          const m = cc.authChoice.match(/custom-([\d-]+)-api-key/);
          if (m) {
            const parts = m[1].split("-");
            const hostPort = parts.length >= 5 ? `${parts.slice(0, 4).join(".")}:${parts[4]}` : m[1].replace(/-/g, ".");
            fv["custom-base-url"] = `http://${hostPort}/v1`;
          }
        }
      }
      if ((cc.authChoice === "custom-api-key" || isCustomVariant) && !fv["custom-base-url"]) {
        fv["custom-base-url"] = "http://127.0.0.1:11434/v1";
      }
      setFieldValues(fv);
    } else if (cc.authChoice === "custom-api-key" || (cc.authChoice?.startsWith("custom-") && cc.authChoice?.endsWith("-api-key"))) {
      setFieldValues({ "custom-base-url": "http://127.0.0.1:11434/v1" });
    }
    if (cc.selectedChannels?.length) {
      setSelectedChannels(cc.selectedChannels);
      setChannelFieldValues(cc.channelFieldValues ?? {});
    }
    if (cc.selectedSkills?.length) setSelectedSkills(cc.selectedSkills);
    if (cc.skillFieldValues) setSkillFieldValues(cc.skillFieldValues);
  }, [schema?.currentConfig, hasAppliedConfig]);

  const [currentStep, setCurrentStep] = useState(0);
  const [authChoice, setAuthChoice] = useState<string>("__none__");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [channelFieldValues, setChannelFieldValues] = useState<Record<string, Record<string, string | boolean>>>({});
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [manualSkillInput, setManualSkillInput] = useState("");
  const [manualSkills, setManualSkills] = useState<string[]>([]);
  const [skillFieldValues, setSkillFieldValues] = useState<Record<string, string | boolean>>({});
  const [applying, setApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState<string>("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAuth = schema?.authOptions.find((o) => o.value === authChoice);
  const hasSelected = !!authChoice && authChoice !== "__none__";
  const fields = selectedAuth?.fields ?? [];

  const channels = schema?.channels ?? [];
  const baseSkills = schema?.skills ?? [];
  const skills = [
    ...baseSkills,
    ...manualSkills
      .filter((n) => !baseSkills.some((s) => s.name === n))
      .map((name) => ({ name, description: "手动添加，将通过 clawhub 安装", eligible: true })),
  ];
  const skillFields = schema?.skillsOptions?.fields ?? [];

  const handleAuthChange = (v: string) => {
    setAuthChoice(v);
    if (v === "custom-api-key") {
      setFieldValues({ "custom-base-url": "http://127.0.0.1:11434/v1" });
    } else {
      setFieldValues({});
    }
  };

  const setField = (flag: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [flag]: value }));
  };

  const setSkillField = (flag: string, value: string | boolean) => {
    setSkillFieldValues((prev) => ({ ...prev, [flag]: value }));
  };

  const toggleChannel = (id: string) => {
    if (selectedChannels.includes(id)) {
      setSelectedChannels((prev) => prev.filter((c) => c !== id));
      setChannelFieldValues((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } else {
      setSelectedChannels((prev) => [...prev, id]);
      const ch = channels.find((c) => c.id === id);
      const defaults: Record<string, string | boolean> = {};
      ch?.fields?.forEach((f) => {
        if (f.type === "boolean") defaults[f.flag] = f.flag === "requireMention";
        else if (f.flag === "dmPolicy") defaults[f.flag] = "pairing";
        else if (f.flag === "groupPolicy") defaults[f.flag] = "allowlist";
        else if (f.options?.length) defaults[f.flag] = f.options[0]?.value ?? "";
        else defaults[f.flag] = "";
      });
      setChannelFieldValues((prev) => ({ ...prev, [id]: defaults }));
    }
  };

  const setChannelField = (channelId: string, flag: string, value: string | boolean) => {
    setChannelFieldValues((prev) => ({
      ...prev,
      [channelId]: { ...(prev[channelId] ?? {}), [flag]: value },
    }));
  };

  const toggleSkill = (name: string) => {
    setSelectedSkills((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  const addManualSkill = () => {
    const name = manualSkillInput.trim();
    if (!name) return;
    if (selectedSkills.includes(name)) {
      setManualSkillInput("");
      return;
    }
    if (!baseSkills.some((s) => s.name === name)) {
      setManualSkills((prev) => [...prev, name]);
    }
    setSelectedSkills((prev) => [...prev, name]);
    setManualSkillInput("");
  };

  const isStep1Valid = () => {
    if (!hasSelected || authChoice === "skip") return true;
    for (const f of fields) {
      if (f.required && !(fieldValues[f.flag] ?? "").trim()) return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep < CONFIG_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
      setError(null);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      setError(null);
    }
  };

  const handleApply = async () => {
    setError(null);
    setApplying(true);
    setApplyProgress("正在准备…");
    const unsubscribe = window.electron?.onInstallProgress?.((d) => {
      setApplyProgress(d.message || "");
    });
    try {
      const effectiveAuthChoice = authChoice === "__none__" ? "skip" : authChoice;
      const result = await window.electron?.applyOpenClawConfig?.({
        authChoice: effectiveAuthChoice,
        fieldValues,
        channels: selectedChannels.map((id) => ({
          id,
          fieldValues: channelFieldValues[id] ?? {},
        })),
        skills: selectedSkills,
        skillFieldValues,
        installDaemon: true,
        daemonFieldValues: {},
      });
      if (result?.ok) {
        setDone(true);
      } else {
        setError(result?.error || "配置失败");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "配置失败");
    } finally {
      unsubscribe?.();
      setApplying(false);
      setApplyProgress("");
    }
  };

  const progress = ((currentStep + 1) / CONFIG_STEPS.length) * 100;

  if (!schema) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">正在获取 OpenClaw 配置选项…</p>
      </div>
    );
  }

  const stepIndex = CONFIG_STEPS.findIndex((s) => s.id === "model");
  const channelsIndex = CONFIG_STEPS.findIndex((s) => s.id === "channels");
  const skillsIndex = CONFIG_STEPS.findIndex((s) => s.id === "skills");
  const finishIndex = CONFIG_STEPS.findIndex((s) => s.id === "finish");

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="space-y-3">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>配置进度</span>
          <span className="font-medium text-foreground">
            {currentStep + 1} / {CONFIG_STEPS.length}
          </span>
        </div>
        <Progress value={progress} className="h-2.5" />
        <div className="flex gap-1 overflow-x-auto pb-1">
          {CONFIG_STEPS.map((s, i) => (
            <div
              key={s.id}
              className={cn(
                "flex-shrink-0 rounded-lg px-2 py-1.5 text-center text-xs font-medium transition-all min-w-[4rem]",
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

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>
                {currentStep === stepIndex && "模型与认证"}
                {currentStep === channelsIndex && "频道配置"}
                {currentStep === skillsIndex && "Skills 配置"}
                {currentStep === finishIndex && "完成配置"}
              </CardTitle>
              <CardDescription>
                {currentStep === stepIndex && "选择模型或暂无配置"}
                {currentStep === channelsIndex && "选择要配置的消息通道，需 Token 的请填写"}
                {currentStep === skillsIndex && "选择要安装的 Skills"}
                {currentStep === finishIndex && "点击下方按钮应用配置，无需打开终端"}
              </CardDescription>
            </div>
            {currentStep === finishIndex && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 shrink-0"
                onClick={() => window.electron?.openExternal?.(CONFIG_COMPLETE_DOC_URL)}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                文档
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {currentStep === stepIndex && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>模型</Label>
                <Select value={authChoice || "__none__"} onValueChange={handleAuthChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="暂无配置" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">暂无配置</SelectItem>
                    {schema.authOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {hasSelected && fields.length > 0 && (
                <div className="space-y-4">
                  {fields.map((f) => (
                    <div key={f.flag} className="space-y-2">
                      <Label>
                        {f.label}
                        {f.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      <ConfigFieldRenderer
                        field={f}
                        value={fieldValues[f.flag] ?? ""}
                        onChange={(v) => setField(f.flag, String(v))}
                        idPrefix="auth"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep === channelsIndex && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                选择频道后，根据该频道的配置项动态生成表单
              </p>
              <div className="space-y-4">
                {channels.map((ch) => (
                  <div key={ch.id} className="rounded-lg border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleChannel(ch.id)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 text-left transition-colors",
                        selectedChannels.includes(ch.id)
                          ? "bg-primary/10 border-b"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <span className="font-medium">{ch.name}</span>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded",
                        selectedChannels.includes(ch.id) ? "bg-primary/20 text-primary" : "text-muted-foreground"
                      )}>
                        {selectedChannels.includes(ch.id) ? "已选" : "点击选择"}
                      </span>
                    </button>
                    {selectedChannels.includes(ch.id) && (
                      <div className="p-4 space-y-4 bg-muted/20 border-t">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">配置说明</span>
                          <button
                            type="button"
                            onClick={() => window.electron?.openExternal?.(getChannelDocUrl(ch.id))}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            查看 {ch.name} 文档
                          </button>
                        </div>
                        {ch.fields?.map((f) => (
                          <div key={f.flag} className="space-y-2">
                            <Label className="text-xs">
                              {f.label}
                              {f.required && <span className="text-destructive ml-1">*</span>}
                            </Label>
                            <ConfigFieldRenderer
                              field={f}
                              value={
                                channelFieldValues[ch.id]?.[f.flag] ??
                                (f.flag === "requireMention" ? true : f.options?.[0]?.value ?? "")
                              }
                              onChange={(v) => setChannelField(ch.id, f.flag, v)}
                              idPrefix={`ch-${ch.id}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === skillsIndex && (
            <div className="space-y-4">
              {skillFields.length > 0 && (
                <div className="rounded-lg border p-4 space-y-4">
                  {skillFields.map((f) => (
                    <div key={f.flag} className="space-y-2">
                      <Label className="text-xs">
                        {f.label}
                        {f.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      <ConfigFieldRenderer
                        field={f}
                        value={skillFieldValues[f.flag] ?? f.options?.[0]?.value ?? ""}
                        onChange={(v) => setSkillField(f.flag, v)}
                        idPrefix="skill"
                      />
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                选择要安装的 Skills，将通过 clawhub 安装。取消勾选不会卸载已安装的 Skill。
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="输入 Skill 名称（如 weather 或 weathercli）手动添加"
                  value={manualSkillInput}
                  onChange={(e) => setManualSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addManualSkill()}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={addManualSkill} className="gap-1 shrink-0">
                  <Plus className="h-4 w-4" />
                  添加
                </Button>
              </div>
              <div className="max-h-64 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  ...skills.filter((s) => selectedSkills.includes(s.name)),
                  ...skills.filter((s) => !selectedSkills.includes(s.name)),
                ]
                  .slice(0, 50)
                  .map((sk) => (
                  <button
                    key={sk.name}
                    type="button"
                    onClick={() => toggleSkill(sk.name)}
                    className={cn(
                      "flex flex-col items-start p-3 rounded-lg border text-left transition-colors",
                      selectedSkills.includes(sk.name)
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <span className="font-medium">{sk.name}</span>
                    {sk.description && (
                      <span className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {sk.description}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {skills.length > 50 && (
                <p className="text-xs text-muted-foreground">仅显示前 50 个，更多可通过 clawhub 安装</p>
              )}
            </div>
          )}

          {currentStep === finishIndex && (
            <div className="space-y-4">
              {done ? (
                <div className="flex flex-col items-center gap-4 py-6">
                  <div className="flex flex-col items-center gap-2 text-green-600">
                    <Check className="h-12 w-12" />
                    <p className="font-medium">配置已应用</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    点击下方按钮启动 OpenClaw，并关闭安装助手
                  </p>
                  <Button
                    className="gap-2"
                    onClick={() => window.electron?.runOpenClawAndExit?.()}
                  >
                    启动 OpenClaw
                  </Button>
                </div>
              ) : (
                <>
                  <div className="rounded-lg bg-muted/50 p-4 text-sm">
                    <p className="font-medium mb-1">将应用以下配置：</p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>模型：{authChoice === "__none__" ? "暂无配置" : (selectedAuth?.label ?? authChoice)}</li>
                      <li>频道：{selectedChannels.length ? selectedChannels.map((id) => {
                        const ch = channels.find((c) => c.id === id);
                        const fv = channelFieldValues[id];
                        const extra = fv?.dmPolicy ? ` (${fv.dmPolicy})` : "";
                        return `${ch?.name ?? id}${extra}`;
                      }).join("；") : "无"}</li>
                      <li>Skills：{selectedSkills.length ? selectedSkills.join(", ") : "无"}</li>
                    </ul>
                  </div>
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                  <Button
                    className="w-full gap-2"
                    onClick={handleApply}
                    disabled={applying || !authChoice || authChoice === "" || !isStep1Valid()}
                  >
                    {applying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {applyProgress || "正在应用配置…"}
                      </>
                    ) : (
                      "应用配置"
                    )}
                  </Button>
                </>
              )}
            </div>
          )}

          {!done && (
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={handlePrev} disabled={currentStep === 0}>
                上一步
              </Button>
              {currentStep < finishIndex ? (
                <Button
                  onClick={handleNext}
                  disabled={currentStep === stepIndex && (authChoice === "" || !isStep1Valid())}
                >
                  下一步
                </Button>
              ) : (
                <div />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
