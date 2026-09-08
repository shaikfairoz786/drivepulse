import React from 'react';
import { Check, X, Minus, AlertTriangle } from 'lucide-react';

export interface MatchReasonItem {
  factor: string;
  status: 'STRONG_MATCH' | 'MATCH' | 'PARTIAL' | 'NOT_SPECIFIED' | 'MISMATCH';
  detail: string;
  scoreContribution?: number;
}

interface MatchCriteriaCardProps {
  reasons?: MatchReasonItem[];
  score?: number;
  vehicle?: any;
  requirement?: any;
  compact?: boolean;
  initiallyExpanded?: boolean;
}

export const MatchCriteriaCard: React.FC<MatchCriteriaCardProps> = ({
  reasons,
  score,
  vehicle,
  requirement,
}) => {
  // If vehicle and requirement are provided, compute live, accurate match/mismatch for all factors!
  let computedReasons: MatchReasonItem[] = [];

  if (vehicle && requirement) {
    // 1. Brand / Make
    if (requirement.brand) {
      const reqBrand = requirement.brand.toLowerCase().trim();
      const vehMake = (vehicle.make || '').toLowerCase().trim();
      const isBrandMatch = vehMake === reqBrand || vehMake.includes(reqBrand) || reqBrand.includes(vehMake);
      computedReasons.push({
        factor: 'Brand',
        status: isBrandMatch ? 'MATCH' : 'MISMATCH',
        detail: isBrandMatch ? `Make '${vehicle.make}' matches '${requirement.brand}'` : `Make '${vehicle.make}' differs from '${requirement.brand}'`,
      });
    } else {
      computedReasons.push({ factor: 'Brand', status: 'NOT_SPECIFIED', detail: 'Flexible (Any brand)' });
    }

    // 2. Model
    if (requirement.model) {
      const reqModel = requirement.model.toLowerCase().trim();
      const vehModel = (vehicle.model || '').toLowerCase().trim();
      const isModelMatch = vehModel === reqModel || vehModel.includes(reqModel) || reqModel.includes(vehModel);
      computedReasons.push({
        factor: 'Model',
        status: isModelMatch ? 'MATCH' : 'MISMATCH',
        detail: isModelMatch ? `Model '${vehicle.model}' matches '${requirement.model}'` : `Model '${vehicle.model}' differs from '${requirement.model}'`,
      });
    } else {
      computedReasons.push({ factor: 'Model', status: 'NOT_SPECIFIED', detail: 'Flexible (Any model)' });
    }

    // 3. Budget
    const price = vehicle.price || 0;
    const minBudget = requirement.minBudget ? Number(requirement.minBudget) : null;
    const maxBudget = requirement.maxBudget ? Number(requirement.maxBudget) : null;
    if (minBudget !== null || maxBudget !== null) {
      const lower = minBudget !== null ? minBudget : 0;
      const upper = maxBudget !== null ? maxBudget : Number.MAX_SAFE_INTEGER;
      const tolLower = minBudget !== null ? minBudget * 0.90 : 0;
      const tolUpper = maxBudget !== null ? maxBudget * 1.10 : Number.MAX_SAFE_INTEGER;

      if (price >= lower && price <= upper) {
        computedReasons.push({ factor: 'Budget', status: 'MATCH', detail: `₹${(price / 100000).toFixed(1)}L is inside requested budget` });
      } else if (price >= tolLower && price <= tolUpper) {
        computedReasons.push({ factor: 'Budget', status: 'PARTIAL', detail: `₹${(price / 100000).toFixed(1)}L is near budget (±10%)` });
      } else {
        computedReasons.push({ factor: 'Budget', status: 'MISMATCH', detail: `₹${(price / 100000).toFixed(1)}L is out of budget window` });
      }
    } else {
      computedReasons.push({ factor: 'Budget', status: 'NOT_SPECIFIED', detail: 'Flexible (No budget cap)' });
    }

    // 4. Fuel Type
    if (requirement.fuelType && requirement.fuelType.toUpperCase() !== 'ANY') {
      const reqFuel = requirement.fuelType.toUpperCase().trim();
      const vehFuel = (vehicle.fuelType || '').toUpperCase().trim();
      const isFuelMatch = vehFuel === reqFuel || reqFuel.includes(vehFuel) || vehFuel.includes(reqFuel);
      computedReasons.push({
        factor: 'Fuel',
        status: isFuelMatch ? 'MATCH' : 'MISMATCH',
        detail: isFuelMatch ? `Fuel '${vehicle.fuelType}' matches` : `Fuel '${vehicle.fuelType || 'N/A'}' differs from '${requirement.fuelType}'`,
      });
    } else {
      computedReasons.push({ factor: 'Fuel', status: 'NOT_SPECIFIED', detail: 'Flexible (Any fuel)' });
    }

    // 5. Manufacturing Year
    const minYear = requirement.minYear ? Number(requirement.minYear) : null;
    const vehYear = vehicle.manufacturingYear ? Number(vehicle.manufacturingYear) : null;
    if (minYear !== null && vehYear !== null) {
      if (vehYear >= minYear) {
        computedReasons.push({ factor: 'Year', status: 'MATCH', detail: `Year ${vehYear} meets target ${minYear}+` });
      } else if (vehYear === minYear - 1) {
        computedReasons.push({ factor: 'Year', status: 'PARTIAL', detail: `Year ${vehYear} is 1 year below target ${minYear}` });
      } else {
        computedReasons.push({ factor: 'Year', status: 'MISMATCH', detail: `Year ${vehYear} is below target ${minYear}` });
      }
    } else {
      computedReasons.push({ factor: 'Year', status: 'NOT_SPECIFIED', detail: 'Flexible (Any year)' });
    }

    // 6. Transmission
    if (requirement.transmission && requirement.transmission.toUpperCase() !== 'ANY') {
      const reqTrans = requirement.transmission.toUpperCase().trim();
      const vehTrans = (vehicle.transmission || '').toUpperCase().trim();
      const isTransMatch = vehTrans === reqTrans;
      computedReasons.push({
        factor: 'Transmission',
        status: isTransMatch ? 'MATCH' : 'MISMATCH',
        detail: isTransMatch ? `Transmission '${vehicle.transmission}' matches` : `Transmission '${vehicle.transmission || 'N/A'}' differs from '${requirement.transmission}'`,
      });
    }

    // 7. Kilometers
    if (requirement.maxKm && vehicle.kmDriven !== undefined) {
      if (vehicle.kmDriven <= requirement.maxKm) {
        computedReasons.push({ factor: 'Kilometers', status: 'MATCH', detail: `${vehicle.kmDriven.toLocaleString()} KM is under ${requirement.maxKm.toLocaleString()} limit` });
      } else {
        computedReasons.push({ factor: 'Kilometers', status: 'MISMATCH', detail: `${vehicle.kmDriven.toLocaleString()} KM exceeds limit of ${requirement.maxKm.toLocaleString()}` });
      }
    }
  } else if (reasons && reasons.length > 0) {
    computedReasons = [...reasons];
  }

  // If score is less than 100%, guarantee that all non-matching factors appear in RED!
  const standardFactors = ['Brand', 'Model', 'Budget', 'Fuel', 'Year'];
  const existingFactorNames = computedReasons.map((r) => r.factor.toLowerCase());

  // If score < 100, ensure any non-matched standard factors are shown as RED mismatches
  if (score !== undefined && score < 95) {
    if (!existingFactorNames.some((f) => f.includes('fuel'))) {
      computedReasons.push({
        factor: 'Fuel',
        status: 'MISMATCH',
        detail: 'Fuel type preference not matched',
      });
    }
    if (!existingFactorNames.some((f) => f.includes('year'))) {
      computedReasons.push({
        factor: 'Year',
        status: 'MISMATCH',
        detail: 'Manufacturing year range not matched',
      });
    }
    if (score <= 50 && !existingFactorNames.some((f) => f.includes('model') && computedReasons.find(r => r.factor.toLowerCase().includes('model'))?.status === 'MISMATCH')) {
      // For low scores <= 50%, model is a mismatch
      const modelIdx = computedReasons.findIndex((r) => r.factor.toLowerCase().includes('model'));
      if (modelIdx >= 0) {
        computedReasons[modelIdx] = {
          factor: 'Model',
          status: 'MISMATCH',
          detail: 'Vehicle model differs from requested model',
        };
      }
    }
  }

  if (computedReasons.length === 0) {
    return null;
  }

  const matchedItems = computedReasons.filter(
    (r) => r.status === 'STRONG_MATCH' || r.status === 'MATCH'
  );
  const partialItems = computedReasons.filter((r) => r.status === 'PARTIAL');
  const mismatchedItems = computedReasons.filter((r) => r.status === 'MISMATCH');
  const flexibleItems = computedReasons.filter((r) => r.status === 'NOT_SPECIFIED');

  return (
    <div className="space-y-1.5 pt-1 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Matched items in GREEN */}
        {matchedItems.map((r, idx) => (
          <span
            key={`match-${idx}`}
            title={`${r.factor}: ${r.detail}`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 text-[11px] font-semibold shadow-2xs hover:bg-emerald-100 transition-colors"
          >
            <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
            <span>{r.factor}</span>
          </span>
        ))}

        {/* Near/Partial items in AMBER */}
        {partialItems.map((r, idx) => (
          <span
            key={`partial-${idx}`}
            title={`${r.factor}: ${r.detail}`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-semibold shadow-2xs hover:bg-amber-100 transition-colors"
          >
            <AlertTriangle className="w-3 h-3 text-amber-600 stroke-[2.5]" />
            <span>{r.factor} (Near)</span>
          </span>
        ))}

        {/* Mismatched items in RED */}
        {mismatchedItems.map((r, idx) => (
          <span
            key={`mismatch-${idx}`}
            title={`${r.factor}: ${r.detail}`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-300 text-[11px] font-semibold shadow-2xs hover:bg-rose-100 transition-colors"
          >
            <X className="w-3 h-3 text-rose-600 stroke-[2.5]" />
            <span>{r.factor}: Not Matched</span>
          </span>
        ))}

        {/* Flexible items in subtle slate */}
        {flexibleItems.map((r, idx) => (
          <span
            key={`flex-${idx}`}
            title={`${r.factor}: ${r.detail}`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-medium"
          >
            <Minus className="w-3 h-3 text-slate-400" />
            <span>{r.factor}</span>
          </span>
        ))}
      </div>

      {/* If there are any mismatches, display a clear red note explaining what didn't match */}
      {mismatchedItems.length > 0 && (
        <div className="text-[10px] text-rose-700 bg-rose-50/70 border border-rose-200/80 rounded px-2 py-1 flex flex-col gap-0.5">
          <span className="font-bold uppercase tracking-wider text-rose-800">
            Not Matched ({mismatchedItems.length}):
          </span>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {mismatchedItems.map((r, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <strong className="text-rose-900">{r.factor}:</strong> {r.detail}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

