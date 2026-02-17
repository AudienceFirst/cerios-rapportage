"use client";

import { BUSINESS_UNITS } from "@/lib/types";
import type { BusinessUnit } from "@/lib/types";

interface BusinessUnitSelectorProps {
  value: BusinessUnit;
  onChange: (unit: BusinessUnit) => void;
  disabled?: boolean;
}

export function BusinessUnitSelector({
  value,
  onChange,
  disabled = false,
}: BusinessUnitSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {BUSINESS_UNITS.map((unit) => (
        <button
          key={unit.id}
          type="button"
          onClick={() => onChange(unit.id)}
          disabled={disabled}
          className={`
            px-3 py-1.5 rounded-md text-sm font-medium transition-colors
            ${
              value === unit.id
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          `}
        >
          {unit.label}
        </button>
      ))}
    </div>
  );
}
