import {
  calls,
  callsFor,
  insertArgsFor,
  updateArgsFor,
  resetMock,
  setResponse,
} from '../../test-utils/supabaseServiceMock';

// `require` inside the factory (rather than importing the module normally
// and mocking with an object literal) guarantees the mock module Jest wires
// up for `../utils/supabase` is the exact same singleton instance imported
// above, so `calls`/`setResponse` mutations are visible to the code under test.
jest.mock('../../utils/supabase', () => require('../../test-utils/supabaseServiceMock'));

import {
  fetchAllLocations,
  insertLocation,
  updateLocationScalars,
  deleteLocation,
  syncLocationChildren,
  fetchAllQueens,
  insertQueen,
  updateQueen,
  deleteQueen,
  fetchAllQueenBoxRows,
  insertQueenBoxRow,
  updateQueenBoxRowScalars,
  syncQueenBoxRowChildren,
  deleteQueenBoxRow,
  fetchAllSales,
  insertSale,
  updateSale,
  deleteSale,
  fetchAllExpenses,
  insertExpense,
  updateExpense,
  deleteExpense,
  fetchAllIncomes,
  insertIncome,
  updateIncome,
  deleteIncome,
  fetchAllNotes,
  insertNote,
  updateNote,
  deleteNote,
  fetchAllPolenHarvests,
  insertPolenHarvest,
  updatePolenHarvest,
  deletePolenHarvest,
  deleteAllUserData,
} from '../../services/supabaseService';
import { Location, HiveRow, Hive, HiveNote, Queen, QueenBoxRow, QueenBox, Sale } from '../../types';

const USER_ID = 'user-1';

beforeEach(() => {
  resetMock();
});

// ── Fixture builders ─────────────────────────────────────────────

function makeHive(overrides: Partial<Hive> = {}): Hive {
  return {
    id: 'hive-1',
    number: 1,
    locationId: 'loc-1',
    rowId: 'row-1',
    type: 'hive',
    health: 'good',
    hasQueen: true,
    queenId: 'queen-1',
    frameCount: 10,
    isHarvested: false,
    hasPollen: false,
    isActive: true,
    notes: [],
    feedingDates: [],
    harvestDates: [],
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeRow(hives: Hive[] = [], overrides: Partial<HiveRow> = {}): HiveRow {
  return {
    id: 'row-1',
    name: 'Red 1',
    locationId: 'loc-1',
    capacity: 10,
    hives,
    order: 0,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeQueen(overrides: Partial<Queen> = {}): Queen {
  return {
    id: 'q-1',
    breed: 'carniolan',
    status: 'laying',
    birthDate: new Date('2024-01-01T00:00:00.000Z'),
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeQueenBox(overrides: Partial<QueenBox> = {}): QueenBox {
  return {
    id: 'box-1',
    number: 1,
    rowId: 'qrow-1',
    health: 'good',
    status: 'developing',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

// ============================================================
// LOCATIONS
// ============================================================

describe('fetchAllLocations', () => {
  it('assembles locations → rows → hives → notes/dates from 6 parallel queries', async () => {
    setResponse('locations:select', {
      data: [{ id: 'loc-1', user_id: USER_ID, name: 'Kuca', icon: 'home', description: null, created_at: '2025-01-01T00:00:00.000Z', updated_at: '2025-01-01T00:00:00.000Z' }],
      error: null,
    });
    setResponse('hive_rows:select', {
      data: [{ id: 'row-1', user_id: USER_ID, location_id: 'loc-1', name: 'Red 1', capacity: 10, order: 0, created_at: '2025-01-01T00:00:00.000Z', updated_at: '2025-01-01T00:00:00.000Z' }],
      error: null,
    });
    setResponse('hives:select', {
      data: [{
        id: 'hive-1', user_id: USER_ID, location_id: 'loc-1', row_id: 'row-1', number: 1,
        type: 'hive', health: 'good', has_queen: true, queen_id: null, last_inspection: null,
        scheduled_inspection: null, frame_count: 10, is_harvested: false, has_pollen: false,
        is_active: true, last_feeding_date: null, last_harvest_date: null, swarm_status: null,
        swarm_start_date: null, created_at: '2025-01-01T00:00:00.000Z', updated_at: '2025-01-01T00:00:00.000Z',
      }],
      error: null,
    });
    setResponse('hive_notes:select', {
      data: [{ id: 'n1', user_id: USER_ID, hive_id: 'hive-1', text: 'Note', photos: null, created_at: '2025-01-02T00:00:00.000Z' }],
      error: null,
    });
    setResponse('hive_feeding_dates:select', { data: [], error: null });
    setResponse('hive_harvest_dates:select', { data: [], error: null });

    const locations = await fetchAllLocations(USER_ID);
    expect(locations).toHaveLength(1);
    expect(locations[0].rows).toHaveLength(1);
    expect(locations[0].rows[0].hives).toHaveLength(1);
    expect(locations[0].rows[0].hives[0].notes).toHaveLength(1);
    expect(locations[0].rows[0].hives[0].notes![0].text).toBe('Note');
  });

  it('deduplicates rows with the same name within a location', async () => {
    setResponse('locations:select', {
      data: [{ id: 'loc-1', user_id: USER_ID, name: 'Kuca', icon: 'home', description: null, created_at: 'a', updated_at: 'a' }],
      error: null,
    });
    setResponse('hive_rows:select', {
      data: [
        { id: 'row-1', user_id: USER_ID, location_id: 'loc-1', name: 'Red 1', capacity: 10, order: 0, created_at: 'a', updated_at: 'a' },
        { id: 'row-2', user_id: USER_ID, location_id: 'loc-1', name: 'Red 1', capacity: 10, order: 1, created_at: 'b', updated_at: 'b' },
      ],
      error: null,
    });
    setResponse('hives:select', { data: [], error: null });
    setResponse('hive_notes:select', { data: [], error: null });
    setResponse('hive_feeding_dates:select', { data: [], error: null });
    setResponse('hive_harvest_dates:select', { data: [], error: null });

    const locations = await fetchAllLocations(USER_ID);
    expect(locations[0].rows).toHaveLength(1);
    expect(locations[0].rows[0].id).toBe('row-1'); // keeps first
  });

  it('throws when any of the parallel queries errors', async () => {
    setResponse('locations:select', { data: null, error: new Error('boom') });
    await expect(fetchAllLocations(USER_ID)).rejects.toThrow('boom');
  });
});

describe('insertLocation', () => {
  it('inserts the location row and all nested rows/hives', async () => {
    const location: Location = {
      id: 'loc-1', name: 'Kuca', icon: 'home', description: 'desc',
      rows: [makeRow([makeHive()])],
      createdAt: new Date(), updatedAt: new Date(),
    };
    const ok = await insertLocation(USER_ID, location);
    expect(ok).toBe(true);
    expect(insertArgsFor('locations')).toEqual([expect.objectContaining({ id: 'loc-1', user_id: USER_ID, name: 'Kuca' })]);
    expect(insertArgsFor('hive_rows')).toEqual([expect.objectContaining({ id: 'row-1' })]);
    expect(insertArgsFor('hives')).toEqual([expect.objectContaining({ id: 'hive-1', row_id: 'row-1' })]);
  });

  it('returns false and does not throw when the insert fails', async () => {
    setResponse('locations:insert', { data: null, error: new Error('fail') });
    const location: Location = { id: 'loc-1', name: 'X', icon: 'home', rows: [], createdAt: new Date(), updatedAt: new Date() };
    const ok = await insertLocation(USER_ID, location);
    expect(ok).toBe(false);
  });
});

describe('updateLocationScalars', () => {
  it('only includes fields present in the partial update', async () => {
    await updateLocationScalars(USER_ID, 'loc-1', { name: 'New Name' });
    const payload = updateArgsFor('locations');
    expect(payload.name).toBe('New Name');
    expect(payload).not.toHaveProperty('icon');
    expect(payload).not.toHaveProperty('description');
  });

  it('scopes the update to the given id via .eq', async () => {
    await updateLocationScalars(USER_ID, 'loc-42', { name: 'X' });
    const eqCall = callsFor('locations').find((c) => c.method === 'eq');
    expect(eqCall?.args).toEqual(['id', 'loc-42']);
  });

  it('converts empty-string description to null (documented || behavior)', async () => {
    await updateLocationScalars(USER_ID, 'loc-1', { description: '' });
    const payload = updateArgsFor('locations');
    expect(payload.description).toBeNull();
  });
});

describe('deleteLocation', () => {
  it('deletes by id only (relies on DB cascade for children)', async () => {
    await deleteLocation(USER_ID, 'loc-1');
    const del = callsFor('locations').find((c) => c.method === 'delete');
    const eq = callsFor('locations').find((c) => c.method === 'eq');
    expect(del).toBeDefined();
    expect(eq?.args).toEqual(['id', 'loc-1']);
  });
});

// ============================================================
// syncLocationChildren / syncRowHives / syncHiveUpdate / syncHiveNotes
// ============================================================

describe('syncLocationChildren diff logic', () => {
  it('deletes rows removed from the new set, inserts rows newly added', async () => {
    const oldRows = [makeRow([], { id: 'row-1' }), makeRow([], { id: 'row-2' })];
    const newRows = [makeRow([], { id: 'row-1' }), makeRow([], { id: 'row-3' })];

    await syncLocationChildren(USER_ID, 'loc-1', oldRows, newRows);

    const rowDeleteIn = callsFor('hive_rows').find((c) => c.method === 'in');
    expect(rowDeleteIn?.args).toEqual(['id', ['row-2']]);
    expect(insertArgsFor('hive_rows')).toEqual([expect.objectContaining({ id: 'row-3' })]);
  });

  it('does not touch row scalars when nothing about the row changed', async () => {
    const row = makeRow([], { id: 'row-1', name: 'Same', order: 0, capacity: 10 });
    await syncLocationChildren(USER_ID, 'loc-1', [row], [{ ...row }]);
    const updateCall = callsFor('hive_rows').find((c) => c.method === 'update');
    expect(updateCall).toBeUndefined();
  });

  it('updates row scalars when name/order/capacity changed, without touching hives', async () => {
    const oldRow = makeRow([makeHive()], { id: 'row-1', name: 'Old', order: 0, capacity: 10 });
    const newRow = { ...oldRow, name: 'New', hives: oldRow.hives };
    await syncLocationChildren(USER_ID, 'loc-1', [oldRow], [newRow]);
    const updateCall = updateArgsFor('hive_rows');
    expect(updateCall.name).toBe('New');
  });

  it('reorders/shuffles ids correctly — a shuffled-but-identical hive set produces no spurious insert/delete', async () => {
    const h1 = makeHive({ id: 'h1', number: 1 });
    const h2 = makeHive({ id: 'h2', number: 2 });
    const oldRow = makeRow([h1, h2], { id: 'row-1' });
    const newRow = makeRow([h2, h1], { id: 'row-1' }); // shuffled order, same ids

    await syncLocationChildren(USER_ID, 'loc-1', [oldRow], [newRow]);

    expect(callsFor('hives').find((c) => c.method === 'insert')).toBeUndefined();
    expect(callsFor('hives').find((c) => c.method === 'in')).toBeUndefined();
    // Identical hives (just reordered) now produce zero spurious writes —
    // syncHiveUpdate diffs mapped columns and skips the update entirely when nothing changed.
    const updateCalls = callsFor('hives').filter((c) => c.method === 'update');
    expect(updateCalls).toHaveLength(0);
  });
});

describe('syncHiveUpdate (via syncLocationChildren) — diff-based column update', () => {
  it('sends only the changed column, not the full mapped row', async () => {
    const oldHive = makeHive({ id: 'h1', health: 'good', frameCount: 12, hasPollen: true });
    const newHive = { ...oldHive, health: 'bad' as const }; // caller only intended to change health, but spread preserves the rest
    const oldRow = makeRow([oldHive]);
    const newRow = makeRow([newHive]);

    await syncLocationChildren(USER_ID, 'loc-1', [oldRow], [newRow]);

    const payload = updateArgsFor('hives');
    expect(payload.health).toBe('bad');
    // Unchanged fields aren't part of the update payload at all — nothing to overwrite.
    expect(payload.frame_count).toBeUndefined();
    expect(payload.has_pollen).toBeUndefined();
  });

  it('still only pushes fields whose mapped value actually differs, even if a caller builds an incomplete Hive object (missing fields, not spreading the old one)', async () => {
    const oldHive = makeHive({ id: 'h1', frameCount: 25, hasPollen: true, isHarvested: true, hasQueen: false, health: 'warning' });
    // Simulate a buggy caller that forgets to spread `...oldHive` and constructs a bare-minimum object.
    const brokenNewHive = {
      id: 'h1',
      number: oldHive.number,
      locationId: oldHive.locationId,
      rowId: oldHive.rowId,
      type: 'hive' as const,
      health: 'good' as const, // only field they meant to change
      createdAt: oldHive.createdAt,
      updatedAt: new Date(),
    } as Hive; // missing frameCount/hasPollen/isHarvested/hasQueen/etc.

    const oldRow = makeRow([oldHive]);
    const newRow = makeRow([brokenNewHive]);

    await syncLocationChildren(USER_ID, 'loc-1', [oldRow], [newRow]);

    const payload = updateArgsFor('hives');
    // The diff can only compare mapped values, not "was this explicitly provided" —
    // so fields that differ from the old value purely because they fell back to
    // hiveToDb's defaults still get pushed as if they were a real, intended change.
    // This is a residual risk: syncHiveUpdate no longer touches fields that happen
    // to already match the default, but it still can't detect "caller forgot this field"
    // vs. "caller meant to reset it". Callers must keep spreading the full old Hive object.
    expect(payload.frame_count).toBe(10);
    expect(payload.is_harvested).toBe(false);
    expect(payload.has_pollen).toBe(false);
    expect(payload.has_queen).toBe(true);
  });

  it('syncs notes as an add/delete diff, not a full replace (existing notes untouched)', async () => {
    const keptNote: HiveNote = { id: 'n1', text: 'Keep me', createdAt: new Date('2025-01-01') };
    const removedNote: HiveNote = { id: 'n2', text: 'Remove me', createdAt: new Date('2025-01-02') };
    const addedNote: HiveNote = { id: 'n3', text: 'New note', createdAt: new Date('2025-01-03') };

    const oldHive = makeHive({ id: 'h1', notes: [keptNote, removedNote] });
    const newHive = { ...oldHive, notes: [keptNote, addedNote] };
    const oldRow = makeRow([oldHive]);
    const newRow = makeRow([newHive]);

    await syncLocationChildren(USER_ID, 'loc-1', [oldRow], [newRow]);

    const noteDeleteIn = callsFor('hive_notes').find((c) => c.method === 'in');
    expect(noteDeleteIn?.args).toEqual(['id', ['n2']]);
    expect(insertArgsFor('hive_notes')).toEqual([expect.objectContaining({ id: 'n3', text: 'New note' })]);
  });

  it('skips feeding/harvest date sync for swarms even if dates changed', async () => {
    const oldHive = makeHive({ id: 'h1', type: 'swarm', feedingDates: [], harvestDates: [] });
    const newHive = { ...oldHive, feedingDates: [new Date('2025-02-01')] };
    const oldRow = makeRow([oldHive]);
    const newRow = makeRow([newHive]);

    await syncLocationChildren(USER_ID, 'loc-1', [oldRow], [newRow]);
    expect(callsFor('hive_feeding_dates')).toHaveLength(0);
  });

  it('replaces feeding dates wholesale (delete-all then insert) only when the array actually changed', async () => {
    const oldHive = makeHive({ id: 'h1', feedingDates: [new Date('2025-01-01')] });
    const sameHive = { ...oldHive };
    const oldRow = makeRow([oldHive]);
    const sameRow = makeRow([sameHive]);

    await syncLocationChildren(USER_ID, 'loc-1', [oldRow], [sameRow]);
    expect(callsFor('hive_feeding_dates')).toHaveLength(0);

    resetMock();
    const changedHive = { ...oldHive, feedingDates: [new Date('2025-01-01'), new Date('2025-03-01')] };
    const changedRow = makeRow([changedHive]);
    await syncLocationChildren(USER_ID, 'loc-1', [oldRow], [changedRow]);
    const feedDel = callsFor('hive_feeding_dates').find((c) => c.method === 'delete');
    const feedInsert = insertArgsFor('hive_feeding_dates');
    expect(feedDel).toBeDefined();
    expect(feedInsert).toHaveLength(2);
  });
});

// ============================================================
// QUEENS
// ============================================================

describe('insertQueen / fetchAllQueens', () => {
  it('maps and inserts a queen with correct user_id', async () => {
    const queen = makeQueen({ id: 'q-1', name: 'Ana', productivity: 0, temperament: 0 });
    await insertQueen(USER_ID, queen);
    const payload = insertArgsFor('queens')[0];
    expect(payload.user_id).toBe(USER_ID);
    // Falsy-but-valid values (0) must survive the mapper's `?? null`.
    expect(payload.productivity).toBe(0);
    expect(payload.temperament).toBe(0);
  });

  it('fetches and maps queens back from db rows', async () => {
    setResponse('queens:select', {
      data: [{ id: 'q-1', user_id: USER_ID, name: 'Ana', breed: 'italian', status: 'laying', birth_date: '2024-01-01T00:00:00.000Z', color: null, marking_year: null, current_hive_id: null, mother_queen_id: null, productivity: 0, temperament: 5, notes: null, created_at: 'a', updated_at: 'a' }],
      error: null,
    });
    const queens = await fetchAllQueens(USER_ID);
    expect(queens[0].productivity).toBe(0);
  });
});

describe('updateQueen — partial updates and falsy-value handling', () => {
  it('only includes fields present in `updates`', async () => {
    await updateQueen(USER_ID, 'q-1', { status: 'retired' });
    const payload = updateArgsFor('queens');
    expect(payload.status).toBe('retired');
    expect(payload).not.toHaveProperty('breed');
    expect(payload).not.toHaveProperty('name');
    expect(payload).not.toHaveProperty('productivity');
  });

  it('preserves productivity=0 (uses ?? not ||)', async () => {
    await updateQueen(USER_ID, 'q-1', { productivity: 0 });
    const payload = updateArgsFor('queens');
    expect(payload.productivity).toBe(0);
  });

  it('preserves temperament=0 (uses ?? not ||)', async () => {
    await updateQueen(USER_ID, 'q-1', { temperament: 0 });
    const payload = updateArgsFor('queens');
    expect(payload.temperament).toBe(0);
  });

  it('preserves markingYear=0 edge case via ??', async () => {
    await updateQueen(USER_ID, 'q-1', { markingYear: 0 });
    const payload = updateArgsFor('queens');
    expect(payload.marking_year).toBe(0);
  });

  it('converts empty-string name/color/notes to null (documented || behavior — cannot distinguish "clear field" from falsy)', async () => {
    await updateQueen(USER_ID, 'q-1', { name: '', color: '', notes: '' });
    const payload = updateArgsFor('queens');
    expect(payload.name).toBeNull();
    expect(payload.color).toBeNull();
    expect(payload.notes).toBeNull();
  });

  it('does not send unrelated fields when clearing currentHiveId/motherQueenId', async () => {
    await updateQueen(USER_ID, 'q-1', { currentHiveId: undefined });
    const payload = updateArgsFor('queens');
    // updates.currentHiveId !== undefined is false here, so it's correctly omitted (not cleared)
    expect(payload).not.toHaveProperty('current_hive_id');
  });

  it('clears currentHiveId to null when explicitly set to empty string', async () => {
    await updateQueen(USER_ID, 'q-1', { currentHiveId: '' });
    const payload = updateArgsFor('queens');
    expect(payload.current_hive_id).toBeNull();
  });
});

describe('deleteQueen', () => {
  it('deletes only the given id', async () => {
    await deleteQueen(USER_ID, 'q-1');
    const eq = callsFor('queens').find((c) => c.method === 'eq');
    expect(eq?.args).toEqual(['id', 'q-1']);
  });
});

// ============================================================
// QUEEN BOX ROWS
// ============================================================

describe('fetchAllQueenBoxRows', () => {
  it('groups boxes under their row by rowId', async () => {
    setResponse('queen_box_rows:select', {
      data: [{ id: 'qrow-1', user_id: USER_ID, name: 'Row', location_id: 'loc-1', capacity: 5, order: 0, created_at: 'a', updated_at: 'a' }],
      error: null,
    });
    setResponse('queen_boxes:select', {
      data: [{ id: 'box-1', user_id: USER_ID, row_id: 'qrow-1', number: 1, health: 'good', status: 'developing', start_date: null, maturity_date: null, removal_date: null, notes: null, created_at: 'a', updated_at: 'a' }],
      error: null,
    });
    const rows = await fetchAllQueenBoxRows(USER_ID);
    expect(rows[0].queenBoxes).toHaveLength(1);
  });
});

describe('insertQueenBoxRow', () => {
  it('inserts the row and its nested boxes', async () => {
    const row: QueenBoxRow = { id: 'qrow-1', name: 'Row', locationId: 'loc-1', capacity: 5, queenBoxes: [makeQueenBox()], order: 0, createdAt: new Date(), updatedAt: new Date() };
    await insertQueenBoxRow(USER_ID, row);
    expect(insertArgsFor('queen_box_rows')).toEqual([expect.objectContaining({ id: 'qrow-1' })]);
    expect(insertArgsFor('queen_boxes')).toEqual([expect.objectContaining({ id: 'box-1', row_id: 'qrow-1' })]);
  });

  it('does not call insert on queen_boxes when there are no boxes', async () => {
    const row: QueenBoxRow = { id: 'qrow-1', name: 'Row', locationId: 'loc-1', capacity: 5, queenBoxes: [], order: 0, createdAt: new Date(), updatedAt: new Date() };
    await insertQueenBoxRow(USER_ID, row);
    expect(callsFor('queen_boxes')).toHaveLength(0);
  });
});

describe('updateQueenBoxRowScalars', () => {
  it('only sends fields present in updates', async () => {
    await updateQueenBoxRowScalars(USER_ID, 'qrow-1', { capacity: 8 });
    const payload = updateArgsFor('queen_box_rows');
    expect(payload.capacity).toBe(8);
    expect(payload).not.toHaveProperty('name');
    expect(payload).not.toHaveProperty('location_id');
  });
});

describe('syncQueenBoxRowChildren', () => {
  it('diffs added/removed/modified boxes correctly', async () => {
    const kept = makeQueenBox({ id: 'b1', health: 'good' });
    const removed = makeQueenBox({ id: 'b2' });
    const added = makeQueenBox({ id: 'b3' });
    const keptModified = { ...kept, health: 'critical' as const };

    await syncQueenBoxRowChildren(USER_ID, 'qrow-1', [kept, removed], [keptModified, added]);

    const delIn = callsFor('queen_boxes').find((c) => c.method === 'in');
    expect(delIn?.args).toEqual(['id', ['b2']]);
    expect(insertArgsFor('queen_boxes')).toEqual([expect.objectContaining({ id: 'b3' })]);
    const updatePayload = updateArgsFor('queen_boxes');
    expect(updatePayload.health).toBe('critical');
  });

  it('strips id/user_id/row_id from the update payload (cannot reassign a box to another row this way)', async () => {
    const box = makeQueenBox({ id: 'b1' });
    await syncQueenBoxRowChildren(USER_ID, 'qrow-1', [box], [{ ...box, health: 'warning' }]);
    const updatePayload = updateArgsFor('queen_boxes');
    expect(updatePayload).not.toHaveProperty('id');
    expect(updatePayload).not.toHaveProperty('user_id');
    expect(updatePayload).not.toHaveProperty('row_id');
  });
});

describe('deleteQueenBoxRow', () => {
  it('deletes only the given id', async () => {
    await deleteQueenBoxRow(USER_ID, 'qrow-1');
    const eq = callsFor('queen_box_rows').find((c) => c.method === 'eq');
    expect(eq?.args).toEqual(['id', 'qrow-1']);
  });
});

// ============================================================
// SALES
// ============================================================

describe('fetchAllSales / insertSale', () => {
  it('inserts sale and nested items with correct sale_id FK', async () => {
    const sale: Sale = {
      id: 's1', customerName: 'Pera', items: [{ id: 'i1', type: 'honey', itemName: 'Med', quantity: 2, unitPrice: 10, totalPrice: 20 }],
      totalAmount: 20, status: 'completed', saleDate: new Date(), createdAt: new Date(), updatedAt: new Date(),
    };
    await insertSale(USER_ID, sale);
    expect(insertArgsFor('sale_items')).toEqual([expect.objectContaining({ id: 'i1', sale_id: 's1' })]);
  });

  it('groups sale_items by sale_id when fetching', async () => {
    setResponse('sales:select', {
      data: [{ id: 's1', user_id: USER_ID, customer_name: 'Pera', customer_phone: null, customer_email: null, total_amount: 20, status: 'completed', sale_date: 'a', payment_method: null, notes: null, created_at: 'a', updated_at: 'a' }],
      error: null,
    });
    setResponse('sale_items:select', {
      data: [{ id: 'i1', user_id: USER_ID, sale_id: 's1', type: 'honey', item_id: null, item_name: 'Med', quantity: 2, unit_price: 10, total_price: 20, created_at: 'a' }],
      error: null,
    });
    const sales = await fetchAllSales(USER_ID);
    expect(sales[0].items).toHaveLength(1);
  });
});

describe('updateSale — partial update / falsy handling', () => {
  it('only sends provided fields', async () => {
    await updateSale(USER_ID, 's1', { status: 'cancelled' });
    const payload = updateArgsFor('sales');
    expect(payload.status).toBe('cancelled');
    expect(payload).not.toHaveProperty('customer_name');
    expect(payload).not.toHaveProperty('total_amount');
  });

  it('preserves totalAmount=0 (no || used on numeric field)', async () => {
    await updateSale(USER_ID, 's1', { totalAmount: 0 });
    const payload = updateArgsFor('sales');
    expect(payload.total_amount).toBe(0);
  });
});

describe('deleteSale', () => {
  it('deletes only the given id', async () => {
    await deleteSale(USER_ID, 's1');
    const eq = callsFor('sales').find((c) => c.method === 'eq');
    expect(eq?.args).toEqual(['id', 's1']);
  });
});

// ============================================================
// EXPENSES / INCOMES
// ============================================================

describe('updateExpense — partial + falsy handling', () => {
  it('only sends provided fields', async () => {
    await updateExpense(USER_ID, 'e1', { amount: 0 });
    const payload = updateArgsFor('expenses');
    expect(payload.amount).toBe(0); // no || on amount
    expect(payload).not.toHaveProperty('category');
    expect(payload).not.toHaveProperty('description');
  });
});

describe('updateIncome — partial + falsy handling', () => {
  it('only sends provided fields', async () => {
    await updateIncome(USER_ID, 'i1', { amount: 0 });
    const payload = updateArgsFor('incomes');
    expect(payload.amount).toBe(0);
    expect(payload).not.toHaveProperty('category');
  });
});

describe('deleteExpense / deleteIncome', () => {
  it('scope deletes to id', async () => {
    await deleteExpense(USER_ID, 'e1');
    await deleteIncome(USER_ID, 'i1');
    expect(callsFor('expenses').find((c) => c.method === 'eq')?.args).toEqual(['id', 'e1']);
    expect(callsFor('incomes').find((c) => c.method === 'eq')?.args).toEqual(['id', 'i1']);
  });
});

// ============================================================
// NOTES
// ============================================================

describe('updateNote', () => {
  it('only sends provided fields (no notes fields use `||` so empty content is preserved literally)', async () => {
    await updateNote(USER_ID, 'n1', { content: '' });
    const payload = updateArgsFor('notes');
    expect(payload.content).toBe('');
    expect(payload).not.toHaveProperty('title');
  });
});

describe('deleteNote', () => {
  it('deletes only the given id', async () => {
    await deleteNote(USER_ID, 'n1');
    expect(callsFor('notes').find((c) => c.method === 'eq')?.args).toEqual(['id', 'n1']);
  });
});

// ============================================================
// POLEN HARVESTS
// ============================================================

describe('updatePolenHarvest', () => {
  it('preserves weightGrams=0 and only sends provided fields', async () => {
    await updatePolenHarvest(USER_ID, 'p1', { weightGrams: 0 });
    const payload = updateArgsFor('polen_harvests');
    expect(payload.weight_grams).toBe(0);
    expect(payload).not.toHaveProperty('date');
    expect(payload).not.toHaveProperty('notes');
  });

  it('uses ?? for notes so empty string is preserved, not nulled', async () => {
    await updatePolenHarvest(USER_ID, 'p1', { notes: '' });
    const payload = updateArgsFor('polen_harvests');
    expect(payload.notes).toBe('');
  });
});

describe('deletePolenHarvest', () => {
  it('deletes only the given id', async () => {
    await deletePolenHarvest(USER_ID, 'p1');
    expect(callsFor('polen_harvests').find((c) => c.method === 'eq')?.args).toEqual(['id', 'p1']);
  });
});

// ============================================================
// BULK DELETE
// ============================================================

describe('deleteAllUserData', () => {
  it('issues an unscoped delete (neq id "") against every listed table — shared-RLS wipes ALL users, by design', async () => {
    await deleteAllUserData(USER_ID);
    const tables = ['locations', 'queens', 'queen_box_rows', 'sales', 'expenses', 'incomes', 'notes'];
    for (const table of tables) {
      const neqCall = callsFor(table).find((c) => c.method === 'neq');
      expect(neqCall?.args).toEqual(['id', '']);
    }
  });

  it('does NOT delete hives/hive_rows/hive_notes/queen_boxes/sale_items/polen_harvests directly (relies on cascade)', async () => {
    await deleteAllUserData(USER_ID);
    const untouchedTables = ['hives', 'hive_rows', 'hive_notes', 'queen_boxes', 'sale_items', 'polen_harvests'];
    for (const table of untouchedTables) {
      expect(callsFor(table)).toHaveLength(0);
    }
  });

  it('returns false if any delete fails', async () => {
    setResponse('sales:delete', { data: null, error: new Error('fail') });
    const result = await deleteAllUserData(USER_ID);
    expect(result).toBe(false);
  });
});
