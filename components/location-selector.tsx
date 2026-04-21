'use client';

import { useEffect, useState } from 'react';
import { locationsApi, County, Constituency, Ward } from '@/lib/locations-api';

interface LocationSelectorProps {
  onWardChange: (wardId: string, wardName: string) => void;
  defaultCountyId?: string;
  defaultConstituencyId?: string;
  defaultWardId?: string;
  disabled?: boolean;
}

/**
 * LocationSelector
 *
 * Cascading County → Constituency → Ward dropdowns.
 * Data is fetched from the Redis-cached /locations/* endpoints.
 * Scoped to Nairobi + Western Kenya only.
 */
export function LocationSelector({
  onWardChange,
  defaultCountyId,
  defaultConstituencyId,
  defaultWardId,
  disabled = false,
}: LocationSelectorProps) {
  const [counties, setCounties] = useState<County[]>([]);
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);

  const [selectedCounty, setSelectedCounty] = useState(defaultCountyId ?? '');
  const [selectedConstituency, setSelectedConstituency] = useState(defaultConstituencyId ?? '');
  const [selectedWard, setSelectedWard] = useState(defaultWardId ?? '');

  const [loadingCounties, setLoadingCounties] = useState(true);
  const [loadingConst, setLoadingConst] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  // Load counties on mount
  useEffect(() => {
    locationsApi
      .getCounties()
      .then(setCounties)
      .catch(console.error)
      .finally(() => setLoadingCounties(false));
  }, []);

  // Load constituencies when county changes
  useEffect(() => {
    if (!selectedCounty) {
      setConstituencies([]);
      setWards([]);
      setSelectedConstituency('');
      setSelectedWard('');
      return;
    }
    setLoadingConst(true);
    locationsApi
      .getConstituencies(selectedCounty)
      .then(setConstituencies)
      .catch(console.error)
      .finally(() => setLoadingConst(false));
  }, [selectedCounty]);

  // Load wards when constituency changes
  useEffect(() => {
    if (!selectedConstituency) {
      setWards([]);
      setSelectedWard('');
      return;
    }
    setLoadingWards(true);
    locationsApi
      .getWards(selectedConstituency)
      .then(setWards)
      .catch(console.error)
      .finally(() => setLoadingWards(false));
  }, [selectedConstituency]);

  const handleWardChange = (wardId: string) => {
    setSelectedWard(wardId);
    const ward = wards.find((w) => w.id === wardId);
    if (ward) onWardChange(ward.id, ward.name);
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* County */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          County <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedCounty}
          onChange={(e) => setSelectedCounty(e.target.value)}
          disabled={disabled || loadingCounties}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="">{loadingCounties ? 'Loading…' : 'Select county'}</option>
          {counties.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Constituency */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Constituency <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedConstituency}
          onChange={(e) => setSelectedConstituency(e.target.value)}
          disabled={disabled || !selectedCounty || loadingConst}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="">
            {loadingConst ? 'Loading…' : !selectedCounty ? 'Select county first' : 'Select constituency'}
          </option>
          {constituencies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Ward */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ward <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedWard}
          onChange={(e) => handleWardChange(e.target.value)}
          disabled={disabled || !selectedConstituency || loadingWards}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="">
            {loadingWards ? 'Loading…' : !selectedConstituency ? 'Select constituency first' : 'Select ward'}
          </option>
          {wards.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
