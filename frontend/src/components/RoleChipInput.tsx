"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { titleCase } from "@/lib/text";

/**
 * Type a role + "Add" (or Enter) to append it as a removable chip. The first
 * chip is the "primary" role — the one the resume is scored against.
 */
export function RoleChipInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (roles: string[]) => void;
}) {
  const [text, setText] = useState("");

  function add() {
    const role = titleCase(text.trim());
    if (!role || value.includes(role)) {
      setText("");
      return;
    }
    onChange([...value, role]);
    setText("");
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          className="input"
          placeholder="e.g. Backend Engineer"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add}>
          <Icon name="plus" className="h-4 w-4" />
          Add
        </Button>
      </div>

      {value.length > 0 && (
        <div className="chip-input mt-3">
          {value.map((role, i) => (
            <span key={role} className={cn("chip", i === 0 && "chip-primary")}>
              {i === 0 && <span className="text-[10px] font-semibold uppercase tracking-wide">Primary</span>}
              {role}
              <button
                type="button"
                className="chip-remove"
                onClick={() => onChange(value.filter((r) => r !== role))}
                aria-label={`Remove ${role}`}
              >
                <Icon name="x" className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
