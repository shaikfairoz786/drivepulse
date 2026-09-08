import prisma from '../prisma';
import { config } from '../config';
import { CommunicationStatus } from '../types';
import { normalizeMobile } from '../utils/mobile';

export class CommunicationService {
  /**
   * Compiles the personalized automotive WhatsApp message text.
   */
  static formatWhatsAppMessage(customer: any, vehicle: any, customNote?: string | null): string {
    const formattedPrice = (vehicle.price / 100000).toFixed(2);
    const vehicleUrl = vehicle.publicVehicleUrl || vehicle.externalMarketplaceUrl || `${config.appBaseUrl}/inventory/${vehicle.id}`;

    let msg = `Hello ${customer.fullName},\n\n`;
    msg += `A vehicle matching your requirement is now available with us!\n\n`;
    msg += `*${vehicle.make} ${vehicle.model} ${vehicle.variant || ''}*\n`;
    msg += `• *Year:* ${vehicle.manufacturingYear}\n`;
    msg += `• *Fuel:* ${vehicle.fuelType}\n`;
    msg += `• *KM Driven:* ${vehicle.kmDriven.toLocaleString()} km\n`;
    msg += `• *Price:* ₹${formattedPrice} Lakh\n`;
    msg += `• *Location:* ${vehicle.location}\n\n`;

    if (customNote) {
      msg += `• *Note:* ${customNote}\n\n`;
    }

    msg += `*View Vehicle Details & Photos:*\n${vehicleUrl}\n\n`;
    msg += `Please let us know if you would like to schedule a test drive or visit!`;

    return msg;
  }

  /**
   * Generates a Click-to-Chat WhatsApp deep link targeting direct API to avoid wa.me redirect emoji corruption.
   */
  static generateWhatsAppDeepLink(mobile: string, message: string): string {
    const cleanMobile = normalizeMobile(mobile);
    const encoded = encodeURIComponent(message);
    return `https://api.whatsapp.com/send?phone=91${cleanMobile}&text=${encoded}`;
  }

  /**
   * Prepares outreach for single or multiple selected leads against a vehicle.
   */
  static async prepareOutreach(data: {
    vehicleId: string;
    requirementIds: string[];
    customNote?: string | null;
    preparedById: string;
    userRole?: string;
  }) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: data.vehicleId },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
      },
    });

    if (!vehicle) throw { status: 404, message: 'Vehicle not found' };

    const requirements = await prisma.customerRequirement.findMany({
      where: {
        id: { in: data.requirementIds },
      },
      include: {
        customer: true,
        assignedTo: { select: { id: true, fullName: true } },
      },
    });

    const primaryImage = vehicle.images[0]?.url || null;
    const preparedMessages = [];

    // Validate or resolve preparedById to guarantee foreign key constraint satisfaction
    let effectivePreparedById: string | null = null;
    if (data.preparedById) {
      const userExists = await prisma.user.findUnique({
        where: { id: data.preparedById },
        select: { id: true },
      });
      if (userExists) {
        effectivePreparedById = userExists.id;
      }
    }

    if (!effectivePreparedById) {
      const fallbackUser = await prisma.user.findFirst({
        select: { id: true },
      });
      effectivePreparedById = fallbackUser ? fallbackUser.id : null;
    }

    if (!effectivePreparedById) {
      throw { status: 400, message: 'No staff user account found to attribute outreach to. Please re-login with a valid account.' };
    }

    // RBAC: Non-manager staff (Sales / Field executives) cannot outreach to leads assigned to other staff
    const isManagerOrAdmin = data.userRole === 'ADMIN' || data.userRole === 'MANAGER';
    if (!isManagerOrAdmin) {
      for (const req of requirements) {
        if (req.assignedToId && req.assignedToId !== effectivePreparedById) {
          throw {
            status: 403,
            message: `Lead ownership restriction: The requirement for ${req.customer?.fullName} is assigned to ${req.assignedTo?.fullName || 'another sales executive'}. Peer sales executives cannot outreach to colleagues' assigned leads.`,
          };
        }
      }
    }

    for (const req of requirements) {
      const messageContent = this.formatWhatsAppMessage(req.customer, vehicle, data.customNote);
      const whatsAppDeepLink = this.generateWhatsAppDeepLink(req.customer.primaryMobile, messageContent);

      const commLog = await prisma.communicationLog.create({
        data: {
          customerId: req.customerId,
          requirementId: req.id,
          vehicleId: vehicle.id,
          channel: 'WHATSAPP',
          templateType: 'MATCHING_VEHICLE_ALERT',
          messageContent,
          recipientMobile: req.customer.primaryMobile,
          mediaUrl: primaryImage,
          status: CommunicationStatus.PREPARED,
          preparedById: effectivePreparedById,
        },
        include: {
          customer: true,
          vehicle: true,
          preparedBy: { select: { id: true, fullName: true } },
        },
      });

      // Mark match as shared
      await prisma.vehicleMatch.updateMany({
        where: {
          requirementId: req.id,
          vehicleId: vehicle.id,
        },
        data: {
          isShared: true,
        },
      });

      // Log Lead Activity
      await prisma.leadActivity.create({
        data: {
          requirementId: req.id,
          performedById: effectivePreparedById,
          activityType: 'WHATSAPP_PREPARED',
          title: 'WhatsApp Outreach Prepared',
          description: `Prepared matching vehicle outreach for ${vehicle.make} ${vehicle.model} (₹${(vehicle.price / 100000).toFixed(2)}L)`,
          metadata: JSON.stringify({
            vehicleId: vehicle.id,
            communicationLogId: commLog.id,
            recipientMobile: req.customer.primaryMobile,
          }),
        },
      });

      preparedMessages.push({
        ...commLog,
        whatsAppDeepLink,
      });
    }

    return {
      totalPrepared: preparedMessages.length,
      messages: preparedMessages,
    };
  }

  static async listCommunicationHistory(params: {
    customerId?: string;
    requirementId?: string;
    vehicleId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.customerId) where.customerId = params.customerId;
    if (params.requirementId) where.requirementId = params.requirementId;
    if (params.vehicleId) where.vehicleId = params.vehicleId;
    if (params.status) where.status = params.status;

    const [total, logs] = await Promise.all([
      prisma.communicationLog.count({ where }),
      prisma.communicationLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, fullName: true, primaryMobile: true } },
          vehicle: { select: { id: true, make: true, model: true, price: true } },
          preparedBy: { select: { id: true, fullName: true } },
        },
      }),
    ]);

    const formattedLogs = logs.map((log) => ({
      ...log,
      whatsAppDeepLink: CommunicationService.generateWhatsAppDeepLink(log.recipientMobile, log.messageContent),
    }));

    return {
      logs: formattedLogs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async updateStatus(id: string, status: CommunicationStatus, notes?: string | null) {
    const existing = await prisma.communicationLog.findUnique({ where: { id } });
    if (!existing) throw { status: 404, message: 'Communication record not found' };

    return prisma.communicationLog.update({
      where: { id },
      data: {
        status,
        sentAt: status === CommunicationStatus.MANUALLY_SENT ? new Date() : existing.sentAt,
      },
      include: { customer: true, vehicle: true },
    });
  }
}
