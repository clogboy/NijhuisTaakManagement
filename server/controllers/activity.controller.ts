import { Request, Response } from "express";
import { storage } from "../storage";
import { insertActivitySchema } from "@shared/schema";
import { logger } from "../utils/logger";
import { ResponseHelper } from "../utils/response.helper";

export class ActivityController {
  async getActivities(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const isAdmin = (req as any).user.role === "admin";
      
      const activities = await storage.getActivities(userId, isAdmin);
      ResponseHelper.success(res, activities);
    } catch (error) {
      logger.error("Get activities error:", error);
      ResponseHelper.error(res, "Failed to fetch activities", [], 500);
    }
  }

  async getActivity(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const activity = await storage.getActivity(id);
      
      if (!activity) {
        ResponseHelper.error(res, "Activity not found", [], 404);
        return;
      }
      
      ResponseHelper.success(res, activity);
    } catch (error) {
      logger.error("Get activity error:", error);
      ResponseHelper.error(res, "Failed to fetch activity", [], 500);
    }
  }

  async createActivity(req: Request, res: Response): Promise<void> {
    try {
      const activityData = insertActivitySchema.parse(req.body);
      const userId = (req as any).user.id;
      
      const activity = await storage.createActivity({ ...activityData, createdBy: userId });
      ResponseHelper.created(res, activity, "Activity created successfully");
    } catch (error) {
      logger.error("Create activity error:", error);
      ResponseHelper.error(res, "Failed to create activity", [], 500);
    }
  }

  async updateActivity(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const activityData = insertActivitySchema.partial().parse(req.body);
      
      const activity = await storage.updateActivity(id, activityData);
      ResponseHelper.success(res, activity, "Activity updated successfully");
    } catch (error) {
      logger.error("Update activity error:", error);
      ResponseHelper.error(res, "Failed to update activity", [], 500);
    }
  }

  async deleteActivity(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteActivity(id);
      ResponseHelper.success(res, null, "Activity deleted successfully");
    } catch (error) {
      logger.error("Delete activity error:", error);
      ResponseHelper.error(res, "Failed to delete activity", [], 500);
    }
  }
}

export const activityController = new ActivityController();