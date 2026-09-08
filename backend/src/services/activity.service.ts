import prisma from '../prisma';

export class ActivityService {
  static async logActivity(data: {
    requirementId: string;
    activityType: string;
    title: string;
    description: string;
    metadata?: any;
    performedById?: string;
  }) {
    const requirement = await prisma.customerRequirement.findUnique({
      where: { id: data.requirementId },
    });

    if (!requirement) throw { status: 404, message: 'Requirement not found' };

    return prisma.leadActivity.create({
      data: {
        requirementId: data.requirementId,
        performedById: data.performedById || null,
        activityType: data.activityType,
        title: data.title,
        description: data.description,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
      include: {
        performedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  static async listActivities(requirementId: string) {
    return prisma.leadActivity.findMany({
      where: { requirementId },
      orderBy: { createdAt: 'desc' },
      include: {
        performedBy: { select: { id: true, fullName: true, role: true } },
      },
    });
  }
}
