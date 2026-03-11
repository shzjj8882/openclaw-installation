/**
 * 通用配置字段渲染器：根据 FieldSpec 类型动态生成 Input / Select / Checkbox
 * 用于 Auth、Channels、Daemon、Skills 等所有配置项
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FieldSpec } from "@/types";

interface ConfigFieldRendererProps {
  field: FieldSpec;
  value: string | boolean;
  onChange: (value: string | boolean) => void;
  idPrefix?: string;
}

export function ConfigFieldRenderer({
  field,
  value,
  onChange,
  idPrefix = "field",
}: ConfigFieldRendererProps) {
  const id = `${idPrefix}-${field.flag}`;
  const fieldType = field.type as "password" | "text" | "url" | "boolean";

  if (fieldType === "boolean") {
    return (
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={id}
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border border-input accent-primary"
        />
        <Label htmlFor={id} className="text-sm cursor-pointer">
          {field.label}
        </Label>
      </div>
    );
  }

  if (field.options?.length) {
    const selectValue = String(value ?? field.options[0]?.value ?? "");
    return (
      <Select
        value={selectValue}
        onValueChange={(v) => onChange(v)}
      >
        <SelectTrigger className="h-9">
          <SelectValue placeholder={field.placeholder ?? field.label} />
        </SelectTrigger>
        <SelectContent>
          {field.options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      type={fieldType === "password" ? "password" : "text"}
      placeholder={field.placeholder ?? field.label}
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
