import { getPublicUserModel } from './publicUser.model';
import { comparePassword, hashPassword } from '../../utils/password';
import { signToken } from '../../utils/jwt';

export class AuthService {
  static async signup(userData: { name: string; email: string; password: string }) {
    const PublicUser = getPublicUserModel();
    const normalizedEmail = userData.email.toLowerCase();

    const existing = await PublicUser.findOne({ email: normalizedEmail });
    if (existing) {
      throw { statusCode: 409, message: 'A public user with this email already exists' };
    }

    const hashedPassword = await hashPassword(userData.password);

    const user = await PublicUser.create({
      name: userData.name,
      email: normalizedEmail,
      password: hashedPassword,
    });

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  static async login(email: string, password: string) {
    const PublicUser = getPublicUserModel();
    const normalizedEmail = email.toLowerCase();

    // Query strictly inside public_db
    const user = await PublicUser.findOne({ email: normalizedEmail }).select('+password');
    if (!user || !user.password) {
      throw { statusCode: 401, message: 'Invalid public user credentials' };
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      throw { statusCode: 401, message: 'Invalid public user credentials' };
    }

    const token = signToken({
      sub: user._id.toString(),
      accountType: 'public',
      email: user.email,
      name: user.name,
    });

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    };
  }

  static async getProfile(userId: string) {
    const PublicUser = getPublicUserModel();
    const user = await PublicUser.findById(userId).select('-password -__v');
    if (!user) {
      throw { statusCode: 404, message: 'Public user profile not found' };
    }
    return user;
  }
}
