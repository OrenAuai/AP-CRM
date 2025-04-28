export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  email: string;
  createdAt: string;
  lastActivity: string;
  isConfirmed: boolean;
  hasActiveJobListing: boolean;
  isArchived: boolean;
  business?: {
    id: string;
    name: string;
    branch?: {
      name: string;
    };
  };
}

export interface ParsedUser {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  email: string;
  createdAt: string;
  lastActivity: string;
  isConfirmed: boolean;
  hasActiveJobListing: boolean;
  isArchived: boolean;
  businessId?: string;
  businessName?: string;
  businessBranch?: string;
}

export interface QueryResponse {
  data?: {
    users?: {
      users: User[];
      count: number;
    };
  };
  errors?: Array<{ message: string }>;
}