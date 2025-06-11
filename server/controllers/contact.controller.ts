import { Request, Response } from "express";
import { contactService } from "../services/contact.service";
import { insertContactSchema } from "@shared/schema";
import { logger } from "../utils/logger";
import { ResponseHelper } from "../utils/response.helper";

export class ContactController {
  async getContacts(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      logger.info(`Getting contacts for user ${userId}`);
      
      const contacts = await contactService.getContactsByUser(userId);
      ResponseHelper.success(res, contacts, `Found ${contacts.length} contacts`);
    } catch (error) {
      logger.error("Get contacts error:", error);
      ResponseHelper.error(res, "Failed to fetch contacts", [], 500);
    }
  }

  async getContact(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const contact = await contactService.getContactById(id);
      
      if (!contact) {
        ResponseHelper.error(res, "Contact not found", [], 404);
        return;
      }
      
      ResponseHelper.success(res, contact);
    } catch (error) {
      logger.error("Get contact error:", error);
      ResponseHelper.error(res, "Failed to fetch contact", [], 500);
    }
  }

  async createContact(req: Request, res: Response): Promise<void> {
    try {
      const contactData = insertContactSchema.parse(req.body);
      const userId = (req as any).user.id;
      
      const contact = await contactService.createContact(contactData, userId);
      ResponseHelper.created(res, contact, "Contact created successfully");
    } catch (error) {
      logger.error("Create contact error:", error);
      
      if (error instanceof Error && error.message.includes("validation")) {
        ResponseHelper.error(res, "Invalid contact data");
      } else {
        ResponseHelper.error(res, "Failed to create contact", [], 500);
      }
    }
  }

  async updateContact(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const contactData = insertContactSchema.partial().parse(req.body);
      
      const contact = await contactService.updateContact(id, contactData);
      ResponseHelper.success(res, contact, "Contact updated successfully");
    } catch (error) {
      logger.error("Update contact error:", error);
      ResponseHelper.error(res, "Failed to update contact", [], 500);
    }
  }

  async deleteContact(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      await contactService.deleteContact(id);
      ResponseHelper.success(res, null, "Contact deleted successfully");
    } catch (error) {
      logger.error("Delete contact error:", error);
      ResponseHelper.error(res, "Failed to delete contact", [], 500);
    }
  }

  async searchContacts(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const query = req.query.q as string;
      
      if (!query) {
        ResponseHelper.error(res, "Search query is required");
        return;
      }
      
      const contacts = await contactService.searchContacts(userId, query);
      ResponseHelper.success(res, contacts, `Found ${contacts.length} matching contacts`);
    } catch (error) {
      logger.error("Search contacts error:", error);
      ResponseHelper.error(res, "Failed to search contacts", [], 500);
    }
  }
}

export const contactController = new ContactController();