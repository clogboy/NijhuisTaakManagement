import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

export interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
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

    (req as any).user = user;
    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);
    res.status(500).json({ message: "Authentication failed" });
  }
};