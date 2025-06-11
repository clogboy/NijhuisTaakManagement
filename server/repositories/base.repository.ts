import { db } from "../db";
import { PgTableWithColumns } from "drizzle-orm/pg-core";
import { eq, and, or, desc, asc, sql } from "drizzle-orm";

export abstract class BaseRepository<T, TInsert> {
  constructor(protected table: PgTableWithColumns<any>) {}

  async findById(id: number): Promise<T | undefined> {
    const [result] = await db.select().from(this.table).where(eq(this.table.id, id));
    return result || undefined;
  }

  async findAll(options?: {
    where?: any;
    orderBy?: any;
    limit?: number;
    offset?: number;
  }): Promise<T[]> {
    let query = db.select().from(this.table);
    
    if (options?.where) {
      query = query.where(options.where);
    }
    
    if (options?.orderBy) {
      query = query.orderBy(options.orderBy);
    }
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return await query;
  }

  async create(data: TInsert): Promise<T> {
    const [result] = await db.insert(this.table).values(data).returning();
    return result;
  }

  async update(id: number, data: Partial<TInsert>): Promise<T> {
    const [result] = await db.update(this.table)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(this.table.id, id))
      .returning();
    return result;
  }

  async delete(id: number): Promise<void> {
    await db.delete(this.table).where(eq(this.table.id, id));
  }

  async count(where?: any): Promise<number> {
    let query = db.select({ count: sql<number>`count(*)` }).from(this.table);
    
    if (where) {
      query = query.where(where);
    }

    const [result] = await query;
    return result.count;
  }

  async exists(where: any): Promise<boolean> {
    const count = await this.count(where);
    return count > 0;
  }
}