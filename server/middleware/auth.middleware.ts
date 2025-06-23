import { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
    tenant_id: number;
    microsoft_id: string;
    created_at: Date;
    updated_at: Date;
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Create a mock user if none exists (for both dev and deployment until proper auth is implemented)
  if (!req.user) {
    req.user = {
      id: 1,
      email: 'dev@nijhuis.nl',
      name: 'Development User',
      role: 'user',
      tenant_id: 1,
      microsoft_id: 'dev-user',
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  next();
}