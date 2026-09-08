import prisma from '../prisma';
import { LeadStatus, VehicleStatus, FollowUpStatus } from '../types';

export class ReportingService {
  static async getDashboardStats(user?: { userId: string; role: string }) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const isStaffRestricted = user?.role === 'SALES_EXECUTIVE' || user?.role === 'FIELD_AGENT';
    const reqScope = isStaffRestricted ? { assignedToId: user?.userId } : {};
    const followUpScope = isStaffRestricted ? { assignedToId: user?.userId } : {};

    const [
      totalCustomers,
      totalRequirements,
      activeRequirements,
      newLeadsToday,
      wonDeals,
      lostDeals,
      overdueFollowUps,
      todayFollowUps,
      upcomingFollowUps,
      availableVehicles,
      totalVehicles,
      matchingOpportunitiesCount,
      recentActivities,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customerRequirement.count({ where: reqScope }),
      prisma.customerRequirement.count({
        where: {
          ...reqScope,
          status: { notIn: [LeadStatus.WON, LeadStatus.LOST] },
        },
      }),
      prisma.customerRequirement.count({
        where: {
          ...reqScope,
          createdAt: { gte: startOfToday },
        },
      }),
      prisma.customerRequirement.count({
        where: { ...reqScope, status: LeadStatus.WON },
      }),
      prisma.customerRequirement.count({
        where: { ...reqScope, status: LeadStatus.LOST },
      }),
      prisma.followUp.count({
        where: {
          ...followUpScope,
          status: FollowUpStatus.PENDING,
          followUpDate: { lt: startOfToday },
        },
      }),
      prisma.followUp.count({
        where: {
          ...followUpScope,
          status: FollowUpStatus.PENDING,
          followUpDate: { gte: startOfToday, lte: endOfToday },
        },
      }),
      prisma.followUp.count({
        where: {
          ...followUpScope,
          status: FollowUpStatus.PENDING,
          followUpDate: { gt: endOfToday },
        },
      }),
      prisma.vehicle.count({
        where: { status: VehicleStatus.AVAILABLE },
      }),
      prisma.vehicle.count(),
      prisma.vehicleMatch.count({
        where: {
          isIgnored: false,
          matchScore: { gte: 70 },
          vehicle: { status: VehicleStatus.AVAILABLE },
          requirement: {
            status: { notIn: [LeadStatus.WON, LeadStatus.LOST] },
            ...(isStaffRestricted ? { assignedToId: user?.userId } : {}),
          },
        },
      }),
      prisma.leadActivity.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          performedBy: { select: { id: true, fullName: true, role: true } },
          requirement: {
            select: {
              id: true,
              brand: true,
              model: true,
              customer: { select: { fullName: true } },
            },
          },
        },
      }),
    ]);

    // Lead Pipeline Funnel
    const pipelineCounts = await prisma.customerRequirement.groupBy({
      by: ['status'],
      where: reqScope,
      _count: { id: true },
    });

    const statusMap: Record<string, number> = {};
    pipelineCounts.forEach((item) => {
      statusMap[item.status] = item._count.id;
    });

    const funnelStages = [
      { stage: 'New Enquiries', status: LeadStatus.NEW, count: statusMap[LeadStatus.NEW] || 0 },
      { stage: 'Contacted', status: LeadStatus.CONTACTED, count: statusMap[LeadStatus.CONTACTED] || 0 },
      { stage: 'Req Confirmed', status: LeadStatus.REQUIREMENT_CONFIRMED, count: statusMap[LeadStatus.REQUIREMENT_CONFIRMED] || 0 },
      { stage: 'Vehicle Matched', status: LeadStatus.VEHICLE_MATCHED, count: statusMap[LeadStatus.VEHICLE_MATCHED] || 0 },
      { stage: 'Vehicle Shared', status: LeadStatus.VEHICLE_SHARED, count: statusMap[LeadStatus.VEHICLE_SHARED] || 0 },
      { stage: 'Interested', status: LeadStatus.INTERESTED, count: statusMap[LeadStatus.INTERESTED] || 0 },
      { stage: 'Visit Scheduled', status: LeadStatus.VISIT_SCHEDULED, count: statusMap[LeadStatus.VISIT_SCHEDULED] || 0 },
      { stage: 'Test Drive', status: LeadStatus.TEST_DRIVE, count: statusMap[LeadStatus.TEST_DRIVE] || 0 },
      { stage: 'Negotiation', status: LeadStatus.NEGOTIATION, count: statusMap[LeadStatus.NEGOTIATION] || 0 },
      { stage: 'Booking', status: LeadStatus.BOOKING, count: statusMap[LeadStatus.BOOKING] || 0 },
      { stage: 'Won (Sale)', status: LeadStatus.WON, count: statusMap[LeadStatus.WON] || 0 },
    ];

    return {
      kpis: {
        totalCustomers,
        totalRequirements,
        activeRequirements,
        newLeadsToday,
        wonDeals,
        lostDeals,
        availableVehicles,
        totalVehicles,
        matchingOpportunitiesCount,
      },
      followUps: {
        overdue: overdueFollowUps,
        today: todayFollowUps,
        upcoming: upcomingFollowUps,
      },
      funnel: funnelStages,
      recentActivities,
    };
  }

  static async getLeadSourceReport() {
    const sources = await prisma.customerRequirement.groupBy({
      by: ['source'],
      _count: { id: true },
    });

    const wonPerSource = await prisma.customerRequirement.groupBy({
      by: ['source'],
      where: { status: LeadStatus.WON },
      _count: { id: true },
    });

    const wonMap: Record<string, number> = {};
    wonPerSource.forEach((w) => {
      wonMap[w.source] = w._count.id;
    });

    return sources.map((s) => {
      const total = s._count.id;
      const won = wonMap[s.source] || 0;
      const conversionRate = total > 0 ? ((won / total) * 100).toFixed(1) : '0';
      return {
        source: s.source || 'Unknown',
        totalLeads: total,
        wonLeads: won,
        conversionRate: Number(conversionRate),
      };
    }).sort((a, b) => b.totalLeads - a.totalLeads);
  }

  static async getTeamPerformanceReport() {
    const staffMembers = await prisma.user.findMany({
      where: {
        role: { in: ['SALES_EXECUTIVE', 'FIELD_AGENT', 'MANAGER'] },
      },
      include: {
        assignedRequirements: {
          select: {
            id: true,
            status: true,
            wonDealAmount: true,
          },
        },
        followUps: {
          select: { id: true, status: true },
        },
      },
    });

    return staffMembers.map((member) => {
      const totalAssigned = member.assignedRequirements.length;
      const wonDeals = member.assignedRequirements.filter((r) => r.status === LeadStatus.WON);
      const lostDeals = member.assignedRequirements.filter((r) => r.status === LeadStatus.LOST);
      const activeDeals = totalAssigned - wonDeals.length - lostDeals.length;
      const completedFollowUps = member.followUps.filter((f) => f.status === FollowUpStatus.COMPLETED).length;
      const wonRevenue = wonDeals.reduce((sum, r) => sum + (r.wonDealAmount || 0), 0);
      const conversionRate = totalAssigned > 0 ? ((wonDeals.length / totalAssigned) * 100).toFixed(1) : '0';

      return {
        userId: member.id,
        fullName: member.fullName,
        role: member.role,
        totalAssigned,
        activeDeals,
        wonDeals: wonDeals.length,
        lostDeals: lostDeals.length,
        completedFollowUps,
        wonRevenue,
        conversionRate: Number(conversionRate),
      };
    }).sort((a, b) => b.wonDeals - a.wonDeals);
  }

  static async getVehicleDemandReport() {
    // Demanded models from customer requirements
    const brandRequirements = await prisma.customerRequirement.groupBy({
      by: ['brand', 'category'],
      where: {
        status: { notIn: [LeadStatus.WON, LeadStatus.LOST] },
        brand: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const result = await Promise.all(
      brandRequirements.map(async (item) => {
        const brandName = item.brand || 'Other';
        const inStockCount = await prisma.vehicle.count({
          where: {
            make: { contains: brandName },
            status: VehicleStatus.AVAILABLE,
          },
        });

        return {
          brand: brandName,
          category: item.category,
          demandedRequirements: item._count.id,
          availableStock: inStockCount,
          supplyDeficit: Math.max(0, item._count.id - inStockCount),
        };
      })
    );

    return result;
  }

  static async getInventoryOpportunityReport(minScore: number = 50) {
    // Vehicles with active matching requirements count above minScore (default 50%)
    const availableVehicles = await prisma.vehicle.findMany({
      where: { status: VehicleStatus.AVAILABLE },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        matches: {
          where: {
            isIgnored: false,
            matchScore: { gte: Math.max(50, minScore) },
            requirement: { status: { notIn: [LeadStatus.WON, LeadStatus.LOST] } },
          },
          include: {
            requirement: {
              select: {
                id: true,
                customer: { select: { fullName: true, primaryMobile: true } },
                brand: true,
                model: true,
                minBudget: true,
                maxBudget: true,
                status: true,
                fuelType: true,
                minYear: true,
                maxYear: true,
                transmission: true,
                maxKm: true,
              },
            },
          },
          orderBy: { matchScore: 'desc' },
        },
      },
    });

    const opportunities = availableVehicles
      .map((v) => ({
        vehicleId: v.id,
        make: v.make,
        model: v.model,
        variant: v.variant,
        year: v.manufacturingYear,
        fuelType: v.fuelType,
        category: v.category,
        price: v.price,
        location: v.location,
        transmission: v.transmission,
        kmDriven: v.kmDriven,
        primaryImage: v.images[0]?.url || null,
        matchingBuyersCount: v.matches.length,
        topMatches: v.matches.map((m) => {
          let reasons: any[] = [];
          try {
            reasons = typeof m.matchReasons === 'string' ? JSON.parse(m.matchReasons) : (m.matchReasons || []);
          } catch (e) {}
          return {
            requirementId: m.requirementId,
            customerName: m.requirement.customer.fullName,
            mobile: m.requirement.customer.primaryMobile,
            score: m.matchScore,
            status: m.requirement.status,
            brand: m.requirement.brand,
            model: m.requirement.model,
            minBudget: m.requirement.minBudget,
            maxBudget: m.requirement.maxBudget,
            fuelType: m.requirement.fuelType,
            minYear: m.requirement.minYear,
            maxYear: m.requirement.maxYear,
            transmission: m.requirement.transmission,
            maxKm: m.requirement.maxKm,
            reasons,
          };
        }),
      }))
      .filter((opp) => opp.matchingBuyersCount > 0)
      .sort((a, b) => b.matchingBuyersCount - a.matchingBuyersCount);

    return opportunities;
  }
}
