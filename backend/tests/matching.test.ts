import { describe, it, expect } from 'vitest';
import { MatchingEngine } from '../src/services/matching.service';
import { VehicleCategory } from '../src/types';

describe('Intelligent Matching Engine', () => {
  it('should score a near-perfect match for Ravi Kumar Innova requirement against 2022 Innova Crysta', () => {
    const requirement = {
      category: VehicleCategory.PASSENGER,
      brand: 'Toyota',
      model: 'Innova',
      minYear: 2021,
      minBudget: 1600000,
      maxBudget: 2000000,
      fuelType: 'DIESEL',
      transmission: 'ANY',
      maxKm: 75000,
    };

    const vehicle = {
      category: VehicleCategory.PASSENGER,
      make: 'Toyota',
      model: 'Innova Crysta',
      manufacturingYear: 2022,
      price: 1750000,
      fuelType: 'DIESEL',
      transmission: 'MANUAL',
      kmDriven: 48500,
    };

    const result = MatchingEngine.evaluateMatch(requirement, vehicle);
    expect(result.isEligible).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.reasons.some((r) => r.factor === 'Brand' && r.status === 'MATCH')).toBe(true);
    expect(result.reasons.some((r) => r.factor === 'Fuel' && r.status === 'MATCH')).toBe(true);
    expect(result.reasons.some((r) => r.factor === 'Budget' && r.status === 'STRONG_MATCH')).toBe(true);
  });

  it('should reject when vehicle categories do not match (Passenger vs Commercial)', () => {
    const requirement = {
      category: VehicleCategory.PASSENGER,
      brand: 'Tata',
    };

    const vehicle = {
      category: VehicleCategory.COMMERCIAL,
      make: 'Tata',
      model: 'Ace',
    };

    const result = MatchingEngine.evaluateMatch(requirement, vehicle);
    expect(result.isEligible).toBe(false);
    expect(result.score).toBe(0);
    expect(result.reasons[0].factor).toBe('Category');
    expect(result.reasons[0].status).toBe('MISMATCH');
  });

  it('should evaluate commercial vehicle payload and body type properly', () => {
    const requirement = {
      category: VehicleCategory.COMMERCIAL,
      brand: 'Tata',
      model: 'Ace',
      bodyType: 'CLOSED_CONTAINER',
      payloadCapacityKg: 750,
      minBudget: 400000,
      maxBudget: 600000,
      fuelType: 'DIESEL',
    };

    const vehicle = {
      category: VehicleCategory.COMMERCIAL,
      make: 'Tata',
      model: 'Ace Gold',
      bodyType: 'CLOSED_CONTAINER',
      payloadCapacityKg: 750,
      price: 520000,
      fuelType: 'DIESEL',
      manufacturingYear: 2022,
    };

    const result = MatchingEngine.evaluateMatch(requirement, vehicle);
    expect(result.isEligible).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.reasons.some((r) => r.factor === 'Body Type' && r.status === 'MATCH')).toBe(true);
  });
});
