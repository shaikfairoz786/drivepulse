import prisma from '../prisma';
import { MatchingEngine } from './matching.service';
import { logAudit } from '../middleware/audit';
import { VehicleCategory, VehicleStatus } from '../types';

export class VehicleService {
  static async createVehicle(data: any, createdById?: string) {
    const vehicle = await prisma.vehicle.create({
      data: {
        externalVehicleId: data.externalVehicleId || null,
        registrationNumber: data.registrationNumber ? data.registrationNumber.toUpperCase().trim() : null,
        make: data.make.trim(),
        model: data.model.trim(),
        variant: data.variant ? data.variant.trim() : null,
        category: data.category || VehicleCategory.PASSENGER,
        vehicleType: data.vehicleType || null,
        manufacturingYear: Number(data.manufacturingYear),
        registrationYear: data.registrationYear ? Number(data.registrationYear) : null,
        fuelType: data.fuelType.toUpperCase().trim(),
        transmission: data.transmission ? data.transmission.toUpperCase().trim() : null,
        kmDriven: Number(data.kmDriven),
        numberOfOwners: data.numberOfOwners ? Number(data.numberOfOwners) : 1,
        color: data.color || null,
        price: Number(data.price),
        location: data.location.trim(),
        description: data.description || null,
        status: data.status || VehicleStatus.AVAILABLE,

        // Commercial fields
        bodyType: data.bodyType || null,
        payloadCapacityKg: data.payloadCapacityKg ? Number(data.payloadCapacityKg) : null,
        numberOfWheels: data.numberOfWheels ? Number(data.numberOfWheels) : null,
        axleConfiguration: data.axleConfiguration || null,
        permitType: data.permitType || null,

        // Links
        publicVehicleUrl: data.publicVehicleUrl || null,
        externalMarketplaceUrl: data.externalMarketplaceUrl || null,
        source: data.source || 'DIRECT_INVENTORY',
      },
    });

    await logAudit({
      userId: createdById,
      entity: 'Vehicle',
      entityId: vehicle.id,
      action: 'CREATE',
      newValue: {
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.manufacturingYear,
        price: vehicle.price,
        status: vehicle.status,
      },
    });

    // Auto-trigger matching against all active customer requirements!
    let matchedLeadsCount = 0;
    try {
      matchedLeadsCount = await MatchingEngine.matchVehicleAgainstRequirements(vehicle.id);
    } catch (err) {
      console.error('Error auto-matching newly added vehicle:', err);
    }

    return {
      ...vehicle,
      matchedLeadsCount,
    };
  }

  static async listVehicles(params: {
    category?: string;
    status?: string;
    make?: string;
    fuelType?: string;
    minPrice?: number;
    maxPrice?: number;
    minYear?: number;
    maxYear?: number;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(params.limit) || 25));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.category) {
      where.category = params.category;
    }

    if (params.status) {
      const statuses = params.status.split(',');
      where.status = { in: statuses };
    }

    if (params.make) {
      where.make = { contains: params.make, mode: 'insensitive' };
    }

    if (params.fuelType) {
      where.fuelType = params.fuelType;
    }

    if (params.minPrice || params.maxPrice) {
      where.price = {};
      if (params.minPrice) where.price.gte = Number(params.minPrice);
      if (params.maxPrice) where.price.lte = Number(params.maxPrice);
    }

    if (params.minYear || params.maxYear) {
      where.manufacturingYear = {};
      if (params.minYear) where.manufacturingYear.gte = Number(params.minYear);
      if (params.maxYear) where.manufacturingYear.lte = Number(params.maxYear);
    }

    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { make: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
        { variant: { contains: q, mode: 'insensitive' } },
        { registrationNumber: { contains: q, mode: 'insensitive' } },
        { location: { contains: q, mode: 'insensitive' } },
        { externalVehicleId: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, vehicles] = await Promise.all([
      prisma.vehicle.count({ where }),
      prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          images: {
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          },
          matches: {
            where: { isIgnored: false, matchScore: { gte: 50 } },
            select: { id: true, matchScore: true },
          },
          _count: {
            select: {
              matches: { where: { isIgnored: false, matchScore: { gte: 50 } } },
              communications: true,
            },
          },
        },
      }),
    ]);

    return {
      vehicles,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getVehicleById(id: string) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
        matches: {
          where: { isIgnored: false, matchScore: { gte: 50 } },
          orderBy: { matchScore: 'desc' },
          include: {
            requirement: {
              include: {
                customer: true,
                assignedTo: { select: { id: true, fullName: true, mobile: true } },
              },
            },
          },
        },
        communications: {
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { id: true, fullName: true, primaryMobile: true } },
            preparedBy: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (!vehicle) {
      throw { status: 404, message: 'Vehicle not found' };
    }

    return vehicle;
  }

  static async updateVehicle(id: string, data: any, modifierUserId?: string) {
    const existing = await prisma.vehicle.findUnique({ where: { id } });
    if (!existing) throw { status: 404, message: 'Vehicle not found' };

    const updateData: any = {};
    if (data.make) updateData.make = data.make.trim();
    if (data.model) updateData.model = data.model.trim();
    if (data.variant !== undefined) updateData.variant = data.variant;
    if (data.category) updateData.category = data.category;
    if (data.vehicleType !== undefined) updateData.vehicleType = data.vehicleType;
    if (data.manufacturingYear) updateData.manufacturingYear = Number(data.manufacturingYear);
    if (data.registrationYear !== undefined) updateData.registrationYear = data.registrationYear ? Number(data.registrationYear) : null;
    if (data.fuelType) updateData.fuelType = data.fuelType.toUpperCase().trim();
    if (data.transmission !== undefined) updateData.transmission = data.transmission;
    if (data.kmDriven !== undefined) updateData.kmDriven = Number(data.kmDriven);
    if (data.numberOfOwners !== undefined) updateData.numberOfOwners = Number(data.numberOfOwners);
    if (data.color !== undefined) updateData.color = data.color;
    if (data.price !== undefined) updateData.price = Number(data.price);
    if (data.location) updateData.location = data.location.trim();
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status) updateData.status = data.status;
    if (data.registrationNumber !== undefined) updateData.registrationNumber = data.registrationNumber;
    if (data.externalVehicleId !== undefined) updateData.externalVehicleId = data.externalVehicleId;
    if (data.publicVehicleUrl !== undefined) updateData.publicVehicleUrl = data.publicVehicleUrl;
    if (data.externalMarketplaceUrl !== undefined) updateData.externalMarketplaceUrl = data.externalMarketplaceUrl;

    if (data.bodyType !== undefined) updateData.bodyType = data.bodyType;
    if (data.payloadCapacityKg !== undefined) updateData.payloadCapacityKg = data.payloadCapacityKg ? Number(data.payloadCapacityKg) : null;
    if (data.numberOfWheels !== undefined) updateData.numberOfWheels = data.numberOfWheels ? Number(data.numberOfWheels) : null;
    if (data.axleConfiguration !== undefined) updateData.axleConfiguration = data.axleConfiguration;
    if (data.permitType !== undefined) updateData.permitType = data.permitType;

    const updated = await prisma.vehicle.update({
      where: { id },
      data: updateData,
    });

    await logAudit({
      userId: modifierUserId,
      entity: 'Vehicle',
      entityId: id,
      action: 'UPDATE',
      oldValue: { price: existing.price, status: existing.status },
      newValue: { price: updated.price, status: updated.status },
    });

    // If status transitioned away from AVAILABLE (e.g. SOLD, RESERVED, INACTIVE), clean up all buyer matches
    if (updated.status !== 'AVAILABLE') {
      await prisma.vehicleMatch.deleteMany({
        where: { vehicleId: id },
      });
    }

    // If status or price changed, re-run matching
    if (existing.price !== updated.price || existing.status !== updated.status) {
      await MatchingEngine.matchVehicleAgainstRequirements(id).catch(console.error);
    }

    return updated;
  }

  static async addImage(vehicleId: string, url: string, isPrimary = false, caption?: string) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw { status: 404, message: 'Vehicle not found' };

    if (isPrimary) {
      await prisma.vehicleImage.updateMany({
        where: { vehicleId },
        data: { isPrimary: false },
      });
    }

    // Check if it's the first image, make it primary automatically
    const existingCount = await prisma.vehicleImage.count({ where: { vehicleId } });
    const shouldBePrimary = isPrimary || existingCount === 0;

    return prisma.vehicleImage.create({
      data: {
        vehicleId,
        url,
        isPrimary: shouldBePrimary,
        caption: caption || null,
        sortOrder: existingCount,
      },
    });
  }

  static async setPrimaryImage(imageId: string) {
    const image = await prisma.vehicleImage.findUnique({ where: { id: imageId } });
    if (!image) throw { status: 404, message: 'Image not found' };

    await prisma.vehicleImage.updateMany({
      where: { vehicleId: image.vehicleId },
      data: { isPrimary: false },
    });

    return prisma.vehicleImage.update({
      where: { id: imageId },
      data: { isPrimary: true },
    });
  }

  static async deleteImage(imageId: string) {
    const image = await prisma.vehicleImage.findUnique({ where: { id: imageId } });
    if (!image) throw { status: 404, message: 'Image not found' };

    await prisma.vehicleImage.delete({ where: { id: imageId } });

    // If deleted image was primary, make another one primary if available
    if (image.isPrimary) {
      const nextImage = await prisma.vehicleImage.findFirst({
        where: { vehicleId: image.vehicleId },
      });
      if (nextImage) {
        await prisma.vehicleImage.update({
          where: { id: nextImage.id },
          data: { isPrimary: true },
        });
      }
    }

    return { success: true };
  }
}
