import {
  locationToDb, dbToLocation,
  hiveRowToDb, dbToHiveRow,
  hiveToDb, dbToHive,
  hiveNoteToDb, dbToHiveNote,
  queenToDb, dbToQueen,
  queenBoxRowToDb, dbToQueenBoxRow,
  queenBoxToDb, dbToQueenBox,
  expenseToDb, dbToExpense,
  incomeToDb, dbToIncome,
  groupBy, deduplicateByKey,
} from '../../utils/supabaseMapper';
import { Location, HiveRow, Hive, HiveNote, Queen, QueenBoxRow, QueenBox, Expense, Income } from '../../types';

const NOW = '2025-06-15T12:00:00.000Z';
const EARLIER = '2025-01-01T08:00:00.000Z';
const USER_ID = 'user-123';

// ── Location ──────────────────────────────────────────────────

describe('locationToDb / dbToLocation', () => {
  const location: Location = {
    id: 'loc-1',
    name: 'Kuca',
    icon: 'home',
    description: 'Main yard',
    rows: [],
    createdAt: new Date(EARLIER),
    updatedAt: new Date(NOW),
  };

  it('converts Location to DB row', () => {
    const db = locationToDb(location, USER_ID);
    expect(db.id).toBe('loc-1');
    expect(db.user_id).toBe(USER_ID);
    expect(db.name).toBe('Kuca');
    expect(db.icon).toBe('home');
    expect(db.description).toBe('Main yard');
  });

  it('converts DB row back to Location', () => {
    const dbRow = { id: 'loc-1', user_id: USER_ID, name: 'Kuca', icon: 'home', description: 'Main yard', created_at: EARLIER, updated_at: NOW };
    const result = dbToLocation(dbRow, []);
    expect(result.id).toBe('loc-1');
    expect(result.name).toBe('Kuca');
    expect(result.rows).toEqual([]);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('handles null description', () => {
    const dbRow = { id: 'loc-2', user_id: USER_ID, name: 'Suma', icon: 'leaf', description: null, created_at: EARLIER, updated_at: NOW };
    const result = dbToLocation(dbRow, []);
    expect(result.description).toBeUndefined();
  });
});

// ── HiveRow ───────────────────────────────────────────────────

describe('hiveRowToDb / dbToHiveRow', () => {
  const row: HiveRow = {
    id: 'row-1',
    name: 'Red 1',
    locationId: 'loc-1',
    capacity: 10,
    hives: [],
    order: 0,
    createdAt: new Date(EARLIER),
    updatedAt: new Date(NOW),
  };

  it('converts HiveRow to DB row', () => {
    const db = hiveRowToDb(row, USER_ID);
    expect(db.location_id).toBe('loc-1');
    expect(db.name).toBe('Red 1');
    expect(db.order).toBe(0);
  });

  it('converts HiveRow to DB row with capacity', () => {
    const db = hiveRowToDb(row, USER_ID);
    expect(db.capacity).toBe(10);
  });

  it('converts DB row back to HiveRow with hives', () => {
    const dbRow = { id: 'row-1', user_id: USER_ID, location_id: 'loc-1', name: 'Red 1', capacity: 10, order: 0, created_at: EARLIER, updated_at: NOW };
    const result = dbToHiveRow(dbRow, []);
    expect(result.locationId).toBe('loc-1');
    expect(result.capacity).toBe(10);
    expect(result.hives).toEqual([]);
  });
});

// ── Hive ──────────────────────────────────────────────────────

describe('hiveToDb / dbToHive', () => {
  const hive: Hive = {
    id: 'hive-1',
    number: 5,
    locationId: 'loc-1',
    rowId: 'row-1',
    type: 'hive',
    health: 'good',
    hasQueen: true,
    queenId: 'queen-1',
    frameCount: 10,
    isHarvested: false,
    hasPollen: true,
    isActive: true,
    createdAt: new Date(EARLIER),
    updatedAt: new Date(NOW),
  };

  it('converts Hive to DB row', () => {
    const db = hiveToDb(hive, USER_ID);
    expect(db.number).toBe(5);
    expect(db.health).toBe('good');
    expect(db.has_queen).toBe(true);
    expect(db.queen_id).toBe('queen-1');
    expect(db.has_pollen).toBe(true);
    expect(db.is_active).toBe(true);
  });

  it('converts DB row back to Hive', () => {
    const dbRow = {
      id: 'hive-1', user_id: USER_ID, location_id: 'loc-1', row_id: 'row-1',
      number: 5, type: 'hive', health: 'good', has_queen: true, queen_id: 'queen-1',
      last_inspection: null, frame_count: 10, is_harvested: false,
      has_pollen: true, is_active: true, last_feeding_date: null,
      last_harvest_date: null, swarm_status: null, swarm_start_date: null,
      created_at: EARLIER, updated_at: NOW,
    };
    const result = dbToHive(dbRow, [], [], []);
    expect(result.number).toBe(5);
    expect(result.health).toBe('good');
    expect(result.hasQueen).toBe(true);
    expect(result.notes).toBeUndefined();
    expect(result.feedingDates).toBeUndefined();
  });

  it('includes notes and dates when provided', () => {
    const dbRow = {
      id: 'hive-1', user_id: USER_ID, location_id: 'loc-1', row_id: 'row-1',
      number: 5, type: 'hive', health: 'bad', has_queen: false, queen_id: null,
      last_inspection: NOW, frame_count: 8, is_harvested: true,
      has_pollen: false, is_active: true, last_feeding_date: null,
      last_harvest_date: null, swarm_status: null, swarm_start_date: null,
      created_at: EARLIER, updated_at: NOW,
    };
    const notes: HiveNote[] = [{ id: 'n1', text: 'Test note', createdAt: new Date(NOW) }];
    const feedDates = [new Date(EARLIER)];
    const harvestDates = [new Date(NOW)];

    const result = dbToHive(dbRow, notes, feedDates, harvestDates);
    expect(result.notes).toHaveLength(1);
    expect(result.feedingDates).toHaveLength(1);
    expect(result.harvestDates).toHaveLength(1);
    expect(result.lastFeedingDate).toEqual(new Date(EARLIER));
    expect(result.lastHarvestDate).toEqual(new Date(NOW));
  });

  it('handles null queen_id gracefully', () => {
    const db = hiveToDb({ ...hive, queenId: undefined }, USER_ID);
    expect(db.queen_id).toBeNull();
  });
});

// ── HiveNote ──────────────────────────────────────────────────

describe('hiveNoteToDb / dbToHiveNote', () => {
  it('converts note with photos', () => {
    const note: HiveNote = { id: 'n1', text: 'Healthy', photos: ['photo1.jpg'], createdAt: new Date(NOW) };
    const db = hiveNoteToDb(note, 'hive-1', USER_ID);
    expect(db.photos).toEqual(['photo1.jpg']);
  });

  it('converts note without photos to null', () => {
    const note: HiveNote = { id: 'n2', text: 'No photos', createdAt: new Date(NOW) };
    const db = hiveNoteToDb(note, 'hive-1', USER_ID);
    expect(db.photos).toBeNull();
  });

  it('converts DB note back', () => {
    const dbNote = { id: 'n1', user_id: USER_ID, hive_id: 'hive-1', text: 'Test', photos: null, created_at: NOW };
    const result = dbToHiveNote(dbNote);
    expect(result.text).toBe('Test');
    expect(result.photos).toBeUndefined();
  });
});

// ── Queen ─────────────────────────────────────────────────────

describe('queenToDb / dbToQueen', () => {
  const queen: Queen = {
    id: 'q-1',
    name: 'Queen A',
    breed: 'carniolan',
    status: 'laying',
    birthDate: new Date(EARLIER),
    color: 'yellow',
    markingYear: 2025,
    productivity: 8,
    temperament: 7,
    createdAt: new Date(EARLIER),
    updatedAt: new Date(NOW),
  };

  it('roundtrips queen data', () => {
    const db = queenToDb(queen, USER_ID);
    expect(db.breed).toBe('carniolan');
    expect(db.status).toBe('laying');
    expect(db.marking_year).toBe(2025);

    const dbRow = { ...db, created_at: EARLIER, updated_at: NOW };
    const result = dbToQueen(dbRow);
    expect(result.breed).toBe('carniolan');
    expect(result.status).toBe('laying');
    expect(result.birthDate).toBeInstanceOf(Date);
  });

  it('handles optional queen fields as null/undefined', () => {
    const minQueen: Queen = {
      id: 'q-2', breed: 'italian', status: 'developing',
      birthDate: new Date(EARLIER), createdAt: new Date(EARLIER), updatedAt: new Date(NOW),
    };
    const db = queenToDb(minQueen, USER_ID);
    expect(db.name).toBeNull();
    expect(db.color).toBeNull();
    expect(db.marking_year).toBeNull();
  });
});

// ── QueenBox ──────────────────────────────────────────────────

describe('queenBoxToDb / dbToQueenBox', () => {
  it('converts a developing queen box', () => {
    const box: QueenBox = {
      id: 'box-1', number: 1, rowId: 'row-1', health: 'good', status: 'developing',
      startDate: new Date(EARLIER),
      maturityDate: new Date('2025-01-26T08:00:00.000Z'),
      createdAt: new Date(EARLIER), updatedAt: new Date(NOW),
    };
    const db = queenBoxToDb(box, USER_ID);
    expect(db.status).toBe('developing');
    expect(db.start_date).toBe(new Date(EARLIER).toISOString());
  });

  it('computes daysUntilMature for developing boxes', () => {
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const dbBox = {
      id: 'box-1', user_id: USER_ID, row_id: 'row-1', number: 1,
      health: 'good', status: 'developing',
      start_date: EARLIER, maturity_date: futureDate, removal_date: null,
      notes: null, created_at: EARLIER, updated_at: NOW,
    };
    const result = dbToQueenBox(dbBox);
    expect(result.daysUntilMature).toBeGreaterThanOrEqual(4);
    expect(result.daysUntilMature).toBeLessThanOrEqual(6);
  });
});

// ── Expense / Income ──────────────────────────────────────────

describe('expenseToDb / dbToExpense', () => {
  const expense: Expense = {
    id: 'exp-1', category: 'feed', description: 'Sugar', amount: 50,
    date: new Date(EARLIER), createdAt: new Date(EARLIER), updatedAt: new Date(NOW),
  };

  it('roundtrips expense data', () => {
    const db = expenseToDb(expense, USER_ID);
    expect(db.category).toBe('feed');
    expect(db.amount).toBe(50);

    const dbRow = { ...db, created_at: EARLIER, updated_at: NOW };
    const result = dbToExpense(dbRow);
    expect(result.category).toBe('feed');
    expect(result.amount).toBe(50);
    expect(result.date).toBeInstanceOf(Date);
  });
});

describe('incomeToDb / dbToIncome', () => {
  const income: Income = {
    id: 'inc-1', category: 'honey-sale', description: 'Honey batch', amount: 200,
    date: new Date(EARLIER), createdAt: new Date(EARLIER), updatedAt: new Date(NOW),
  };

  it('roundtrips income data', () => {
    const db = incomeToDb(income, USER_ID);
    expect(db.category).toBe('honey-sale');

    const dbRow = { ...db, created_at: EARLIER, updated_at: NOW };
    const result = dbToIncome(dbRow);
    expect(result.category).toBe('honey-sale');
    expect(result.amount).toBe(200);
  });
});

// ── Utility functions ─────────────────────────────────────────

describe('groupBy', () => {
  it('groups items by key', () => {
    const items = [
      { id: '1', type: 'a' },
      { id: '2', type: 'b' },
      { id: '3', type: 'a' },
    ];
    const result = groupBy(items, 'type');
    expect(result['a']).toHaveLength(2);
    expect(result['b']).toHaveLength(1);
  });

  it('returns empty arrays for missing keys', () => {
    const result = groupBy([], 'id');
    expect(Object.keys(result)).toHaveLength(0);
  });
});

describe('deduplicateByKey', () => {
  it('removes duplicates keeping first occurrence', () => {
    const items = [
      { id: '1', name: 'first' },
      { id: '1', name: 'duplicate' },
      { id: '2', name: 'second' },
    ];
    const result = deduplicateByKey(items, (item) => item.id);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('first');
  });
});
