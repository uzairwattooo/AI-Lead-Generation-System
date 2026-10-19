"use client";
import { useId } from "react";
import { COUNTRIES } from "@/lib/constants";
import { getCities, getRegions } from "@/lib/locations";
export type SearchLocation = { country: string; region: string; city: string };
const style = "mt-1 w-full rounded-md border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-2 text-sm text-[var(--app-text)]";
export function LocationFields({ value, onChange, disabled = false }: {
  value: SearchLocation; onChange: (value: SearchLocation) => void; disabled?: boolean;
}) {
  const id = useId();
  const regions = getRegions(value.country);
  const cities = getCities(value.country, value.region);
  return <div className="grid gap-3 sm:grid-cols-3">
    <label className="text-xs">Country<select className={style} value={value.country} disabled={disabled} required onChange={e => onChange({ country: e.target.value, region: "", city: "" })}>
      <option value="">Select country</option>{COUNTRIES.map(c => <option key={c}>{c}</option>)}
    </select></label>
    <label className="text-xs">State / Region<select className={style} value={regions.includes(value.region) ? value.region : value.region ? "__custom" : ""} disabled={disabled || !value.country} required onChange={e => onChange({ ...value, region: e.target.value === "__custom" ? " " : e.target.value, city: "" })}>
      <option value="">Select state / region</option>{regions.map(r => <option key={r}>{r}</option>)}<option value="__custom">Other state / region</option>
    </select></label>
    <label className="text-xs">City<select className={style} value={cities.includes(value.city) ? value.city : value.city ? "__custom" : ""} disabled={disabled || !value.region.trim()} required onChange={e => onChange({ ...value, city: e.target.value === "__custom" ? " " : e.target.value })}>
      <option value="">Select city</option>{cities.map(c => <option key={c}>{c}</option>)}<option value="__custom">Other city / area</option>
    </select></label>
    {value.region && !regions.includes(value.region) ? <label htmlFor={`${id}-region`} className="text-xs">Enter state / region<input id={`${id}-region`} className={style} value={value.region.trimStart()} disabled={disabled} required maxLength={100} onChange={e => onChange({ ...value, region: e.target.value || " ", city: "" })} /></label> : null}
    {value.city && !cities.includes(value.city) ? <label htmlFor={`${id}-city`} className="text-xs">Enter city / area<input id={`${id}-city`} className={style} value={value.city.trimStart()} disabled={disabled} required minLength={2} maxLength={100} onChange={e => onChange({ ...value, city: e.target.value || " " })} /></label> : null}
  </div>;
}
