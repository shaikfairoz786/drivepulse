import prisma from '../prisma';
import { MatchingEngine } from './matching.service';
import { logAudit } from '../middleware/audit';
import { LeadStatus, Priority, VehicleCategory } from '../types';

export class RequirementService {
  static async createRequirement(data: any, createdById?: string, creatorRole?: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });

    if (!customer) {
      throw { status: 404, message: 'Customer not found' };
    }

    // If created by a non-manager staff (Sales Executive or Field Agent), automatically assign to themselves
    let assignedToId = data.assignedToId || null;
    const isManagerRole = creatorRole === 'ADMIN' || creatorRole === 'MANAGER';
    if (!isManagerRole && createdById) {
      assignedToId = createdById;
    }

    const requirement = await prisma.customerRequirement.create({
      data: {
        customerId: data.customerId,
        category: data.category || VehicleCategory.PASSENGER,
        status: data.status || LeadStatus.NEW,
        priority: data.priority || Priority.MEDIUM,
        source: data.source || customer.source || 'WALK_IN',
        assignedToId,

        brand: data.brand ? data.brand.trim() : null,
        model: data.model ? data.model.trim() : null,
        variant: data.variant ? data.variant.trim() : null,
        minBudget: data.minBudget !== undefined ? Number(data.minBudget) : null,
        maxBudget: data.maxBudget !== undefined ? Number(data.maxBudget) : null,
        minYear: data.minYear !== undefined ? Number(data.minYear) : null,
        maxYear: data.maxYear !== undefined ? Number(data.maxYear) : null,
        fuelType: data.fuelType ? data.fuelType.toUpperCase().trim() : null,
        transmission: data.transmission ? data.transmission.toUpperCase().trim() : null,
        maxKm: data.maxKm !== undefined ? Number(data.maxKm) : null,
        preferredColor: data.preferredColor || null,
        ownershipPreference: data.ownershipPreference || null,
        locationPreference: data.locationPreference || null,
        usagePurpose: data.usagePurpose || null,
        generalNotes: data.generalNotes || null,

        // Commercial fields
        commercialType: data.commercialType || null,
        bodyType: data.bodyType || null,
        payloadCapacityKg: data.payloadCapacityKg !== undefined ? Number(data.payloadCapacityKg) : null,
        numberOfWheels: data.numberOfWheels !== undefined ? Number(data.numberOfWheels) : null,
        axleConfiguration: data.axleConfiguration || null,
        loadRequirement: data.loadRequirement || null,
        routePermit: data.routePermit || null,
      },
      include: {
        customer: true,
        assignedTo: { select: { id: true, fullName: true } },
      },
    });

    // Record Lead Creation in timeline
    await prisma.leadActivity.create({
      data: {
        requirementId: requirement.id,
        performedById: createdById || null,
        activityType: 'LEAD_CREATED',
        title: 'Requirement Created',
        description: `New ${requirement.category} requirement recorded for ${customer.fullName}: ${requirement.brand || ''} ${requirement.model || ''}`,
      },
    });

    await logAudit({
      userId: createdById,
      entity: 'CustomerRequirement',
      entityId: requirement.id,
      action: 'CREATE',
      newValue: {
        customer: customer.fullName,
        brand: requirement.brand,
        model: requirement.model,
        budget: `${requirement.minBudget}-${requirement.maxBudget}`,
      },
    });

    // Evaluate matching against existing inventory
    await MatchingEngine.matchRequirementAgainstInventory(requirement.id);

    return requirement;
  }

  static async listRequirements(params: {
    status?: string;
    priority?: string;
    category?: string;
    brand?: string;
    assignedToId?: string;
    minBudget?: number;
    maxBudget?: number;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(params.limit) || 25));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.status) {
      const statuses = params.status.split(',').map((s) => s.trim());
      where.status = { in: statuses };
    }

    if (params.priority) {
      where.priority = params.priority;
    }

    if (params.category) {
      where.category = params.category;
    }

    if (params.brand) {
      where.brand = { contains: params.brand, mode: 'insensitive' };
    }

    if (params.assignedToId) {
      where.assignedToId = params.assignedToId;
    }

    if (params.minBudget || params.maxBudget) {
      if (params.minBudget && params.maxBudget) {
        where.OR = [
          { minBudget: { lte: params.maxBudget }, maxBudget: { gte: params.minBudget } },
          { minBudget: null, maxBudget: { gte: params.minBudget } },
          { maxBudget: null, minBudget: { lte: params.maxBudget } },
        ];
      } else if (params.minBudget) {
        where.maxBudget = { gte: params.minBudget };
      } else if (params.maxBudget) {
        where.minBudget = { lte: params.maxBudget };
      }
    }

    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { brand: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
        { variant: { contains: q, mode: 'insensitive' } },
        { customer: { fullName: { contains: q, mode: 'insensitive' } } },
        { customer: { primaryMobile: { contains: q } } },
      ];
    }

    const [total, requirements] = await Promise.all([
      prisma.customerRequirement.count({ where }),
      prisma.customerRequirement.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'asc' }, { updatedAt: 'desc' }],
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              primaryMobile: true,
              city: true,
              customerType: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
          matches: {
            where: { isIgnored: false, matchScore: { gte: 50 } },
            select: { id: true, matchScore: true },
          },
          _count: {
            select: {
              matches: { where: { isIgnored: false, matchScore: { gte: 50 } } },
              followUps: true,
              communications: true,
            },
          },
        },
      }),
    ]);

    return {
      requirements,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getRequirementById(id: string) {
    const requirement = await prisma.customerRequirement.findUnique({
      where: { id },
      include: {
        customer: true,
        assignedTo: {
          select: { id: true, fullName: true, email: true, mobile: true, role: true },
        },
        matches: {
          where: { isIgnored: false, matchScore: { gte: 50 } },
          orderBy: { matchScore: 'desc' },
          include: {
            vehicle: {
              include: {
                images: {
                  orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                },
              },
            },
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          include: {
            performedBy: { select: { id: true, fullName: true } },
          },
        },
        followUps: {
          orderBy: { followUpDate: 'asc' },
          include: {
            assignedTo: { select: { id: true, fullName: true } },
          },
        },
        communications: {
          orderBy: { createdAt: 'desc' },
          include: {
            preparedBy: { select: { id: true, fullName: true } },
            vehicle: { select: { id: true, make: true, model: true, manufacturingYear: true, price: true } },
          },
        },
      },
    });

    if (!requirement) {
      throw { status: 404, message: 'Customer requirement not found' };
    }

    return requirement;
  }

  static async updateStatus(
    id: string,
    status: LeadStatus,
    options?: {
      notes?: string | null;
      lostReason?: string | null;
      wonDealAmount?: number | null;
      vehicleId?: string | null;
      userId?: string;
      userRole?: string;
    }
  ) {
    const existing = await prisma.customerRequirement.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!existing) throw { status: 404, message: 'Requirement not found' };

    // RBAC: Peer sales / field executives cannot update leads assigned to other staff
    const isManagerOrAdmin = options?.userRole === 'ADMIN' || options?.userRole === 'MANAGER';
    if (!isManagerOrAdmin && existing.assignedToId && existing.assignedToId !== options?.userId) {
      throw {
        status: 403,
        message: 'You do not have permission to change the status of a lead assigned to another sales executive or field agent.',
      };
    }

    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    let soldVehicleDetails = '';

    if (status === LeadStatus.WON) {
      updateData.closedAt = new Date();
      if (options?.wonDealAmount) updateData.wonDealAmount = options.wonDealAmount;

      // Auto-mark vehicle as SOLD in inventory if selected
      if (options?.vehicleId) {
        try {
          const soldVehicle = await prisma.vehicle.update({
            where: { id: options.vehicleId },
            data: { status: 'SOLD' },
          });
          soldVehicleDetails = `Vehicle: ${soldVehicle.make} ${soldVehicle.model} (${soldVehicle.manufacturingYear}) marked as SOLD in showroom stock.`;

          // Clear active matches for this sold vehicle
          await prisma.vehicleMatch.deleteMany({
            where: { vehicleId: options.vehicleId },
          });

          await logAudit({
            userId: options?.userId,
            entity: 'Vehicle',
            entityId: options.vehicleId,
            action: 'STATUS_CHANGE',
            oldValue: { status: 'AVAILABLE' },
            newValue: { status: 'SOLD', soldToRequirementId: id, dealAmount: options?.wonDealAmount },
          });
        } catch (vehErr) {
          console.error('Error auto-marking vehicle as SOLD:', vehErr);
        }
      }
    } else if (status === LeadStatus.LOST) {
      updateData.closedAt = new Date();
      if (options?.lostReason) updateData.lostReason = options.lostReason;
    }

    const updated = await prisma.customerRequirement.update({
      where: { id },
      data: updateData,
      include: { customer: true, assignedTo: true },
    });

    // Record Status Change Activity
    await prisma.leadActivity.create({
      data: {
        requirementId: id,
        performedById: options?.userId || null,
        activityType: 'STATUS_CHANGED',
        title: `Status Changed to ${status}`,
        description: options?.notes
          ? `${options.notes}${soldVehicleDetails ? ` · ${soldVehicleDetails}` : ''}`
          : `Lead lifecycle updated from ${existing.status} to ${status}.${soldVehicleDetails ? ` ${soldVehicleDetails}` : ''}`,
        metadata: JSON.stringify({
          oldStatus: existing.status,
          newStatus: status,
          lostReason: options?.lostReason,
          wonDealAmount: options?.wonDealAmount,
          vehicleId: options?.vehicleId,
        }),
      },
    });

    await logAudit({
      userId: options?.userId,
      entity: 'CustomerRequirement',
      entityId: id,
      action: 'STATUS_CHANGE',
      oldValue: { status: existing.status },
      newValue: {
        status,
        lostReason: options?.lostReason,
        wonDealAmount: options?.wonDealAmount,
        vehicleId: options?.vehicleId,
      },
    });

    return updated;
  }

  static async assignRequirement(
    id: string,
    assignedToId: string,
    assignedById?: string,
    assignedByRole?: string
  ) {
    // RBAC: Only Admins and Managers can reassign leads
    const isManagerOrAdmin = assignedByRole === 'ADMIN' || assignedByRole === 'MANAGER';
    if (!isManagerOrAdmin) {
      throw {
        status: 403,
        message: 'Only Managers and Admins have permission to assign or reassign leads.',
      };
    }

    const [requirement, staff] = await Promise.all([
      prisma.customerRequirement.findUnique({ where: { id }, include: { customer: true } }),
      prisma.user.findUnique({ where: { id: assignedToId } }),
    ]);

    if (!requirement) throw { status: 404, message: 'Requirement not found' };
    if (!staff) throw { status: 404, message: 'Staff user not found' };

    const updated = await prisma.customerRequirement.update({
      where: { id },
      data: { assignedToId },
      include: { customer: true, assignedTo: true },
    });

    await prisma.leadActivity.create({
      data: {
        requirementId: id,
        performedById: assignedById || null,
        activityType: 'ASSIGNMENT_CHANGED',
        title: 'Lead Reassigned',
        description: `Lead assigned to ${staff.fullName} (${staff.role})`,
      },
    });

    // Create Notification for the assigned user
    await prisma.notification.create({
      data: {
        userId: staff.id,
        title: 'New Lead Assigned',
        message: `You have been assigned ${requirement.customer.fullName}'s requirement: ${requirement.brand || ''} ${requirement.model || ''}`,
        link: `/requirements/${requirement.id}`,
      },
    });

    await logAudit({
      userId: assignedById,
      entity: 'CustomerRequirement',
      entityId: id,
      action: 'ASSIGNMENT',
      oldValue: { assignedToId: requirement.assignedToId },
      newValue: { assignedToId, staffName: staff.fullName },
    });

    return updated;
  }

  static async updateRequirement(
    id: string,
    data: any,
    options?: { modifierUserId?: string; userRole?: string } | string
  ) {
    const modifierUserId = typeof options === 'object' ? options.modifierUserId : options;
    const userRole = typeof options === 'object' ? options.userRole : undefined;

    const existing = await prisma.customerRequirement.findUnique({ where: { id } });
    if (!existing) throw { status: 404, message: 'Requirement not found' };

    // RBAC: Peer sales / field executives cannot edit requirements assigned to other staff
    const isManagerOrAdmin = userRole === 'ADMIN' || userRole === 'MANAGER';
    if (!isManagerOrAdmin && existing.assignedToId && existing.assignedToId !== modifierUserId) {
      throw {
        status: 403,
        message: 'You do not have permission to edit a lead requirement assigned to another sales executive or field agent.',
      };
    }

    const parseNum = (val: any) => (val !== undefined && val !== null && val !== '' && !isNaN(Number(val)) ? Number(val) : null);
    const parseYear = (val: any) => {
      const n = parseNum(val);
      return n && n > 0 ? n : null;
    };

    const updated = await prisma.customerRequirement.update({
      where: { id },
      data: {
        brand: data.brand !== undefined ? (data.brand ? data.brand.trim() : null) : existing.brand,
        model: data.model !== undefined ? (data.model ? data.model.trim() : null) : existing.model,
        variant: data.variant !== undefined ? (data.variant ? data.variant.trim() : null) : existing.variant,
        category: data.category !== undefined ? data.category : existing.category,
        priority: data.priority !== undefined ? data.priority : existing.priority,
        status: data.status !== undefined ? data.status : existing.status,
        minBudget: data.minBudget !== undefined ? parseNum(data.minBudget) : existing.minBudget,
        maxBudget: data.maxBudget !== undefined ? parseNum(data.maxBudget) : existing.maxBudget,
        minYear: data.minYear !== undefined ? parseYear(data.minYear) : existing.minYear,
        maxYear: data.maxYear !== undefined ? parseYear(data.maxYear) : existing.maxYear,
        fuelType: data.fuelType !== undefined ? (data.fuelType ? data.fuelType.toUpperCase().trim() : null) : existing.fuelType,
        transmission: data.transmission !== undefined ? (data.transmission ? data.transmission.toUpperCase().trim() : null) : existing.transmission,
        maxKm: data.maxKm !== undefined ? parseNum(data.maxKm) : existing.maxKm,
        preferredColor: data.preferredColor !== undefined ? data.preferredColor : existing.preferredColor,
        ownershipPreference: data.ownershipPreference !== undefined ? data.ownershipPreference : existing.ownershipPreference,
        locationPreference: data.locationPreference !== undefined ? data.locationPreference : existing.locationPreference,
        usagePurpose: data.usagePurpose !== undefined ? data.usagePurpose : existing.usagePurpose,
        generalNotes: data.generalNotes !== undefined ? data.generalNotes : existing.generalNotes,

        commercialType: data.commercialType !== undefined ? data.commercialType : existing.commercialType,
        bodyType: data.bodyType !== undefined ? data.bodyType : existing.bodyType,
        payloadCapacityKg: data.payloadCapacityKg !== undefined ? parseNum(data.payloadCapacityKg) : existing.payloadCapacityKg,
        numberOfWheels: data.numberOfWheels !== undefined ? parseNum(data.numberOfWheels) : existing.numberOfWheels,
        axleConfiguration: data.axleConfiguration !== undefined ? data.axleConfiguration : existing.axleConfiguration,
        loadRequirement: data.loadRequirement !== undefined ? data.loadRequirement : existing.loadRequirement,
        routePermit: data.routePermit !== undefined ? data.routePermit : existing.routePermit,
      },
      include: {
        customer: true,
        assignedTo: { select: { id: true, fullName: true, email: true } },
      },
    });

    await logAudit({
      userId: modifierUserId,
      entity: 'CustomerRequirement',
      entityId: id,
      action: 'UPDATE',
      oldValue: existing,
      newValue: updated,
    });

    // Synchronously re-evaluate matches so updated matches are immediately active in DB and UI
    await MatchingEngine.matchRequirementAgainstInventory(id);

    return updated;
  }
}
