import { defaultVehicleTuning, type VehicleTuning } from './VehiclePhysics';

const storageKey = 'drift-minigame.vehicleTuning';

export function loadVehicleTuning(): VehicleTuning {
  const tuning = { ...defaultVehicleTuning };

  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return tuning;

    const parsed = JSON.parse(saved) as Partial<Record<keyof VehicleTuning, unknown>>;
    for (const key of Object.keys(tuning) as Array<keyof VehicleTuning>) {
      const value = parsed[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        tuning[key] = value;
      }
    }
  } catch {
    return tuning;
  }

  return tuning;
}

export function saveVehicleTuning(tuning: VehicleTuning) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(tuning));
  } catch {
    // Tuning persistence is a convenience; gameplay should continue if storage is unavailable.
  }
}
