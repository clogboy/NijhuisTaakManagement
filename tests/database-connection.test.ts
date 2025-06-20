
import { describe, it, expect } from 'vitest';
import { db } from '../server/db.js';
import { storage } from '../server/storage.js';

describe('Database Connection', () => {
  it('should have a valid database connection', () => {
    expect(db).toBeDefined();
  });

  it('should have storage service available', () => {
    expect(storage).toBeDefined();
    expect(typeof storage.getActivities).toBe('function');
    expect(typeof storage.getSubtasks).toBe('function');
    expect(typeof storage.getQuickWins).toBe('function');
  });
});
