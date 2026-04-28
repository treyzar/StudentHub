import { useListSubjects } from "@workspace/api-client-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE_VALUE = "__none__";

interface SubjectSelectProps {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  allowNone?: boolean;
  noneLabel?: string;
}

export function SubjectSelect({
  value,
  onChange,
  placeholder = "Выберите предмет",
  allowNone = true,
  noneLabel = "Без предмета",
}: SubjectSelectProps) {
  const { data: subjects } = useListSubjects();

  return (
    <Select
      value={value === null ? NONE_VALUE : String(value)}
      onValueChange={(v) => onChange(v === NONE_VALUE ? null : Number(v))}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value={NONE_VALUE}>{noneLabel}</SelectItem>}
        {subjects?.map((s) => (
          <SelectItem key={s.id} value={String(s.id)}>
            <span className="flex items-center gap-2">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
