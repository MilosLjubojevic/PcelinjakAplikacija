import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';

/**
 * One-time migration: reads old AsyncStorage JSON blob and inserts
 * all data into Supabase tables with proper UUIDs.
 */
export async function migrateLocalToSupabase(jsonString: string, userId: string): Promise<void> {
  const data = JSON.parse(jsonString);

  // ID mapping: old string ID → new UUID
  const idMap = new Map<string, string>();

  const newId = (oldId: string): string => {
    if (idMap.has(oldId)) return idMap.get(oldId)!;
    const uuid = Crypto.randomUUID();
    idMap.set(oldId, uuid);
    return uuid;
  };

  // Map old health values to the valid "good" | "bad" | "warning" constraint
  const mapHiveHealth = (health: string): string => {
    if (health === 'good' || health === 'excellent') return 'good';
    if (health === 'warning') return 'warning';
    if (health === 'bad' || health === 'critical') return 'bad';
    return 'good';
  };

  // Clean up any partially migrated data from a previous failed attempt
  await Promise.all([
    supabase.from('locations').delete().eq('user_id', userId),
    supabase.from('queens').delete().eq('user_id', userId),
    supabase.from('queen_box_rows').delete().eq('user_id', userId),
    supabase.from('sales').delete().eq('user_id', userId),
    supabase.from('expenses').delete().eq('user_id', userId),
    supabase.from('incomes').delete().eq('user_id', userId),
  ]);

  // ============================================================
  // 1. Migrate Locations → hive_rows → hives → notes + dates
  // ============================================================
  const locations = data.locations || [];
  for (const loc of locations) {
    const locId = newId(loc.id);

    const { error: locErr } = await supabase.from('locations').insert([{
      id: locId,
      user_id: userId,
      name: loc.name,
      icon: loc.icon || 'home',
      description: loc.description || null,
      created_at: loc.createdAt || new Date().toISOString(),
      updated_at: loc.updatedAt || new Date().toISOString(),
    }]);
    if (locErr) {
      console.error('Migration: location insert error', locErr);
      continue;
    }

    const rows = loc.rows || [];
    for (const row of rows) {
      const rowId = newId(row.id);

      const rowCapacity = row.capacity ?? (row.hives ? Math.max(row.hives.length, ...row.hives.map((h: any) => h.number || 0)) : 10);
      const { error: rowErr } = await supabase.from('hive_rows').insert([{
        id: rowId,
        user_id: userId,
        location_id: locId,
        name: row.name,
        capacity: rowCapacity,
        order: row.order ?? 0,
        created_at: row.createdAt || new Date().toISOString(),
        updated_at: row.updatedAt || new Date().toISOString(),
      }]);
      if (rowErr) {
        console.error('Migration: hive_row insert error', rowErr);
        continue;
      }

      const hives = row.hives || [];
      for (const hive of hives) {
        const hiveId = newId(hive.id);
        const queenId = hive.queenId ? newId(hive.queenId) : null;

        const { error: hiveErr } = await supabase.from('hives').insert([{
          id: hiveId,
          user_id: userId,
          location_id: locId,
          row_id: rowId,
          number: hive.number,
          type: hive.type || 'hive',
          health: mapHiveHealth(hive.health || 'good'),
          has_queen: hive.hasQueen ?? true,
          queen_id: queenId,
          last_inspection: hive.lastInspection || null,
          frame_count: hive.frameCount ?? 10,
          is_harvested: hive.isHarvested ?? false,
          has_pollen: hive.hasPollen ?? false,
          is_active: hive.isActive ?? true,
          last_feeding_date: hive.lastFeedingDate || null,
          last_harvest_date: hive.lastHarvestDate || null,
          swarm_status: hive.swarmStatus || null,
          swarm_start_date: hive.swarmStartDate || null,
          created_at: hive.createdAt || new Date().toISOString(),
          updated_at: hive.updatedAt || new Date().toISOString(),
        }]);
        if (hiveErr) {
          console.error('Migration: hive insert error', hiveErr);
          continue;
        }

        // Migrate hive notes
        const notes = hive.notes || [];
        for (const note of notes) {
          const noteId = newId(note.id);
          await supabase.from('hive_notes').insert([{
            id: noteId,
            user_id: userId,
            hive_id: hiveId,
            text: note.text,
            photos: note.photos && note.photos.length > 0 ? note.photos : null,
            created_at: note.createdAt || new Date().toISOString(),
          }]);
        }

        // Migrate feeding dates
        const feedingDates = hive.feedingDates || [];
        if (feedingDates.length > 0) {
          await supabase.from('hive_feeding_dates').insert(
            feedingDates.map((d: string | Date) => ({
              hive_id: hiveId,
              user_id: userId,
              date: typeof d === 'string' ? d : new Date(d).toISOString(),
            }))
          );
        }

        // Migrate harvest dates
        const harvestDates = hive.harvestDates || [];
        if (harvestDates.length > 0) {
          await supabase.from('hive_harvest_dates').insert(
            harvestDates.map((d: string | Date) => ({
              hive_id: hiveId,
              user_id: userId,
              date: typeof d === 'string' ? d : new Date(d).toISOString(),
            }))
          );
        }
      }
    }
  }

  // ============================================================
  // 2. Migrate Queens
  // ============================================================
  const queens = data.queens || [];
  for (const q of queens) {
    const qId = newId(q.id);
    const motherQueenId = q.motherQueenId ? newId(q.motherQueenId) : null;
    const currentHiveId = q.currentHiveId ? newId(q.currentHiveId) : null;

    await supabase.from('queens').insert([{
      id: qId,
      user_id: userId,
      name: q.name || null,
      breed: q.breed,
      status: q.status,
      birth_date: q.birthDate || new Date().toISOString(),
      color: q.color || null,
      marking_year: q.markingYear ?? null,
      current_hive_id: currentHiveId,
      mother_queen_id: motherQueenId,
      productivity: q.productivity ?? null,
      temperament: q.temperament ?? null,
      notes: q.notes || null,
      created_at: q.createdAt || new Date().toISOString(),
      updated_at: q.updatedAt || new Date().toISOString(),
    }]);
  }

  // ============================================================
  // 3. Migrate Queen Box Rows → Queen Boxes
  // ============================================================
  // Build a name→id lookup from already-migrated locations
  const locationNameToId = new Map<string, string>();
  for (const loc of locations) {
    locationNameToId.set((loc.name || '').toLowerCase(), idMap.get(loc.id) || '');
  }

  const queenBoxRows = data.queenBoxRows || [];
  for (const row of queenBoxRows) {
    const rowId = newId(row.id);

    // Resolve locationId: prefer existing locationId, fall back to string location name match
    let locationId = row.locationId ? newId(row.locationId) : null;
    if (!locationId && row.location) {
      locationId = locationNameToId.get(row.location.toLowerCase()) || null;
    }
    // Fallback to first location if nothing matched
    if (!locationId && locations.length > 0) {
      locationId = idMap.get(locations[0].id) || '';
    }

    const rowCapacity = row.capacity ?? (row.queenBoxes ? Math.max(row.queenBoxes.length, ...row.queenBoxes.map((b: any) => b.number || 0)) : 10);

    await supabase.from('queen_box_rows').insert([{
      id: rowId,
      user_id: userId,
      name: row.name,
      location_id: locationId,
      capacity: rowCapacity,
      order: row.order ?? 0,
      created_at: row.createdAt || new Date().toISOString(),
      updated_at: row.updatedAt || new Date().toISOString(),
    }]);

    const boxes = row.queenBoxes || [];
    for (const box of boxes) {
      const boxId = newId(box.id);
      await supabase.from('queen_boxes').insert([{
        id: boxId,
        user_id: userId,
        row_id: rowId,
        number: box.number,
        health: box.health || 'good',
        status: box.status || 'empty',
        start_date: box.startDate || null,
        maturity_date: box.maturityDate || null,
        removal_date: box.removalDate || null,
        notes: box.notes || null,
        created_at: box.createdAt || new Date().toISOString(),
        updated_at: box.updatedAt || new Date().toISOString(),
      }]);
    }
  }

  // ============================================================
  // 4. Migrate Sales → Sale Items
  // ============================================================
  const sales = data.sales || [];
  for (const sale of sales) {
    const saleId = newId(sale.id);

    await supabase.from('sales').insert([{
      id: saleId,
      user_id: userId,
      customer_name: sale.customerName,
      customer_phone: sale.customerPhone || null,
      customer_email: sale.customerEmail || null,
      total_amount: sale.totalAmount ?? 0,
      status: sale.status || 'pending',
      sale_date: sale.saleDate || new Date().toISOString(),
      payment_method: sale.paymentMethod || null,
      notes: sale.notes || null,
      created_at: sale.createdAt || new Date().toISOString(),
      updated_at: sale.updatedAt || new Date().toISOString(),
    }]);

    const items = sale.items || [];
    for (const item of items) {
      const itemId = newId(item.id);
      const itemRefId = item.itemId ? newId(item.itemId) : null;

      await supabase.from('sale_items').insert([{
        id: itemId,
        user_id: userId,
        sale_id: saleId,
        type: item.type,
        item_id: itemRefId,
        item_name: item.itemName,
        quantity: item.quantity ?? 1,
        unit_price: item.unitPrice ?? 0,
        total_price: item.totalPrice ?? 0,
      }]);
    }
  }

  // ============================================================
  // 6. Migrate Expenses
  // ============================================================
  const expenses = data.expenses || [];
  for (const exp of expenses) {
    const expId = newId(exp.id);
    await supabase.from('expenses').insert([{
      id: expId,
      user_id: userId,
      category: exp.category,
      description: exp.description,
      amount: exp.amount ?? 0,
      date: exp.date || new Date().toISOString(),
      notes: exp.notes || null,
      created_at: exp.createdAt || new Date().toISOString(),
      updated_at: exp.updatedAt || new Date().toISOString(),
    }]);
  }

  // ============================================================
  // 7. Migrate Incomes
  // ============================================================
  const incomes = data.incomes || [];
  for (const inc of incomes) {
    const incId = newId(inc.id);
    await supabase.from('incomes').insert([{
      id: incId,
      user_id: userId,
      category: inc.category,
      description: inc.description,
      amount: inc.amount ?? 0,
      date: inc.date || new Date().toISOString(),
      notes: inc.notes || null,
      created_at: inc.createdAt || new Date().toISOString(),
      updated_at: inc.updatedAt || new Date().toISOString(),
    }]);
  }

  // ============================================================
  // 8. Migrate Swarm Box Rows → hive_rows + hives (type='swarm')
  // ============================================================
  const swarmBoxRows = data.swarmBoxRows || [];
  for (const sRow of swarmBoxRows) {
    // Find matching location by name
    let sLocId: string | null = null;
    if (sRow.location) {
      sLocId = locationNameToId.get(sRow.location.toLowerCase()) || null;
    }
    if (!sLocId && locations.length > 0) {
      sLocId = idMap.get(locations[0].id) || '';
    }
    if (!sLocId) continue;

    const sRowId = newId(sRow.id);
    const swarmBoxes = sRow.swarmBoxes || [];
    const sCapacity = sRow.capacity ?? (swarmBoxes.length > 0 ? Math.max(swarmBoxes.length, ...swarmBoxes.map((b: any) => b.number || 0)) : 10);

    const { error: sRowErr } = await supabase.from('hive_rows').insert([{
      id: sRowId,
      user_id: userId,
      location_id: sLocId,
      name: sRow.name || 'Rojevi',
      capacity: sCapacity,
      order: sRow.order ?? 99,
      created_at: sRow.createdAt || new Date().toISOString(),
      updated_at: sRow.updatedAt || new Date().toISOString(),
    }]);
    if (sRowErr) {
      console.error('Migration: swarm_box_row→hive_row insert error', sRowErr);
      continue;
    }

    for (const sBox of swarmBoxes) {
      const sBoxId = newId(sBox.id);
      await supabase.from('hives').insert([{
        id: sBoxId,
        user_id: userId,
        location_id: sLocId,
        row_id: sRowId,
        number: sBox.number,
        type: 'swarm',
        health: sBox.health === 'good' ? 'good' : 'warning',
        has_queen: null,
        queen_id: null,
        frame_count: null,
        is_harvested: false,
        has_pollen: false,
        is_active: sBox.isActive ?? true,
        swarm_status: sBox.status || 'empty',
        swarm_start_date: sBox.startDate || null,
        created_at: sBox.createdAt || new Date().toISOString(),
        updated_at: sBox.updatedAt || new Date().toISOString(),
      }]);
    }
  }

  console.log(`Migration complete: migrated ${locations.length} locations, ${queens.length} queens, ${queenBoxRows.length} queen box rows, ${swarmBoxRows.length} swarm box rows, ${sales.length} sales, ${expenses.length} expenses, ${incomes.length} incomes`);
}
