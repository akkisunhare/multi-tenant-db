import crypto from 'crypto';
import { getSuperAdminModel } from './superadmin.model';
import { getMasterModel, IMaster } from './master.model';
import { comparePassword, hashPassword } from '../../utils/password';
import { signToken } from '../../utils/jwt';
import { provisionTenantDatabase } from '../../config/tenantConnection';

export class SuperAdminService {
  static async login(email: string, password: string) {
    const SuperAdmin = getSuperAdminModel();
    const admin = await SuperAdmin.findOne({ email: email.toLowerCase() }).select('+password');

    if (!admin || !admin.password) {
      throw { statusCode: 401, message: 'Invalid superadmin credentials' };
    }

    const isMatch = await comparePassword(password, admin.password);
    if (!isMatch) {
      throw { statusCode: 401, message: 'Invalid superadmin credentials' };
    }

    const token = signToken({
      sub: admin._id.toString(),
      accountType: 'superadmin',
      email: admin.email,
      name: admin.name,
    });

    return {
      token,
      superadmin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
      },
    };
  }

  static async createMaster(name: string, email: string, password: string) {
    const Master = getMasterModel();
    const normalizedEmail = email.toLowerCase();

    // Check duplicate master email
    const existingMaster = await Master.findOne({ email: normalizedEmail });
    if (existingMaster) {
      throw { statusCode: 409, message: 'A master account with this email already exists' };
    }

    const hashedPassword = await hashPassword(password);

    // Generate unique, server-controlled database name
    const randomHex = crypto.randomBytes(4).toString('hex');
    const dbName = `tenant_${randomHex}`;

    // Create record in provisioning status first
    const master = await Master.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      dbName,
      status: 'provisioning',
    });

    try {
      // Provision isolated tenant database (schemas, indexes)
      await provisionTenantDatabase(dbName);
      master.status = 'active';
      await master.save();
    } catch (provisionErr: any) {
      master.status = 'failed';
      master.provisioningError = provisionErr.message || 'Provisioning error';
      await master.save();
      throw {
        statusCode: 500,
        message: `Tenant provisioning failed: ${provisionErr.message}. Master marked as failed.`,
      };
    }

    return {
      id: master._id,
      name: master.name,
      email: master.email,
      dbName: master.dbName,
      status: master.status,
      createdAt: master.createdAt,
    };
  }

  static async listMasters(page: number = 1, limit: number = 10, search?: string) {
    const Master = getMasterModel();
    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [masters, total] = await Promise.all([
      Master.find(query)
        .select('-password -__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Master.countDocuments(query),
    ]);

    return {
      masters,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
