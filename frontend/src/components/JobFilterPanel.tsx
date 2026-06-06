"use client";

import { useState } from "react";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PreferenceFields } from "@/components/PreferenceFields";
import type { CityPreference, EmploymentType, Profile } from "@/types";

/** Order-insensitive for employment types; order-sensitive for roles + cities. */
function signature(p: {
  targetRoles: string[];
  remote: boolean;
  employmentTypes: EmploymentType[];
  cities: CityPreference[];
}): string {
  return JSON.stringify([
    p.targetRoles,
    p.remote,
    [...p.employmentTypes].sort(),
    p.cities,
  ]);
}

/**
 * The Jobs-page filter: the shared preference controls seeded from the user's
 * saved profile, plus an Apply button. Applying persists the changes (the parent
 * saves the profile and re-fetches matches), so this only collects values and
 * gates the button on validity + an actual change. Cities are dropped for a
 * remote search, matching how the profile is normalized on save.
 */
export function JobFilterPanel({
  profile,
  applying,
  onApply,
}: {
  profile: Profile;
  applying: boolean;
  onApply: (updated: Profile) => void;
}) {
  const [roles, setRoles] = useState<string[]>(profile.targetRoles);
  const [remote, setRemote] = useState<boolean>(profile.remote);
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>(profile.employmentTypes);
  const [cities, setCities] = useState<CityPreference[]>(profile.cities);

  // Remote postings are location-agnostic, so cities only apply for a non-remote search.
  // No cities = "all locations" (allowed); any city that IS added must be filled in.
  const needsCities = !remote;
  const citiesValid = !needsCities || cities.every((c) => c.city.trim() && c.state.trim());
  const valid = roles.length > 0 && citiesValid;

  const next = {
    targetRoles: roles,
    remote,
    employmentTypes,
    cities: needsCities ? cities : [],
  };
  const dirty =
    signature(next) !==
    signature({
      targetRoles: profile.targetRoles,
      remote: profile.remote,
      employmentTypes: profile.employmentTypes,
      cities: profile.cities,
    });
  const canApply = valid && dirty && !applying;

  return (
    <Card>
      <CardBody className="space-y-5">
        <CardTitle>Filter matches</CardTitle>

        <PreferenceFields
          roles={roles}
          onRolesChange={setRoles}
          remote={remote}
          onRemoteChange={setRemote}
          cities={cities}
          onCitiesChange={setCities}
          employmentTypes={employmentTypes}
          onEmploymentTypesChange={setEmploymentTypes}
        />

        <Button onClick={() => onApply({ ...profile, ...next })} disabled={!canApply}>
          {applying ? "Applying…" : "Apply filters"}
        </Button>
      </CardBody>
    </Card>
  );
}
