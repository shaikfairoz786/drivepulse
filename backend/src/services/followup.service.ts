import prisma from '../prisma';
import { FollowUpStatus, FollowUpType } from '../types';

export class FollowUpService {
  static async createFollowUp(data: {
    requirementId: string;
    assignedToId: string;
    followUpDate: string | Date;
    followUpType?: FollowUpType;
    notes?: string | null;
    userId?: string;
  }) {
    const requirement = await prisma.customerRequirement.findUnique({
      where: { id: data.requirementId },
      include: { customer: true },
    });

    if (!requirement) throw { status: 404, message: 'Requirement not found' };

    const followUp = await prisma.followUp.create({
      data: {
        requirementId: data.requirementId,
        assignedToId: data.assignedToId,
        followUpDate: new Date(data.followUpDate),
        followUpType: data.followUpType || FollowUpType.CALL,
        status: FollowUpStatus.PENDING,
        notes: data.notes || null,
      },
      include: {
        assignedTo: { select: { id: true, fullName: true, mobile: true } },
        requirement: { include: { customer: true } },
      },
    });

    // Record timeline activity
    await prisma.leadActivity.create({
      data: {
        requirementId: data.requirementId,
        performedById: data.userId || null,
        activityType: 'FOLLOW_UP_SCHEDULED',
        title: `Follow-up Scheduled (${followUp.followUpType})`,
        description: `Scheduled for ${new Date(data.followUpDate).toLocaleString()}: ${data.notes || 'Routine follow-up'}`,
        metadata: JSON.stringify({
          followUpId: followUp.id,
          date: followUp.followUpDate,
          type: followUp.followUpType,
        }),
      },
    });

    return followUp;
  }

  static async listFollowUps(params: {
    tab?: 'TODAY' | 'OVERDUE' | 'UPCOMING' | 'COMPLETED' | 'ALL';
    assignedToId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const where: any = {};

    if (params.assignedToId) {
      where.assignedToId = params.assignedToId;
    }

    if (params.tab === 'TODAY') {
      where.status = FollowUpStatus.PENDING;
      where.followUpDate = {
        gte: startOfToday,
        lte: endOfToday,
      };
    } else if (params.tab === 'OVERDUE') {
      where.status = FollowUpStatus.PENDING;
      where.followUpDate = {
        lt: startOfToday,
      };
    } else if (params.tab === 'UPCOMING') {
      where.status = FollowUpStatus.PENDING;
      where.followUpDate = {
        gt: endOfToday,
      };
    } else if (params.tab === 'COMPLETED') {
      where.status = FollowUpStatus.COMPLETED;
    } else if (params.status) {
      where.status = params.status;
    }

    const [total, followUps, countOverdue, countToday, countUpcoming] = await Promise.all([
      prisma.followUp.count({ where }),
      prisma.followUp.findMany({
        where,
        skip,
        take: limit,
        orderBy: { followUpDate: 'asc' },
        include: {
          assignedTo: { select: { id: true, fullName: true, mobile: true, email: true } },
          requirement: {
            include: {
              customer: {
                select: {
                  id: true,
                  fullName: true,
                  primaryMobile: true,
                  alternateMobile: true,
                  city: true,
                },
              },
            },
          },
        },
      }),
      // Aggregate badge counts
      prisma.followUp.count({
        where: {
          status: FollowUpStatus.PENDING,
          followUpDate: { lt: startOfToday },
          ...(params.assignedToId ? { assignedToId: params.assignedToId } : {}),
        },
      }),
      prisma.followUp.count({
        where: {
          status: FollowUpStatus.PENDING,
          followUpDate: { gte: startOfToday, lte: endOfToday },
          ...(params.assignedToId ? { assignedToId: params.assignedToId } : {}),
        },
      }),
      prisma.followUp.count({
        where: {
          status: FollowUpStatus.PENDING,
          followUpDate: { gt: endOfToday },
          ...(params.assignedToId ? { assignedToId: params.assignedToId } : {}),
        },
      }),
    ]);

    return {
      followUps,
      counts: {
        overdue: countOverdue,
        today: countToday,
        upcoming: countUpcoming,
      },
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async completeFollowUp(
    id: string,
    data: {
      outcome: string;
      status?: FollowUpStatus;
      nextFollowUpDate?: string | null;
      nextFollowUpType?: FollowUpType | null;
      nextFollowUpNotes?: string | null;
      userId?: string;
      userRole?: string;
    }
  ) {
    const existing = await prisma.followUp.findUnique({
      where: { id },
      include: { requirement: { include: { customer: true } } },
    });

    if (!existing) throw { status: 404, message: 'Follow-up not found' };

    // RBAC: Non-manager staff (Sales / Field executives) can only complete tasks assigned to them
    const isManagerOrAdmin = data.userRole === 'ADMIN' || data.userRole === 'MANAGER';
    if (!isManagerOrAdmin && existing.assignedToId && existing.assignedToId !== data.userId) {
      throw {
        status: 403,
        message: 'You do not have permission to complete a follow-up assigned to another staff member.',
      };
    }

    const updated = await prisma.followUp.update({
      where: { id },
      data: {
        status: data.status || FollowUpStatus.COMPLETED,
        outcome: data.outcome,
        completedAt: new Date(),
      },
      include: { assignedTo: true, requirement: { include: { customer: true } } },
    });

    // Record activity
    await prisma.leadActivity.create({
      data: {
        requirementId: existing.requirementId,
        performedById: data.userId || null,
        activityType: 'FOLLOW_UP_COMPLETED',
        title: `Follow-up Completed (${existing.followUpType})`,
        description: `Outcome: ${data.outcome}`,
        metadata: JSON.stringify({
          followUpId: existing.id,
          outcome: data.outcome,
        }),
      },
    });

    // If next follow-up is requested, schedule it seamlessly
    let nextFollowUp = null;
    if (data.nextFollowUpDate) {
      nextFollowUp = await this.createFollowUp({
        requirementId: existing.requirementId,
        assignedToId: existing.assignedToId,
        followUpDate: data.nextFollowUpDate,
        followUpType: data.nextFollowUpType || FollowUpType.CALL,
        notes: data.nextFollowUpNotes || null,
        userId: data.userId,
      });
    }

    return {
      completed: updated,
      nextFollowUp,
    };
  }
}
