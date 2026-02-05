import type { Image } from '../images/images.domain'
import type { LoginResponse } from './users.domain'

/**
 * Request body for POST /users/login
 */
export interface LoginRequest {
  email: string
  password: string
}

/**
 * Response data for POST /users/login
 */
export type { LoginResponse }







