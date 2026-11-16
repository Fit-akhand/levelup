// The three food-preference pickers, shared by the onboarding steps and the "set up your meal
// plan" screen, so both always offer exactly the same options and wording.
import Choice from "./Choice";
import { ALLERGEN_LABEL, BUDGET_HINT, BUDGET_LABEL, DIET_HINT, DIET_LABEL } from "@/lib/labels";
import type { Allergen, Budget, DietPref } from "@/lib/types";

export function DietPrefPicker({ value, onChange }: { value: DietPref | ""; onChange: (v: DietPref) => void }) {
  return (
    <div role="radiogroup" aria-label="Food preference" className="space-y-2">
      {(["veg", "egg", "nonveg"] as DietPref[]).map((d) => (
        <Choice key={d} label={DIET_LABEL[d]} hint={DIET_HINT[d]} selected={value === d} onSelect={() => onChange(d)} />
      ))}
    </div>
  );
}

export function BudgetPicker({ value, onChange }: { value: Budget | ""; onChange: (v: Budget) => void }) {
  return (
    <div role="radiogroup" aria-label="Daily food budget" className="space-y-2">
      {(["low", "medium", "high"] as Budget[]).map((b) => (
        <Choice key={b} label={BUDGET_LABEL[b]} hint={BUDGET_HINT[b]} selected={value === b} onSelect={() => onChange(b)} />
      ))}
    </div>
  );
}

export function AvoidPicker({ value, onChange }: { value: Allergen[]; onChange: (v: Allergen[]) => void }) {
  const toggle = (a: Allergen) => onChange(value.includes(a) ? value.filter((x) => x !== a) : [...value, a]);
  return (
    <div role="group" aria-label="Foods to avoid" className="space-y-2">
      {(["peanuts", "dairy", "gluten"] as Allergen[]).map((a) => (
        <Choice key={a} multi label={ALLERGEN_LABEL[a]} selected={value.includes(a)} onSelect={() => toggle(a)} />
      ))}
      <p className="pt-1 text-sm text-muted">Tick any that you are allergic to or cannot eat. Leave empty if none.</p>
    </div>
  );
}
