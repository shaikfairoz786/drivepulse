import prisma from '../prisma';
import { MATCH_WEIGHTS } from '../config';
import { VehicleCategory, MatchReason } from '../types';
import { logger } from '../utils/logger';

export interface MatchCalculationResult {
  score: number;
  reasons: MatchReason[];
  isEligible: boolean;
}

export class MatchingEngine {
  /**
   * Calculates matching score and detailed breakdown between a requirement and a vehicle.
   */
  static evaluateMatch(requirement: any, vehicle: any): MatchCalculationResult {
    // 1. Mandatory Category Gate
    if (requirement.category !== vehicle.category) {
      return {
        score: 0,
        reasons: [{
          factor: 'Category',
          status: 'MISMATCH',
          detail: `Requirement is ${requirement.category} while Vehicle is ${vehicle.category}`,
        }],
        isEligible: false,
      };
    }

    const isCommercial = requirement.category === VehicleCategory.COMMERCIAL;
    const weights = isCommercial ? MATCH_WEIGHTS.COMMERCIAL : MATCH_WEIGHTS.PASSENGER;
    const reasons: MatchReason[] = [];

    let totalWeight = 0;
    let earnedPoints = 0;

    let isBrandMismatch = false;
    let isModelMismatch = false;
    let isBudgetMismatch = false;

    // --- BRAND / MAKE MATCHING ---
    const brandWeight = weights.BRAND;
    totalWeight += brandWeight;
    if (requirement.brand) {
      const reqBrand = requirement.brand.toLowerCase().trim();
      const vehMake = vehicle.make.toLowerCase().trim();
      if (vehMake === reqBrand || vehMake.includes(reqBrand) || reqBrand.includes(vehMake)) {
        earnedPoints += brandWeight;
        reasons.push({ factor: 'Brand & Make', status: 'MATCH', detail: `Make '${vehicle.make}' matches '${requirement.brand}'`, scoreContribution: brandWeight });
      } else {
        isBrandMismatch = true;
        reasons.push({ factor: 'Brand & Make', status: 'MISMATCH', detail: `Make '${vehicle.make}' does not match '${requirement.brand}'`, scoreContribution: 0 });
      }
    } else {
      const earned = Math.round(brandWeight * 0.5);
      earnedPoints += earned;
      reasons.push({ factor: 'Brand & Make', status: 'NOT_SPECIFIED', detail: 'Flexible (Any brand accepted)', scoreContribution: earned });
    }

    // --- MODEL MATCHING ---
    const modelWeight = weights.MODEL;
    totalWeight += modelWeight;
    if (requirement.model) {
      const reqModel = requirement.model.toLowerCase().trim();
      const vehModel = vehicle.model.toLowerCase().trim();
      if (vehModel === reqModel) {
        earnedPoints += modelWeight;
        reasons.push({ factor: 'Model', status: 'STRONG_MATCH', detail: `Model '${vehicle.model}' is an exact match`, scoreContribution: modelWeight });
      } else if (vehModel.includes(reqModel) || reqModel.includes(vehModel)) {
        const earned = Math.round(modelWeight * 0.90);
        earnedPoints += earned;
        reasons.push({ factor: 'Model', status: 'MATCH', detail: `Model '${vehicle.model}' matches '${requirement.model}'`, scoreContribution: earned });
      } else {
        isModelMismatch = true;
        reasons.push({ factor: 'Model', status: 'MISMATCH', detail: `Model '${vehicle.model}' does not match '${requirement.model}'`, scoreContribution: 0 });
      }
    } else {
      const earned = Math.round(modelWeight * 0.5);
      earnedPoints += earned;
      reasons.push({ factor: 'Model', status: 'NOT_SPECIFIED', detail: 'Flexible (Any model accepted)', scoreContribution: earned });
    }

    // --- BUDGET MATCHING ---
    const budgetWeight = weights.BUDGET;
    totalWeight += budgetWeight;
    const price = vehicle.price;
    const minBudget = requirement.minBudget ? Number(requirement.minBudget) : null;
    const maxBudget = requirement.maxBudget ? Number(requirement.maxBudget) : null;

    if (minBudget !== null || maxBudget !== null) {
      const lowerLimit = minBudget !== null ? minBudget * 0.90 : 0;
      const upperLimit = maxBudget !== null ? maxBudget * 1.10 : Number.MAX_SAFE_INTEGER;
      const strictLower = minBudget !== null ? minBudget : 0;
      const strictUpper = maxBudget !== null ? maxBudget : Number.MAX_SAFE_INTEGER;

      if (price >= strictLower && price <= strictUpper) {
        earnedPoints += budgetWeight;
        reasons.push({ factor: 'Budget Window', status: 'STRONG_MATCH', detail: `Price ₹${(price / 100000).toFixed(2)}L is strictly inside budget window`, scoreContribution: budgetWeight });
      } else if (price >= lowerLimit && price <= upperLimit) {
        const earned = Math.round(budgetWeight * 0.75);
        earnedPoints += earned;
        reasons.push({ factor: 'Budget Window', status: 'PARTIAL', detail: `Price ₹${(price / 100000).toFixed(2)}L is near budget (±10% tolerance)`, scoreContribution: earned });
      } else {
        isBudgetMismatch = true;
        reasons.push({ factor: 'Budget Window', status: 'MISMATCH', detail: `Price ₹${(price / 100000).toFixed(2)}L is out of range`, scoreContribution: 0 });
      }
    } else {
      const earned = Math.round(budgetWeight * 0.5);
      earnedPoints += earned;
      reasons.push({ factor: 'Budget Window', status: 'NOT_SPECIFIED', detail: 'Flexible (Budget not restricted)', scoreContribution: earned });
    }

    // --- FUEL TYPE MATCHING ---
    const fuelWeight = weights.FUEL;
    totalWeight += fuelWeight;
    if (requirement.fuelType && requirement.fuelType.toUpperCase() !== 'ANY') {
      const reqFuel = requirement.fuelType.toUpperCase().trim();
      const vehFuel = vehicle.fuelType.toUpperCase().trim();
      if (vehFuel === reqFuel || (reqFuel.includes(vehFuel) || vehFuel.includes(reqFuel))) {
        earnedPoints += fuelWeight;
        reasons.push({ factor: 'Fuel Type', status: 'MATCH', detail: `Fuel '${vehicle.fuelType}' is an exact match`, scoreContribution: fuelWeight });
      } else {
        reasons.push({ factor: 'Fuel Type', status: 'MISMATCH', detail: `Fuel '${vehicle.fuelType}' differs from '${requirement.fuelType}'`, scoreContribution: 0 });
      }
    } else {
      const earned = Math.round(fuelWeight * 0.5);
      earnedPoints += earned;
      reasons.push({ factor: 'Fuel Type', status: 'NOT_SPECIFIED', detail: 'Flexible (Any fuel accepted)', scoreContribution: earned });
    }

    // --- YEAR MATCHING ---
    const yearWeight = weights.YEAR;
    totalWeight += yearWeight;
    const vehYear = vehicle.manufacturingYear;
    const minYear = requirement.minYear ? Number(requirement.minYear) : null;
    const maxYear = requirement.maxYear ? Number(requirement.maxYear) : null;

    if (minYear !== null || maxYear !== null) {
      const lowerYear = minYear || 1990;
      const upperYear = maxYear || 2035;
      if (vehYear >= lowerYear && vehYear <= upperYear) {
        earnedPoints += yearWeight;
        reasons.push({ factor: 'Manufacturing Year', status: 'MATCH', detail: `Year ${vehYear} matches requested year range`, scoreContribution: yearWeight });
      } else if (minYear && vehYear === minYear - 1) {
        const earned = Math.round(yearWeight * 0.6);
        earnedPoints += earned;
        reasons.push({ factor: 'Manufacturing Year', status: 'PARTIAL', detail: `Year ${vehYear} is within 1 year of target ${minYear}`, scoreContribution: earned });
      } else {
        reasons.push({ factor: 'Manufacturing Year', status: 'MISMATCH', detail: `Year ${vehYear} outside target range (${lowerYear}-${upperYear})`, scoreContribution: 0 });
      }
    } else {
      const earned = Math.round(yearWeight * 0.5);
      earnedPoints += earned;
      reasons.push({ factor: 'Manufacturing Year', status: 'NOT_SPECIFIED', detail: 'Flexible (Year range not specified)', scoreContribution: earned });
    }

    // --- CATEGORY-SPECIFIC CRITERIA ---
    if (!isCommercial) {
      // Passenger: Transmission & KM
      const transKmWeight = (weights as typeof MATCH_WEIGHTS.PASSENGER).TRANSMISSION_KM;
      const halfWeight = Math.round(transKmWeight * 0.5);
      totalWeight += transKmWeight;

      if (requirement.transmission && requirement.transmission.toUpperCase() !== 'ANY') {
        const reqTrans = requirement.transmission.toUpperCase();
        const vehTrans = (vehicle.transmission || '').toUpperCase();
        if (vehTrans === reqTrans) {
          earnedPoints += halfWeight;
          reasons.push({ factor: 'Transmission', status: 'MATCH', detail: `Transmission '${vehicle.transmission}' matches`, scoreContribution: halfWeight });
        } else {
          reasons.push({ factor: 'Transmission', status: 'MISMATCH', detail: `Transmission '${vehicle.transmission || 'N/A'}' differs`, scoreContribution: 0 });
        }
      } else {
        const earned = Math.round(halfWeight * 0.5);
        earnedPoints += earned;
        reasons.push({ factor: 'Transmission', status: 'NOT_SPECIFIED', detail: 'Flexible (Any transmission)', scoreContribution: earned });
      }

      if (requirement.maxKm) {
        if (vehicle.kmDriven <= requirement.maxKm) {
          earnedPoints += halfWeight;
          reasons.push({ factor: 'Kilometers', status: 'MATCH', detail: `${vehicle.kmDriven.toLocaleString()} KM is under requested ${requirement.maxKm.toLocaleString()} KM limit`, scoreContribution: halfWeight });
        } else if (vehicle.kmDriven <= requirement.maxKm * 1.15) {
          const earned = Math.round(halfWeight * 0.5);
          earnedPoints += earned;
          reasons.push({ factor: 'Kilometers', status: 'PARTIAL', detail: `${vehicle.kmDriven.toLocaleString()} KM is slightly near target (+15%)`, scoreContribution: earned });
        } else {
          reasons.push({ factor: 'Kilometers', status: 'MISMATCH', detail: `${vehicle.kmDriven.toLocaleString()} KM exceeds limit of ${requirement.maxKm.toLocaleString()} KM`, scoreContribution: 0 });
        }
      } else {
        const earned = Math.round(halfWeight * 0.5);
        earnedPoints += earned;
        reasons.push({ factor: 'Kilometers', status: 'NOT_SPECIFIED', detail: 'Flexible (KM not capped)', scoreContribution: earned });
      }
    } else {
      // Commercial: Body Type & Payload & Wheels
      const commWeights = weights as typeof MATCH_WEIGHTS.COMMERCIAL;
      const bodyPayloadWeight = commWeights.BODY_TYPE_PAYLOAD;
      totalWeight += bodyPayloadWeight;

      if (requirement.bodyType && vehicle.bodyType) {
        if (requirement.bodyType.toLowerCase() === vehicle.bodyType.toLowerCase()) {
          const earned = Math.round(bodyPayloadWeight * 0.6);
          earnedPoints += earned;
          reasons.push({ factor: 'Body Type', status: 'MATCH', detail: `Commercial body '${vehicle.bodyType}' matches`, scoreContribution: earned });
        } else {
          reasons.push({ factor: 'Body Type', status: 'MISMATCH', detail: `Body type '${vehicle.bodyType}' differs from '${requirement.bodyType}'`, scoreContribution: 0 });
        }
      } else {
        const earned = Math.round(bodyPayloadWeight * 0.5);
        earnedPoints += earned;
        reasons.push({ factor: 'Body Type', status: 'NOT_SPECIFIED', detail: 'Flexible (Body type not restricted)', scoreContribution: earned });
      }

      if (requirement.payloadCapacityKg && vehicle.payloadCapacityKg) {
        const diff = Math.abs(vehicle.payloadCapacityKg - requirement.payloadCapacityKg) / requirement.payloadCapacityKg;
        if (diff <= 0.2) {
          const earned = Math.round(bodyPayloadWeight * 0.4);
          earnedPoints += earned;
          reasons.push({ factor: 'Payload', status: 'MATCH', detail: `Payload ${vehicle.payloadCapacityKg} kg meets requirement`, scoreContribution: earned });
        } else {
          reasons.push({ factor: 'Payload', status: 'MISMATCH', detail: `Payload ${vehicle.payloadCapacityKg} kg differs from ${requirement.payloadCapacityKg} kg`, scoreContribution: 0 });
        }
      } else {
        const earned = Math.round(bodyPayloadWeight * 0.5);
        earnedPoints += earned;
        reasons.push({ factor: 'Payload', status: 'NOT_SPECIFIED', detail: 'Flexible (Payload capacity not restricted)', scoreContribution: earned });
      }

      const wheelsKmWeight = commWeights.WHEELS_KM;
      totalWeight += wheelsKmWeight;
      earnedPoints += Math.round(wheelsKmWeight * 0.5);
      reasons.push({ factor: 'Axle / Wheels', status: 'NOT_SPECIFIED', detail: 'Commercial specifications accepted', scoreContribution: Math.round(wheelsKmWeight * 0.5) });
    }

    const calculatedScore = totalWeight > 0 ? Math.round((earnedPoints / totalWeight) * 100) : 0;
    let finalScore = Math.max(0, Math.min(100, calculatedScore));

    // Core compatibility gate:
    // If multiple primary criteria are completely mismatched, the vehicle cannot be considered a match (< 50%)
    if (
      (isModelMismatch && isBudgetMismatch) ||
      (isBrandMismatch && isBudgetMismatch) ||
      (isBrandMismatch && isModelMismatch)
    ) {
      finalScore = Math.min(finalScore, 40);
    }

    // Match is strictly eligible ONLY if final score is >= 50%
    const isEligible = finalScore >= 50;

    return {
      score: finalScore,
      reasons,
      isEligible,
    };
  }

  /**
   * Evaluates all active requirements against a specific vehicle and updates VehicleMatch records.
   */
  static async matchVehicleAgainstRequirements(vehicleId: string): Promise<number> {
    try {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
      });

      if (!vehicle || vehicle.status !== 'AVAILABLE') {
        // If vehicle is no longer available, clean up all existing matches for it
        await prisma.vehicleMatch.deleteMany({
          where: { vehicleId },
        });
        return 0;
      }

      // Fetch all active requirements (not closed/won/lost)
      const activeRequirements = await prisma.customerRequirement.findMany({
        where: {
          category: vehicle.category,
          status: {
            notIn: ['WON', 'LOST'],
          },
        },
        include: {
          customer: true,
        },
      });

      // Remove matches against inactive or cross-category requirements
      const activeReqIds = activeRequirements.map((r) => r.id);
      await prisma.vehicleMatch.deleteMany({
        where: {
          vehicleId: vehicle.id,
          requirementId: { notIn: activeReqIds },
        },
      });

      let matchCount = 0;

      for (const req of activeRequirements) {
        const evaluation = this.evaluateMatch(req, vehicle);
        if (evaluation.isEligible) {
          await prisma.vehicleMatch.upsert({
            where: {
              requirementId_vehicleId: {
                requirementId: req.id,
                vehicleId: vehicle.id,
              },
            },
            create: {
              requirementId: req.id,
              vehicleId: vehicle.id,
              matchScore: evaluation.score,
              matchReasons: JSON.stringify(evaluation.reasons),
            },
            update: {
              matchScore: evaluation.score,
              matchReasons: JSON.stringify(evaluation.reasons),
            },
          });

          // Log activity if match is strong (>= 75%)
          if (evaluation.score >= 75) {
            await prisma.leadActivity.create({
              data: {
                requirementId: req.id,
                activityType: 'VEHICLE_MATCHED',
                title: 'High-Scoring Vehicle Matched',
                description: `Matched with ${vehicle.make} ${vehicle.model} (${vehicle.manufacturingYear}) with score ${evaluation.score}%`,
                metadata: JSON.stringify({
                  vehicleId: vehicle.id,
                  score: evaluation.score,
                  price: vehicle.price,
                }),
              },
            });

            // Trigger In-App Notification if requirement has assigned staff
            if (req.assignedToId) {
              await prisma.notification.create({
                data: {
                  userId: req.assignedToId,
                  title: '⚡ High Stock Match Alert',
                  message: `New inventory ${vehicle.make} ${vehicle.model} (${evaluation.score}% match) is ready for ${req.customer?.fullName || 'lead'}!`,
                  link: `/inventory/${vehicle.id}?tab=matches`,
                },
              }).catch(() => {});
            }
          }

          matchCount++;
        } else {
          // Remove obsolete match if criteria no longer match
          await prisma.vehicleMatch.deleteMany({
            where: {
              requirementId: req.id,
              vehicleId: vehicle.id,
            },
          });
        }
      }

      logger.info(`Vehicle ${vehicleId} matched against ${matchCount} active requirements.`);
      return matchCount;
    } catch (error) {
      logger.error(`Error matching vehicle ${vehicleId}:`, error);
      return 0;
    }
  }

  /**
   * Evaluates all available inventory against a specific requirement.
   */
  static async matchRequirementAgainstInventory(requirementId: string): Promise<number> {
    try {
      const requirement = await prisma.customerRequirement.findUnique({
        where: { id: requirementId },
      });

      if (!requirement || requirement.status === 'WON' || requirement.status === 'LOST') {
        // If requirement is closed, delete all its existing matches
        await prisma.vehicleMatch.deleteMany({
          where: { requirementId },
        });
        return 0;
      }

      const availableVehicles = await prisma.vehicle.findMany({
        where: {
          category: requirement.category,
          status: 'AVAILABLE',
        },
      });

      // Remove any existing matches for vehicles that are no longer available or wrong category
      const availableVehicleIds = availableVehicles.map((v) => v.id);
      await prisma.vehicleMatch.deleteMany({
        where: {
          requirementId: requirement.id,
          vehicleId: { notIn: availableVehicleIds },
        },
      });

      let matchCount = 0;

      for (const vehicle of availableVehicles) {
        const evaluation = this.evaluateMatch(requirement, vehicle);
        if (evaluation.isEligible) {
          await prisma.vehicleMatch.upsert({
            where: {
              requirementId_vehicleId: {
                requirementId: requirement.id,
                vehicleId: vehicle.id,
              },
            },
            create: {
              requirementId: requirement.id,
              vehicleId: vehicle.id,
              matchScore: evaluation.score,
              matchReasons: JSON.stringify(evaluation.reasons),
            },
            update: {
              matchScore: evaluation.score,
              matchReasons: JSON.stringify(evaluation.reasons),
            },
          });
          matchCount++;
        } else {
          // Remove obsolete match if criteria no longer match
          await prisma.vehicleMatch.deleteMany({
            where: {
              requirementId: requirement.id,
              vehicleId: vehicle.id,
            },
          });
        }
      }

      return matchCount;
    } catch (error) {
      logger.error(`Error matching requirement ${requirementId}:`, error);
      return 0;
    }
  }

  /**
   * Recalculates all matches in batch across entire database.
   */
  static async recalculateAllMatches(): Promise<{ totalMatches: number; processedVehicles: number }> {
    // Clean up any stale matches under 50% threshold
    await prisma.vehicleMatch.deleteMany({
      where: {
        matchScore: { lt: 50 },
      },
    });

    const vehicles = await prisma.vehicle.findMany({
      where: { status: 'AVAILABLE' },
    });

    let totalMatches = 0;
    for (const v of vehicles) {
      const count = await this.matchVehicleAgainstRequirements(v.id);
      totalMatches += count;
    }

    return { totalMatches, processedVehicles: vehicles.length };
  }
}
