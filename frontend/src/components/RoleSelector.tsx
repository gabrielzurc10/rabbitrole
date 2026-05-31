"use client";

import { ROLES } from "@/lib/mock";

export function RoleSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (role: string) => void;
}) {
  return (
    <div>
      <label htmlFor="role" className="label">
        Target role
      </label>
      <select
        id="role"
        className="select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>
    </div>
  );
}
