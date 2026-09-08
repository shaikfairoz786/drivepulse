import prisma from '../prisma';
import { normalizeMobile } from '../utils/mobile';
import { logAudit } from '../middleware/audit';

export class CustomerService {
  static async checkDuplicate(mobile: string) {
    const normalized = normalizeMobile(mobile);
    if (!normalized) return { exists: false, customer: null };

    const customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { primaryMobile: normalized },
          { alternateMobile: normalized },
        ],
      },
      include: {
        requirements: {
          select: {
            id: true,
            category: true,
            brand: true,
            model: true,
            status: true,
            minBudget: true,
            maxBudget: true,
            createdAt: true,
          },
        },
      },
    });

    return {
      exists: !!customer,
      customer: customer || null,
    };
  }

  static async createCustomer(data: any, createdById?: string) {
    const primaryMobile = normalizeMobile(data.primaryMobile);
    const existing = await prisma.customer.findUnique({
      where: { primaryMobile },
    });

    if (existing) {
      throw {
        status: 409,
        message: 'Existing customer found with this mobile number.',
        customer: existing,
      };
    }

    const customer = await prisma.customer.create({
      data: {
        fullName: data.fullName.trim(),
        primaryMobile,
        alternateMobile: data.alternateMobile ? normalizeMobile(data.alternateMobile) : null,
        email: data.email ? data.email.trim().toLowerCase() : null,
        location: data.location || null,
        city: data.city || null,
        state: data.state || null,
        address: data.address || null,
        preferredContact: data.preferredContact || 'WHATSAPP',
        customerType: data.customerType || 'INDIVIDUAL',
        source: data.source || 'WALK_IN',
        notes: data.notes || null,
        createdById: createdById || null,
      },
    });

    await logAudit({
      userId: createdById,
      entity: 'Customer',
      entityId: customer.id,
      action: 'CREATE',
      newValue: { fullName: customer.fullName, primaryMobile: customer.primaryMobile },
    });

    return customer;
  }

  static async listCustomers(params: {
    search?: string;
    city?: string;
    customerType?: string;
    source?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.search) {
      const q = params.search.trim();
      const normalizedQ = normalizeMobile(q);
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { location: { contains: q, mode: 'insensitive' } },
        ...(normalizedQ ? [
          { primaryMobile: { contains: normalizedQ } },
          { alternateMobile: { contains: normalizedQ } },
        ] : []),
      ];
    }

    if (params.city) {
      where.city = { contains: params.city, mode: 'insensitive' };
    }

    if (params.customerType) {
      where.customerType = params.customerType;
    }

    if (params.source) {
      where.source = params.source;
    }

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          requirements: {
            select: {
              id: true,
              category: true,
              brand: true,
              model: true,
              status: true,
              priority: true,
              minBudget: true,
              maxBudget: true,
              createdAt: true,
              assignedTo: {
                select: { id: true, fullName: true },
              },
            },
          },
          _count: {
            select: {
              requirements: true,
              communications: true,
            },
          },
        },
      }),
    ]);

    return {
      customers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getCustomerById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        requirements: {
          orderBy: { createdAt: 'desc' },
          include: {
            assignedTo: { select: { id: true, fullName: true, mobile: true, email: true } },
            followUps: {
              orderBy: { followUpDate: 'desc' },
              include: { assignedTo: { select: { id: true, fullName: true } } },
            },
            matches: {
              where: { isIgnored: false, matchScore: { gte: 50 } },
              orderBy: { matchScore: 'desc' },
              include: {
                vehicle: {
                  include: {
                    images: { where: { isPrimary: true }, take: 1 },
                  },
                },
              },
            },
            activities: {
              orderBy: { createdAt: 'desc' },
              include: { performedBy: { select: { id: true, fullName: true } } },
              take: 20,
            },
          },
        },
        communications: {
          orderBy: { createdAt: 'desc' },
          include: {
            preparedBy: { select: { id: true, fullName: true } },
            vehicle: { select: { id: true, make: true, model: true, price: true } },
          },
        },
      },
    });

    if (!customer) {
      throw { status: 404, message: 'Customer not found' };
    }

    return customer;
  }

  static async updateCustomer(id: string, data: any, modifierUserId?: string) {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) throw { status: 404, message: 'Customer not found' };

    const updateData: any = { ...data };
    if (data.primaryMobile) {
      updateData.primaryMobile = normalizeMobile(data.primaryMobile);
    }
    if (data.alternateMobile) {
      updateData.alternateMobile = normalizeMobile(data.alternateMobile);
    }
    if (data.email) {
      updateData.email = data.email.trim().toLowerCase();
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    await logAudit({
      userId: modifierUserId,
      entity: 'Customer',
      entityId: id,
      action: 'UPDATE',
      oldValue: { fullName: existing.fullName, primaryMobile: existing.primaryMobile },
      newValue: { fullName: updated.fullName, primaryMobile: updated.primaryMobile },
    });

    return updated;
  }

  static async deleteCustomer(id: string, modifierUserId?: string) {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) throw { status: 404, message: 'Customer not found' };

    await prisma.customer.delete({ where: { id } });

    await logAudit({
      userId: modifierUserId,
      entity: 'Customer',
      entityId: id,
      action: 'DELETE',
      oldValue: { fullName: existing.fullName, primaryMobile: existing.primaryMobile },
    });

    return { success: true };
  }
}
