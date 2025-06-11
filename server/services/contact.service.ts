import { ContactRepository } from "../repositories/contact.repository";
import { type Contact, type InsertContact } from "@shared/schema";

export class ContactService {
  private contactRepository = new ContactRepository();

  async getContactsByUser(userId: number): Promise<Contact[]> {
    return await this.contactRepository.findByCreatedBy(userId);
  }

  async getContactById(id: number): Promise<Contact | undefined> {
    return await this.contactRepository.findById(id);
  }

  async getContactByEmail(email: string): Promise<Contact | undefined> {
    return await this.contactRepository.findByEmail(email);
  }

  async createContact(contactData: InsertContact, createdBy: number): Promise<Contact> {
    return await this.contactRepository.create({ ...contactData, createdBy });
  }

  async updateContact(id: number, contactData: Partial<InsertContact>): Promise<Contact> {
    return await this.contactRepository.update(id, contactData);
  }

  async deleteContact(id: number): Promise<void> {
    await this.contactRepository.delete(id);
  }

  async searchContacts(userId: number, query: string): Promise<Contact[]> {
    const contacts = await this.getContactsByUser(userId);
    const lowerQuery = query.toLowerCase();
    
    return contacts.filter(contact => 
      contact.name.toLowerCase().includes(lowerQuery) ||
      contact.email.toLowerCase().includes(lowerQuery) ||
      contact.company?.toLowerCase().includes(lowerQuery)
    );
  }
}

export const contactService = new ContactService();