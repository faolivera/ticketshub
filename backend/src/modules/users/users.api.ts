import type { Image } from '../images/images.domain';
import type { LoginResponse } from './users.domain';

/**
 * Request body for POST /users/login
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Request body for POST /users/register
 */
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  country: string;
}

/**
 * Response data for POST /users/register (same shape as login - token + user)
 */
export type RegisterResponse = LoginResponse;

/**
 * Response data for POST /users/login
 */
export type { LoginResponse };
