import { Response } from "express";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export class ResponseHelper {
  static success<T>(res: Response, data: T, message?: string, statusCode: number = 200): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message
    };
    res.status(statusCode).json(response);
  }

  static error(res: Response, message: string, errors?: any[], statusCode: number = 400): void {
    const response: ApiResponse = {
      success: false,
      message,
      errors
    };
    res.status(statusCode).json(response);
  }

  static created<T>(res: Response, data: T, message?: string): void {
    this.success(res, data, message, 201);
  }

  static noContent(res: Response): void {
    res.status(204).send();
  }
}