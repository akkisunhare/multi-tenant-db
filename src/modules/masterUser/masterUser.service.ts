import { getMasterModel } from '../superadmin/master.model';
import { getTenantModels } from '../../config/tenantConnection';
import { comparePassword } from '../../utils/password';
import { signToken } from '../../utils/jwt';

export class MasterUserService {
  static async login(masterEmail: string, email: string, password: string) {
    const Master = getMasterModel();
    const normalizedMasterEmail = masterEmail.toLowerCase();
    const normalizedUserEmail = email.toLowerCase();

    // Identify master in central_db
    const master = await Master.findOne({ email: normalizedMasterEmail });
    if (!master) {
      throw { statusCode: 401, message: 'Invalid master email or credentials' };
    }

    if (master.status !== 'active') {
      throw { statusCode: 403, message: `Master organization is not active (status: ${master.status})` };
    }

    // Connect strictly to this master's isolated tenant database
    const tenantModels = getTenantModels(master.dbName);
    const user = await tenantModels.User.findOne({ email: normalizedUserEmail }).select('+password');

    if (!user || !user.password) {
      throw { statusCode: 401, message: 'Invalid tenant user credentials' };
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      throw { statusCode: 401, message: 'Invalid tenant user credentials' };
    }

    const token = signToken({
      sub: user._id.toString(),
      accountType: 'master-user',
      masterId: master._id.toString(),
      tenantDb: master.dbName,
      email: user.email,
      name: user.name,
    });

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        masterId: user.masterId,
      },
    };
  }

  static async getProfile(userId: string, masterId: string) {
    const Master = getMasterModel();
    const master = await Master.findById(masterId);
    if (!master || master.status !== 'active') {
      throw { statusCode: 403, message: 'Master organization not active or found' };
    }

    const tenantModels = getTenantModels(master.dbName);
    const user = await tenantModels.User.findById(userId).select('-password -__v');
    if (!user) {
      throw { statusCode: 404, message: 'Tenant user profile not found' };
    }

    return user;
  }
}
