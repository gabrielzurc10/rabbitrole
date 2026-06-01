"use client";

import { ROLES } from "@/lib/roles";

export function RoleSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="label" htmlFor="role">
        Target role
      </label>
      <select
        id="role"
        className="select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
    </div>
  );
}
