import { supabase, isSupabaseConfigured } from '../utils/supabase';
import {
  Location, HiveRow, Hive, HiveNote,
  Queen, QueenBoxRow, QueenBox,
  Sale, SaleItem, Expense, Income, Note, PolenHarvest,
} from '../types';
import {
  locationToDb, dbToLocation,
  hiveRowToDb, dbToHiveRow,
  hiveToDb, dbToHive,
  hiveNoteToDb, dbToHiveNote,
  queenToDb, dbToQueen,
  queenBoxRowToDb, dbToQueenBoxRow,
  queenBoxToDb, dbToQueenBox,
  saleToDb, dbToSale,
  saleItemToDb, dbToSaleItem,
  expenseToDb, dbToExpense,
  incomeToDb, dbToIncome,
  noteToDb, dbToNote,
  polenHarvestToDb, dbToPolenHarvest,
  groupBy, deduplicateByKey,
  DbLocation, DbHiveRow, DbHive, DbHiveNote, DbHiveDateEntry,
  DbQueen, DbQueenBoxRow, DbQueenBox,
  DbSale, DbSaleItem, DbExpense, DbIncome, DbNote, DbPolenHarvest,
} from '../utils/supabaseMapper';

// ============================================================
// LOCATIONS (deep nesting: location → hiveRow → hive → notes/dates)
// ============================================================

export async function fetchAllLocations(userId: string): Promise<Location[]> {
  const [locsRes, rowsRes, hivesRes, notesRes, feedRes, harvestRes] = await Promise.all([
    supabase.from('locations').select('*').order('created_at'),
    supabase.from('hive_rows').select('*').order('order'),
    supabase.from('hives').select('*').order('number'),
    supabase.from('hive_notes').select('*').order('created_at', { ascending: false }),
    supabase.from('hive_feeding_dates').select('*').order('date'),
    supabase.from('hive_harvest_dates').select('*').order('date'),
  ]);

  const firstError = locsRes.error || rowsRes.error || hivesRes.error || notesRes.error || feedRes.error || harvestRes.error;
  if (firstError) throw firstError;

  const locs = (locsRes.data || []) as DbLocation[];
  const rows = (rowsRes.data || []) as DbHiveRow[];
  const hives = (hivesRes.data || []) as DbHive[];
  const notes = (notesRes.data || []) as DbHiveNote[];
  const feedDates = (feedRes.data || []) as DbHiveDateEntry[];
  const harvestDates = (harvestRes.data || []) as DbHiveDateEntry[];

  // Group notes and dates by hive_id
  const notesByHive = groupBy(notes, 'hive_id');
  const feedByHive = groupBy(feedDates, 'hive_id');
  const harvestByHive = groupBy(harvestDates, 'hive_id');

  // Assemble hives with their notes and dates
  const assembledHives = hives.map(h =>
    dbToHive(
      h,
      (notesByHive[h.id] || []).map(dbToHiveNote),
      (feedByHive[h.id] || []).map(f => new Date(f.date)),
      (harvestByHive[h.id] || []).map(f => new Date(f.date)),
    )
  );

  // Group hives by row_id
  const hivesByRow = groupBy(assembledHives, 'rowId');

  // Assemble rows with their hives
  const assembledRows = rows.map(r =>
    dbToHiveRow(r, hivesByRow[r.id] || [])
  );

  // Deduplicate rows with the same name within the same location
  // (keeps the first one by created_at order, which is the original)
  const deduplicatedRows = deduplicateByKey(assembledRows, r => `${r.locationId}:${r.name}`);

  // Group rows by location_id
  const rowsByLoc = groupBy(deduplicatedRows, 'locationId');

  // Assemble locations with their rows
  return locs.map(l => dbToLocation(l, rowsByLoc[l.id] || []));
}

export async function insertLocation(userId: string, loc: Location): Promise<boolean> {
  try {
    // Insert the location
    const { error: locErr } = await supabase
      .from('locations')
      .insert([locationToDb(loc, userId)]);
    if (locErr) throw locErr;

    // Insert nested rows and hives in parallel
    await Promise.all(loc.rows.map(row => insertHiveRow(userId, row)));

    return true;
  } catch (error) {
    console.error('Error inserting location:', error);
    return false;
  }
}

export async function updateLocationScalars(userId: string, id: string, updates: Partial<Location>): Promise<boolean> {
  try {
    const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
    if (updates.description !== undefined) dbUpdates.description = updates.description || null;

    const { error } = await supabase
      .from('locations')
      .update(dbUpdates)
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating location:', error);
    return false;
  }
}

export async function deleteLocation(userId: string, id: string): Promise<boolean> {
  try {
    // CASCADE will handle hive_rows → hives → hive_notes, dates
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting location:', error);
    return false;
  }
}

/**
 * Diff-based sync: compares old vs new rows/hives/notes and applies
 * targeted inserts, updates, deletes to Supabase.
 */
export async function syncLocationChildren(
  userId: string,
  locationId: string,
  oldRows: HiveRow[],
  newRows: HiveRow[],
): Promise<boolean> {
  try {
    const oldRowIds = new Set(oldRows.map(r => r.id));
    const newRowIds = new Set(newRows.map(r => r.id));

    // Deleted rows (cascade handles hives, notes, dates)
    const deletedRowIds = [...oldRowIds].filter(id => !newRowIds.has(id));
    if (deletedRowIds.length > 0) {
      const { error } = await supabase.from('hive_rows').delete().in('id', deletedRowIds);
      if (error) throw error;
    }

    // Added rows (insert row + all their hives) in parallel
    const addedRows = newRows.filter(r => !oldRowIds.has(r.id));
    await Promise.all(addedRows.map(row => insertHiveRow(userId, row)));

    // Modified rows — diff hives within each, in parallel
    const modifiedRows = newRows.filter(r => oldRowIds.has(r.id));
    await Promise.all(modifiedRows.map(async (newRow) => {
      const oldRow = oldRows.find(r => r.id === newRow.id)!;

      // Update row scalar fields if changed
      if (oldRow.name !== newRow.name || oldRow.order !== newRow.order || oldRow.capacity !== newRow.capacity) {
        const { error } = await supabase
          .from('hive_rows')
          .update({
            name: newRow.name,
            capacity: newRow.capacity,
            order: newRow.order,
            updated_at: new Date().toISOString(),
          })
          .eq('id', newRow.id);
        if (error) throw error;
      }

      // Diff hives within this row
      await syncRowHives(userId, newRow.id, oldRow.hives, newRow.hives);
    }));

    return true;
  } catch (error) {
    console.error('Error syncing location children:', error);
    return false;
  }
}

async function syncRowHives(
  userId: string,
  rowId: string,
  oldHives: Hive[],
  newHives: Hive[],
): Promise<void> {
  const oldHiveIds = new Set(oldHives.map(h => h.id));
  const newHiveIds = new Set(newHives.map(h => h.id));

  // Deleted hives (cascade handles notes, dates)
  const deletedIds = [...oldHiveIds].filter(id => !newHiveIds.has(id));
  if (deletedIds.length > 0) {
    const { error } = await supabase.from('hives').delete().in('id', deletedIds);
    if (error) throw error;
  }

  // Added hives in parallel
  const addedHives = newHives.filter(h => !oldHiveIds.has(h.id));
  await Promise.all(addedHives.map(hive => insertHive(userId, hive)));

  // Modified hives in parallel
  const modifiedHives = newHives.filter(h => oldHiveIds.has(h.id));
  await Promise.all(modifiedHives.map(newHive => {
    const oldHive = oldHives.find(h => h.id === newHive.id)!;
    return syncHiveUpdate(userId, oldHive, newHive);
  }));
}

async function syncHiveUpdate(userId: string, oldHive: Hive, newHive: Hive): Promise<void> {
  // Diff-based scalar update: only write columns whose mapped value actually
  // changed, so a caller that (incorrectly) builds an incomplete `newHive`
  // can't silently reset untouched fields to hiveToDb's defaults.
  const dbOld = hiveToDb(oldHive, userId);
  const dbNew = hiveToDb(newHive, userId);
  const { id: _oldId, user_id: _oldUserId, ...oldFields } = dbOld;
  const { id: _newId, user_id: _newUserId, ...newFields } = dbNew;

  const changedFields: Record<string, any> = {};
  for (const key of Object.keys(newFields) as (keyof typeof newFields)[]) {
    if (oldFields[key] !== newFields[key]) {
      changedFields[key] = newFields[key];
    }
  }

  if (Object.keys(changedFields).length > 0) {
    const { error } = await supabase
      .from('hives')
      .update({ ...changedFields, updated_at: new Date().toISOString() })
      .eq('id', newHive.id);
    if (error) throw error;
  }

  // Sync notes (applies to both hives and swarms)
  const oldNotes = oldHive.notes || [];
  const newNotes = newHive.notes || [];
  await syncHiveNotes(userId, newHive.id, oldNotes, newNotes);

  // Feeding dates and harvest dates only apply to hives, not swarms
  if (newHive.type === 'swarm') return;

  // Sync feeding dates
  const oldFeedDates = oldHive.feedingDates || [];
  const newFeedDates = newHive.feedingDates || [];
  if (JSON.stringify(oldFeedDates) !== JSON.stringify(newFeedDates)) {
    await syncHiveDates(userId, newHive.id, 'hive_feeding_dates', newFeedDates);
  }

  // Sync harvest dates
  const oldHarvestDates = oldHive.harvestDates || [];
  const newHarvestDates = newHive.harvestDates || [];
  if (JSON.stringify(oldHarvestDates) !== JSON.stringify(newHarvestDates)) {
    await syncHiveDates(userId, newHive.id, 'hive_harvest_dates', newHarvestDates);
  }
}

async function syncHiveNotes(
  userId: string,
  hiveId: string,
  oldNotes: HiveNote[],
  newNotes: HiveNote[],
): Promise<void> {
  const oldNoteIds = new Set(oldNotes.map(n => n.id));
  const newNoteIds = new Set(newNotes.map(n => n.id));

  // Deleted notes
  const deletedIds = [...oldNoteIds].filter(id => !newNoteIds.has(id));
  if (deletedIds.length > 0) {
    const { error } = await supabase.from('hive_notes').delete().in('id', deletedIds);
    if (error) throw error;
  }

  // Added notes
  const addedNotes = newNotes.filter(n => !oldNoteIds.has(n.id));
  if (addedNotes.length > 0) {
    const { error } = await supabase
      .from('hive_notes')
      .insert(addedNotes.map(n => hiveNoteToDb(n, hiveId, userId)));
    if (error) throw error;
  }
}

async function syncHiveDates(
  userId: string,
  hiveId: string,
  table: 'hive_feeding_dates' | 'hive_harvest_dates',
  dates: Date[],
): Promise<void> {
  // Replace all: delete existing, insert new
  const { error: delErr } = await supabase
    .from(table)
    .delete()
    .eq('hive_id', hiveId);
  if (delErr) throw delErr;

  if (dates.length > 0) {
    const { error: insErr } = await supabase
      .from(table)
      .insert(dates.map(d => ({
        hive_id: hiveId,
        user_id: userId,
        date: d.toISOString(),
      })));
    if (insErr) throw insErr;
  }
}

// ============================================================
// HIVE ROW helpers (used by sync and direct operations)
// ============================================================

async function insertHiveRow(userId: string, row: HiveRow): Promise<void> {
  const { error } = await supabase
    .from('hive_rows')
    .insert([hiveRowToDb(row, userId)]);
  if (error) throw error;

  // Insert nested hives in parallel
  await Promise.all(row.hives.map(hive => insertHive(userId, hive)));
}

async function insertHive(userId: string, hive: Hive): Promise<void> {
  const { error } = await supabase
    .from('hives')
    .insert([hiveToDb(hive, userId)]);
  if (error) throw error;

  // Swarms don't have notes, feeding dates, or harvest dates
  if (hive.type === 'swarm') return;

  // Insert notes, feeding dates, and harvest dates in parallel
  const childInserts: Promise<void>[] = [];

  if (hive.notes && hive.notes.length > 0) {
    childInserts.push((async () => {
      const { error: noteErr } = await supabase
        .from('hive_notes')
        .insert(hive.notes!.map(n => hiveNoteToDb(n, hive.id, userId)));
      if (noteErr) throw noteErr;
    })());
  }

  if (hive.feedingDates && hive.feedingDates.length > 0) {
    childInserts.push((async () => {
      const { error: feedErr } = await supabase
        .from('hive_feeding_dates')
        .insert(hive.feedingDates!.map(d => ({
          hive_id: hive.id,
          user_id: userId,
          date: d.toISOString(),
        })));
      if (feedErr) throw feedErr;
    })());
  }

  if (hive.harvestDates && hive.harvestDates.length > 0) {
    childInserts.push((async () => {
      const { error: harvestErr } = await supabase
        .from('hive_harvest_dates')
        .insert(hive.harvestDates!.map(d => ({
          hive_id: hive.id,
          user_id: userId,
          date: d.toISOString(),
        })));
      if (harvestErr) throw harvestErr;
    })());
  }

  await Promise.all(childInserts);
}

// ============================================================
// QUEENS (flat entity)
// ============================================================

export async function fetchAllQueens(userId: string): Promise<Queen[]> {
  const { data, error } = await supabase
    .from('queens')
    .select('*')
    .order('created_at');
  if (error) throw error;
  return (data || []).map(dbToQueen);
}

export async function insertQueen(userId: string, queen: Queen): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('queens')
      .insert([queenToDb(queen, userId)]);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error inserting queen:', error);
    return false;
  }
}

export async function updateQueen(userId: string, id: string, updates: Partial<Queen>): Promise<boolean> {
  try {
    const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) dbUpdates.name = updates.name || null;
    if (updates.breed !== undefined) dbUpdates.breed = updates.breed;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.birthDate !== undefined) dbUpdates.birth_date = updates.birthDate.toISOString();
    if (updates.color !== undefined) dbUpdates.color = updates.color || null;
    if (updates.markingYear !== undefined) dbUpdates.marking_year = updates.markingYear ?? null;
    if (updates.currentHiveId !== undefined) dbUpdates.current_hive_id = updates.currentHiveId || null;
    if (updates.motherQueenId !== undefined) dbUpdates.mother_queen_id = updates.motherQueenId || null;
    if (updates.productivity !== undefined) dbUpdates.productivity = updates.productivity ?? null;
    if (updates.temperament !== undefined) dbUpdates.temperament = updates.temperament ?? null;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;

    const { error } = await supabase
      .from('queens')
      .update(dbUpdates)
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating queen:', error);
    return false;
  }
}

export async function deleteQueen(userId: string, id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('queens')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting queen:', error);
    return false;
  }
}

// ============================================================
// QUEEN BOX ROWS (one-level nesting: row → boxes)
// ============================================================

export async function fetchAllQueenBoxRows(userId: string): Promise<QueenBoxRow[]> {
  const [rowsRes, boxesRes] = await Promise.all([
    supabase.from('queen_box_rows').select('*').order('order'),
    supabase.from('queen_boxes').select('*').order('created_at'),
  ]);
  const firstError = rowsRes.error || boxesRes.error;
  if (firstError) throw firstError;

  const rows = (rowsRes.data || []) as DbQueenBoxRow[];
  const boxes = (boxesRes.data || []) as DbQueenBox[];

  const boxesByRow = groupBy(boxes.map(dbToQueenBox), 'rowId');
  return rows.map(r => dbToQueenBoxRow(r, boxesByRow[r.id] || []));
}

export async function insertQueenBoxRow(userId: string, row: QueenBoxRow): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('queen_box_rows')
      .insert([queenBoxRowToDb(row, userId)]);
    if (error) throw error;

    // Insert nested boxes
    if (row.queenBoxes.length > 0) {
      const { error: boxErr } = await supabase
        .from('queen_boxes')
        .insert(row.queenBoxes.map(b => queenBoxToDb(b, userId)));
      if (boxErr) throw boxErr;
    }
    return true;
  } catch (error) {
    console.error('Error inserting queen box row:', error);
    return false;
  }
}

export async function updateQueenBoxRowScalars(userId: string, id: string, updates: Partial<QueenBoxRow>): Promise<boolean> {
  try {
    const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.locationId !== undefined) dbUpdates.location_id = updates.locationId;
    if (updates.capacity !== undefined) dbUpdates.capacity = updates.capacity;
    if (updates.order !== undefined) dbUpdates.order = updates.order;

    const { error } = await supabase
      .from('queen_box_rows')
      .update(dbUpdates)
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating queen box row:', error);
    return false;
  }
}

export async function syncQueenBoxRowChildren(
  userId: string,
  rowId: string,
  oldBoxes: QueenBox[],
  newBoxes: QueenBox[],
): Promise<boolean> {
  try {
    const oldIds = new Set(oldBoxes.map(b => b.id));
    const newIds = new Set(newBoxes.map(b => b.id));

    // Deleted boxes
    const deletedIds = [...oldIds].filter(id => !newIds.has(id));
    if (deletedIds.length > 0) {
      const { error } = await supabase.from('queen_boxes').delete().in('id', deletedIds);
      if (error) throw error;
    }

    // Added boxes
    const addedBoxes = newBoxes.filter(b => !oldIds.has(b.id));
    if (addedBoxes.length > 0) {
      const { error } = await supabase
        .from('queen_boxes')
        .insert(addedBoxes.map(b => queenBoxToDb(b, userId)));
      if (error) throw error;
    }

    // Modified boxes in parallel
    const modifiedBoxes = newBoxes.filter(b => oldIds.has(b.id));
    await Promise.all(modifiedBoxes.map(async (box) => {
      const dbData = queenBoxToDb(box, userId);
      const { id, user_id, row_id, ...updateFields } = dbData;
      const { error } = await supabase
        .from('queen_boxes')
        .update({ ...updateFields, updated_at: new Date().toISOString() })
        .eq('id', box.id);
      if (error) throw error;
    }));

    return true;
  } catch (error) {
    console.error('Error syncing queen boxes:', error);
    return false;
  }
}

export async function deleteQueenBoxRow(userId: string, id: string): Promise<boolean> {
  try {
    // CASCADE handles queen_boxes
    const { error } = await supabase
      .from('queen_box_rows')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting queen box row:', error);
    return false;
  }
}

// ============================================================
// SALES (one-level nesting: sale → items)
// ============================================================

export async function fetchAllSales(userId: string): Promise<Sale[]> {
  const [salesRes, itemsRes] = await Promise.all([
    supabase.from('sales').select('*').order('sale_date', { ascending: false }),
    supabase.from('sale_items').select('*'),
  ]);
  const firstError = salesRes.error || itemsRes.error;
  if (firstError) throw firstError;

  const sales = (salesRes.data || []) as DbSale[];
  const items = (itemsRes.data || []) as DbSaleItem[];

  const itemsBySaleId = groupBy(items, 'sale_id');

  return sales.map(s => dbToSale(s, (itemsBySaleId[s.id] || []).map(dbToSaleItem)));
}

export async function insertSale(userId: string, sale: Sale): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('sales')
      .insert([saleToDb(sale, userId)]);
    if (error) throw error;

    if (sale.items.length > 0) {
      const { error: itemErr } = await supabase
        .from('sale_items')
        .insert(sale.items.map(item => saleItemToDb(item, sale.id, userId)));
      if (itemErr) throw itemErr;
    }
    return true;
  } catch (error) {
    console.error('Error inserting sale:', error);
    return false;
  }
}

export async function updateSale(userId: string, id: string, updates: Partial<Sale>): Promise<boolean> {
  try {
    const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.customerName !== undefined) dbUpdates.customer_name = updates.customerName;
    if (updates.customerPhone !== undefined) dbUpdates.customer_phone = updates.customerPhone || null;
    if (updates.customerEmail !== undefined) dbUpdates.customer_email = updates.customerEmail || null;
    if (updates.totalAmount !== undefined) dbUpdates.total_amount = updates.totalAmount;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.saleDate !== undefined) dbUpdates.sale_date = updates.saleDate.toISOString();
    if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod || null;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;

    const { error } = await supabase
      .from('sales')
      .update(dbUpdates)
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating sale:', error);
    return false;
  }
}

export async function deleteSale(userId: string, id: string): Promise<boolean> {
  try {
    // CASCADE handles sale_items
    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting sale:', error);
    return false;
  }
}

// ============================================================
// EXPENSES (flat entity)
// ============================================================

export async function fetchAllExpenses(userId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(dbToExpense);
}

export async function insertExpense(userId: string, expense: Expense): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('expenses')
      .insert([expenseToDb(expense, userId)]);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error inserting expense:', error);
    return false;
  }
}

export async function updateExpense(userId: string, id: string, updates: Partial<Expense>): Promise<boolean> {
  try {
    const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.date !== undefined) dbUpdates.date = updates.date.toISOString();
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;

    const { error } = await supabase
      .from('expenses')
      .update(dbUpdates)
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating expense:', error);
    return false;
  }
}

export async function deleteExpense(userId: string, id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting expense:', error);
    return false;
  }
}

// ============================================================
// INCOMES (flat entity)
// ============================================================

export async function fetchAllIncomes(userId: string): Promise<Income[]> {
  const { data, error } = await supabase
    .from('incomes')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(dbToIncome);
}

export async function insertIncome(userId: string, income: Income): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('incomes')
      .insert([incomeToDb(income, userId)]);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error inserting income:', error);
    return false;
  }
}

export async function updateIncome(userId: string, id: string, updates: Partial<Income>): Promise<boolean> {
  try {
    const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.date !== undefined) dbUpdates.date = updates.date.toISOString();
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;

    const { error } = await supabase
      .from('incomes')
      .update(dbUpdates)
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating income:', error);
    return false;
  }
}

export async function deleteIncome(userId: string, id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('incomes')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting income:', error);
    return false;
  }
}

// ============================================================
// NOTES (flat entity — bilješke)
// ============================================================

export async function fetchAllNotes(userId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(dbToNote);
}

export async function insertNote(userId: string, note: Note): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notes')
      .insert([noteToDb(note, userId)]);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error inserting note:', error);
    return false;
  }
}

export async function updateNote(userId: string, id: string, updates: Partial<Note>): Promise<boolean> {
  try {
    const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.date !== undefined) dbUpdates.date = updates.date.toISOString();

    const { error } = await supabase
      .from('notes')
      .update(dbUpdates)
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating note:', error);
    return false;
  }
}

export async function deleteNote(userId: string, id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting note:', error);
    return false;
  }
}

// ============================================================
// POLEN HARVESTS
// ============================================================

export async function fetchAllPolenHarvests(userId: string): Promise<PolenHarvest[]> {
  const { data, error } = await supabase
    .from('polen_harvests')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(dbToPolenHarvest);
}

export async function insertPolenHarvest(userId: string, harvest: PolenHarvest): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('polen_harvests')
      .insert([polenHarvestToDb(harvest, userId)]);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error inserting polen harvest:', error);
    return false;
  }
}

export async function updatePolenHarvest(userId: string, id: string, updates: Partial<PolenHarvest>): Promise<boolean> {
  try {
    const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.date !== undefined) dbUpdates.date = updates.date.toISOString();
    if (updates.weightGrams !== undefined) dbUpdates.weight_grams = updates.weightGrams;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes ?? null;

    const { error } = await supabase
      .from('polen_harvests')
      .update(dbUpdates)
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating polen harvest:', error);
    return false;
  }
}

export async function deletePolenHarvest(userId: string, id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('polen_harvests')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting polen harvest:', error);
    return false;
  }
}

// ============================================================
// BULK DELETE (for clearAllData)
// ============================================================

export async function deleteAllUserData(userId: string): Promise<boolean> {
  try {
    // Delete from parent tables — CASCADE handles children
    // WARNING: With shared RLS policies (using: true), this deletes ALL data for all users
    const results = await Promise.all([
      supabase.from('locations').delete().neq('id', ''),
      supabase.from('queens').delete().neq('id', ''),
      supabase.from('queen_box_rows').delete().neq('id', ''),
      supabase.from('sales').delete().neq('id', ''),
      supabase.from('expenses').delete().neq('id', ''),
      supabase.from('incomes').delete().neq('id', ''),
      supabase.from('notes').delete().neq('id', ''),
    ]);

    const firstError = results.find(r => r.error)?.error;
    if (firstError) throw firstError;

    return true;
  } catch (error) {
    console.error('Error deleting all user data:', error);
    return false;
  }
}
