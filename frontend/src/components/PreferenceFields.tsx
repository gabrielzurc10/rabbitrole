import { RoleChipInput } from "@/components/RoleChipInput";
import { RemoteToggle } from "@/components/RemoteToggle";
import { CityProximityEditor } from "@/components/CityProximityEditor";
import { EmploymentTypeSelector } from "@/components/EmploymentTypeSelector";
import type { CityPreference, EmploymentType } from "@/types";

/**
 * The four labeled job-match preference controls (target roles, work mode,
 * locations, employment type), shared by the Profile page and the Jobs filter
 * panel so the two surfaces stay identical. Presentational only — it owns no
 * save logic; the parent lifts the state and decides what to do on change. Remote
 * postings are location-agnostic ("Anywhere" — verified against the API), so a city
 * can't narrow them; the Locations editor is therefore hidden for a remote search.
 */
export function PreferenceFields({
  roles,
  onRolesChange,
  remote,
  onRemoteChange,
  cities,
  onCitiesChange,
  employmentTypes,
  onEmploymentTypesChange,
}: {
  roles: string[];
  onRolesChange: (value: string[]) => void;
  remote: boolean;
  onRemoteChange: (value: boolean) => void;
  cities: CityPreference[];
  onCitiesChange: (value: CityPreference[]) => void;
  employmentTypes: EmploymentType[];
  onEmploymentTypesChange: (value: EmploymentType[]) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="label">Target roles</label>
        <RoleChipInput value={roles} onChange={onRolesChange} />
      </div>

      <div>
        <label className="label">Work model</label>
        <RemoteToggle value={remote} onChange={onRemoteChange} />
      </div>

      {!remote && (
        <div>
          <label className="label">Locations</label>
          <CityProximityEditor value={cities} onChange={onCitiesChange} />
        </div>
      )}

      <div>
        <label className="label">Employment type</label>
        <EmploymentTypeSelector value={employmentTypes} onChange={onEmploymentTypesChange} />
      </div>
    </div>
  );
}
