import type { Address } from '../geocoding/geocoding.domain'
import type { Image } from '../images/images.domain'
import { CurrencyCode } from '../shared/money.domain';

export enum Role {
  User = 'User',
  Admin = 'Admin',
}

export enum UserLevel {
  Basic = 'Basic',
  Buyer = 'Buyer',
  Seller = 'Seller',
  VerifiedSeller = 'VerifiedSeller',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  level: UserLevel;
  publicName: string;
  imageId: string;
  phone?: string;
  password: string;
}

export interface UserPublicInfo {
  id: string;
  publicName: string;
  pic: Image;
}

export interface AuthenticatedUserPublicInfo extends Omit<User, 'password' | 'imageId'> {
  pic: Image
}

export interface LoginResponse {
  token: string
  user: AuthenticatedUserPublicInfo
}

export interface JWTPayload {
  userId: string
  email: string
  role: Role;
  level: UserLevel;
}