import prisma from '../prisma';
import { normalizeMobile } from '../utils/mobile';

export class SearchService {
  static async globalSearch(query: string) {
    if (!query || query.trim().length === 0) {
      return {
        customers: [],
        requirements: [],
        vehicles: [],
        activities: [],
      };
    }

    const q = query.trim();
    const normalizedMobile = normalizeMobile(q);

    const [customers, requirements, vehicles, activities] = await Promise.all([
      // Customers
      prisma.customer.findMany({
        where: {
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { city: { contains: q, mode: 'insensitive' } },
            { location: { contains: q, mode: 'insensitive' } },
            ...(normalizedMobile ? [{ primaryMobile: { contains: normalizedMobile } }] : []),
          ],
        },
        take: 6,
        select: {
          id: true,
          fullName: true,
          primaryMobile: true,
          city: true,
          customerType: true,
          _count: { select: { requirements: true } },
        },
      }),

      // Requirements
      prisma.customerRequirement.findMany({
        where: {
          OR: [
            { brand: { contains: q, mode: 'insensitive' } },
            { model: { contains: q, mode: 'insensitive' } },
            { variant: { contains: q, mode: 'insensitive' } },
            { generalNotes: { contains: q, mode: 'insensitive' } },
            { customer: { fullName: { contains: q, mode: 'insensitive' } } },
            ...(normalizedMobile ? [{ customer: { primaryMobile: { contains: normalizedMobile } } }] : []),
          ],
        },
        take: 6,
        select: {
          id: true,
          category: true,
          brand: true,
          model: true,
          minBudget: true,
          maxBudget: true,
          status: true,
          priority: true,
          customer: { select: { id: true, fullName: true, primaryMobile: true } },
        },
      }),

      // Vehicles
      prisma.vehicle.findMany({
        where: {
          OR: [
            { make: { contains: q, mode: 'insensitive' } },
            { model: { contains: q, mode: 'insensitive' } },
            { variant: { contains: q, mode: 'insensitive' } },
            { registrationNumber: { contains: q, mode: 'insensitive' } },
            { location: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 6,
        select: {
          id: true,
          category: true,
          make: true,
          model: true,
          manufacturingYear: true,
          fuelType: true,
          price: true,
          status: true,
          location: true,
        },
      }),

      // Activities
      prisma.leadActivity.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 6,
        select: {
          id: true,
          activityType: true,
          title: true,
          description: true,
          createdAt: true,
          requirementId: true,
          requirement: {
            select: {
              customer: { select: { fullName: true } },
            },
          },
        },
      }),
    ]);

    return {
      customers,
      requirements,
      vehicles,
      activities,
    };
  }
}
