import { Input } from "@/components/ui/input";

type DisplayNameSectionProps = {
  displayName: string;
  onChange: (value: string) => void;
};

export function DisplayNameSection({
  displayName,
  onChange,
}: DisplayNameSectionProps) {
  return (
    <section className="grid gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 md:grid-cols-[1fr_auto] md:items-end md:px-5">
      <label className="flex flex-col gap-2 text-sm">
        Chatdagi ismingiz
        <Input
          value={displayName}
          onChange={(event) => onChange(event.target.value)}
          maxLength={32}
          placeholder="Masalan: Sherzod"
          className="h-10 rounded-full bg-[var(--surface-strong)]"
        />
      </label>
      <p className="text-xs text-[var(--muted-foreground)] md:pb-2">
        Xabar shu nom bilan ketadi.
      </p>
    </section>
  );
}
