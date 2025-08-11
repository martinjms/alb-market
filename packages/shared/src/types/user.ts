export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  username: string;
  displayName: string;
  password: string;
}

export interface UpdateUserRequest {
  displayName?: string;
  avatar?: string;
}