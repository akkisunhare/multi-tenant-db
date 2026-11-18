import { getMasterModel } from '../superadmin/master.model';
import { comparePassword, hashPassword } from '../../utils/password';
import { signToken } from '../../utils/jwt';
import { ITenantModels } from '../../types/express';

export class MasterService {
  static async login(email: string, password: string) {
    const Master = getMasterModel();
    const master = await Master.findOne({ email: email.toLowerCase() }).select('+password');

    if (!master || !master.password) {
      throw { statusCode: 401, message: 'Invalid master credentials' };
    }

    if (master.status !== 'active') {
      throw { statusCode: 403, message: `Master account is not active (status: ${master.status})` };
    }

    const isMatch = await comparePassword(password, master.password);
    if (!isMatch) {
      throw { statusCode: 401, message: 'Invalid master credentials' };
    }

    const token = signToken({
      sub: master._id.toString(),
      accountType: 'master',
      masterId: master._id.toString(),
      email: master.email,
      name: master.name,
      tenantDb: master.dbName,
    });

    return {
      token,
      master: {
        id: master._id,
        name: master.name,
        email: master.email,
        dbName: master.dbName,
        status: master.status,
      },
    };
  }

  static async createTenantUser(
    tenantModels: ITenantModels,
    masterId: string,
    userData: { name: string; email: string; password: string }
  ) {
    const normalizedEmail = userData.email.toLowerCase();

    // Check duplicate email within this tenant database
    const existing = await tenantModels.User.findOne({ email: normalizedEmail });
    if (existing) {
      throw { statusCode: 409, message: 'A user with this email already exists in this tenant database' };
    }

    const hashedPassword = await hashPassword(userData.password);

    const user = await tenantModels.User.create({
      name: userData.name,
      email: normalizedEmail,
      password: hashedPassword,
      masterId,
    });

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      masterId: user.masterId,
      createdAt: user.createdAt,
    };
  }

  static async listTenantUsers(
    tenantModels: ITenantModels,
    page: number = 1,
    limit: number = 10,
    search?: string
  ) {
    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      tenantModels.User.find(query)
        .select('-password -__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      tenantModels.User.countDocuments(query),
    ]);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
