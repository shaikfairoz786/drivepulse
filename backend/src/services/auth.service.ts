import bcrypt from 'bcryptjs';
import prisma from '../prisma';
import { generateToken, TokenPayload } from '../utils/jwt';
import { Role } from '../types';
import { normalizeMobile } from '../utils/mobile';
import { logAudit } from '../middleware/audit';

export class AuthService {
  static async login(identifier: string, passwordPlain: string) {
    const normalizedMobile = normalizeMobile(identifier);

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: identifier.trim() } },
          { mobile: { equals: normalizedMobile } },
        ],
      },
    });

    if (!user) {
      throw { status: 401, message: 'Invalid credentials. User not found.' };
    }

    if (!user.isActive) {
      throw { status: 403, message: 'Your account has been deactivated. Please contact an administrator.' };
    }

    const isMatch = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isMatch) {
      throw { status: 401, message: 'Invalid credentials. Incorrect password.' };
    }

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as Role,
      fullName: user.fullName,
    };

    const token = generateToken(payload);

    return {
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        isActive: user.isActive,
      },
    };
  }

  static async createUser(data: {
    email: string;
    password: string;
    fullName: string;
    mobile: string;
    role: Role;
  }, creatorUserId?: string) {
    const normalizedMobile = normalizeMobile(data.mobile);
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email.toLowerCase() }, { mobile: normalizedMobile }],
      },
    });

    if (existing) {
      throw { status: 409, message: 'A user with this email or mobile number already exists.' };
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        mobile: normalizedMobile,
        fullName: data.fullName,
        role: data.role,
        passwordHash,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        mobile: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await logAudit({
      userId: creatorUserId,
      entity: 'User',
      entityId: user.id,
      action: 'CREATE',
      newValue: { email: user.email, role: user.role, fullName: user.fullName },
    });

    return user;
  }

  static async listUsers(role?: Role, isActive?: boolean) {
    const where: any = {};
    if (role) where.role = role;
    if (typeof isActive === 'boolean') where.isActive = isActive;

    return prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        mobile: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            assignedRequirements: true,
            followUps: true,
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });
  }

  static async updateUser(id: string, data: any, modifierUserId?: string) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw { status: 404, message: 'User not found' };

    const updateData: any = {};
    if (data.fullName) updateData.fullName = data.fullName;
    if (data.email) updateData.email = data.email.toLowerCase();
    if (data.mobile) updateData.mobile = normalizeMobile(data.mobile);
    if (data.role) updateData.role = data.role;
    if (typeof data.isActive === 'boolean') updateData.isActive = data.isActive;
    if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 10);

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        email: true,
        mobile: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    await logAudit({
      userId: modifierUserId,
      entity: 'User',
      entityId: id,
      action: 'UPDATE',
      oldValue: { role: existing.role, isActive: existing.isActive },
      newValue: { role: updated.role, isActive: updated.isActive },
    });

    return updated;
  }
}
