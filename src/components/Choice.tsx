import { CheckIcon } from "./Icons";

// A big tappable option card, used for goal / level / place / days.
// It is a <button> (not a div) so keyboards and screen readers work for free.
interface ChoiceProps {
  label: string;
  hint?: string;
  selected: boolean;
  disabled?: boolean;
  compact?: boolean; // centered, for short labels like "Male" or "3"
  multi?: boolean; // several can be selected at once (checkbox) instead of exactly one (radio)
  onSelect: () => void;
}

export default function Choice({ label, hint, selected, disabled, compact, multi, onSelect }: ChoiceProps) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={[
        "relative w-full rounded-2xl border-2 px-4 py-3.5 transition active:scale-[0.98]",
        compact ? "text-center" : "text-left",
        selected ? "border-primary bg-tint" : "border-line bg-surface hover:border-primary/60",
        disabled ? "cursor-not-allowed opacity-35 hover:border-line" : "",
      ].join(" ")}
    >
      <span className={["block font-bold", compact ? "" : "pr-8"].join(" ")}>{label}</span>
      {hint && <span className="mt-0.5 block text-sm text-muted">{hint}</span>}
      {selected && !compact && (
        <span className="absolute right-3 top-3.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-on-primary">
          <CheckIcon size={14} />
        </span>
      )}
    </button>
  );
}
