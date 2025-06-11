import { BaseRepository } from "./base.repository";
import { contacts, type Contact, type InsertContact } from "@shared/schema";
import { eq } from "drizzle-orm";

export class ContactRepository extends BaseRepository<Contact, InsertContact> {
  constructor() {
    super(contacts);
  }

  async findByEmail(email: string): Promise<Contact | undefined> {
    const [contact] = await this.findAll({ where: eq(contacts.email, email) });
    return contact;
  }

  async findByCreatedBy(createdBy: number): Promise<Contact[]> {
    return await this.findAll({ 
      where: eq(contacts.createdBy, createdBy),
      orderBy: contacts.name
    });
  }
}