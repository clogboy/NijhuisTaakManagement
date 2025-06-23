import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

export interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    tenantId: number;
    email: string;
    name: string;
    role: string;
    microsoftId: string | null;
    createdAt: Date;
  };
  tenant?: {
    id: number;
    name: string;
    slug: string;
    domain: string | null;
    settings: any;
  };
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).session?.userId;
    
    if (!userId) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const user = await storage.getUser(userId);
    
    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    // Load tenant information
    const tenant = await storage.getTenant(user.tenantId);
    if (!tenant || !tenant.isActive) {
      res.status(403).json({ message: "Tenant not found or inactive" });
      return;
    }

    (req as any).user = user;
    (req as any).tenant = tenant;
    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);
    res.status(500).json({ message: "Authentication failed" });
  }
};
import { Request, Response, NextFunction } from "express";

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
