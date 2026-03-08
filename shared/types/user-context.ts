export interface UserContext {
  id: string;
  email?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  [key: string]: unknown;
}
