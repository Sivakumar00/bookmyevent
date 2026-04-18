export class ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;

  constructor(data: T, message?: string) {
    this.success = true;
    this.data = data;
    this.message = message;
  }
}

export class ApiError {
  success: boolean;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };

  constructor(code: string, message: string, details?: unknown) {
    this.success = false;
    this.error = { code, message, details };
  }
}

export class PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    skip: number;
    take: number;
    total: number;
  };

  constructor(data: T[], skip: number, take: number, total: number) {
    this.success = true;
    this.data = data;
    this.pagination = {
      skip,
      take,
      total,
    };
  }
}
