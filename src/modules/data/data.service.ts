import { ITenantModels, IAuthPayload } from '../../types/express';

export class DataService {
  static async createData(
    tenantModels: ITenantModels,
    user: IAuthPayload,
    payload: { title: string; description: string }
  ) {
    const record = await tenantModels.Data.create({
      title: payload.title,
      description: payload.description,
      createdBy: user.sub,
      createdByType: user.accountType === 'master' ? 'master' : 'master-user',
    });

    return record;
  }

  static async listData(
    tenantModels: ITenantModels,
    user: IAuthPayload,
    page: number = 1,
    limit: number = 10,
    search?: string
  ) {
    const query: any = {};

    // Masters see all tenant records; Master-users see only their own records
    if (user.accountType === 'master-user') {
      query.createdBy = user.sub;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      tenantModels.Data.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      tenantModels.Data.countDocuments(query),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  static async getDataById(
    tenantModels: ITenantModels,
    user: IAuthPayload,
    id: string
  ) {
    const record = await tenantModels.Data.findById(id);
    if (!record) {
      return null;
    }

    // Master-user cannot access records created by someone else
    if (user.accountType === 'master-user' && record.createdBy !== user.sub) {
      return null;
    }

    return record;
  }

  static async updateData(
    tenantModels: ITenantModels,
    user: IAuthPayload,
    id: string,
    updatePayload: { title?: string; description?: string }
  ) {
    const record = await tenantModels.Data.findById(id);
    if (!record) {
      return null;
    }

    // Role-based scope enforcement: master-users can only update their own records
    if (user.accountType === 'master-user' && record.createdBy !== user.sub) {
      return null;
    }

    if (updatePayload.title !== undefined) {
      record.title = updatePayload.title;
    }
    if (updatePayload.description !== undefined) {
      record.description = updatePayload.description;
    }

    await record.save();
    return record;
  }

  static async deleteData(
    tenantModels: ITenantModels,
    user: IAuthPayload,
    id: string
  ) {
    const record = await tenantModels.Data.findById(id);
    if (!record) {
      return null;
    }

    // Role-based scope enforcement: master-users can only delete their own records
    if (user.accountType === 'master-user' && record.createdBy !== user.sub) {
      return null;
    }

    await tenantModels.Data.findByIdAndDelete(id);
    return record;
  }
}
