import {
  Location, HiveRow, Hive, HiveNote, HiveHealth,
  Queen, QueenBreed, QueenStatus,
  QueenBoxRow, QueenBox, QueenBoxHealth, QueenBoxStatus, QueenBoxLocation,
  Nuclei, NucleiStatus,
  Sale, SaleItem, SaleStatus, SaleItemType,
  Expense, ExpenseCategory,
  Income, IncomeCategory,
} from '../types';

// ============================================================
// Database row types (snake_case, matching Supabase columns)
// ============================================================

export interface DbLocation {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbHiveRow {
  id: string;
  user_id: string;
  location_id: string;
  name: string;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface DbHive {
  id: string;
  user_id: string;
  location_id: string;
  row_id: string;
  number: number;
  health: string;
  has_queen: boolean;
  queen_id: string | null;
  last_inspection: string | null;
  frame_count: number | null;
  is_harvested: boolean | null;
  has_pollen: boolean | null;
  is_active: boolean | null;
  last_feeding_date: string | null;
  last_harvest_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbHiveNote {
  id: string;
  user_id: string;
  hive_id: string;
  text: string;
  photos: string[] | null;
  created_at: string;
}

export interface DbHiveDateEntry {
  id: string;
  hive_id: string;
  user_id: string;
  date: string;
  created_at: string;
}

export interface DbQueen {
  id: string;
  user_id: string;
  name: string | null;
  breed: string;
  status: string;
  birth_date: string;
  color: string | null;
  marking_year: number | null;
  current_hive_id: string | null;
  mother_queen_id: string | null;
  productivity: number | null;
  temperament: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbQueenBoxRow {
  id: string;
  user_id: string;
  name: string;
  location: string;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface DbQueenBox {
  id: string;
  user_id: string;
  row_id: string;
  number: number;
  health: string;
  status: string;
  start_date: string | null;
  maturity_date: string | null;
  removal_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbNuclei {
  id: string;
  user_id: string;
  name: string;
  status: string;
  queen_id: string | null;
  frame_count: number;
  strength: number;
  created_date: string;
  ready_date: string | null;
  price: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbSale {
  id: string;
  user_id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  total_amount: number;
  status: string;
  sale_date: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbSaleItem {
  id: string;
  user_id: string;
  sale_id: string;
  type: string;
  item_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface DbExpense {
  id: string;
  user_id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbIncome {
  id: string;
  user_id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Helpers
// ============================================================

const toDate = (s: string | null | undefined): Date | undefined =>
  s ? new Date(s) : undefined;

const toDateRequired = (s: string): Date => new Date(s);

const toIso = (d: Date | undefined | null): string | null =>
  d ? d.toISOString() : null;

const toIsoRequired = (d: Date): string => d.toISOString();

// ============================================================
// Location mappers
// ============================================================

export function locationToDb(loc: Location, userId: string): Omit<DbLocation, 'created_at' | 'updated_at'> {
  return {
    id: loc.id,
    user_id: userId,
    name: loc.name,
    icon: loc.icon,
    description: loc.description || null,
  };
}

export function dbToLocation(db: DbLocation, rows: HiveRow[]): Location {
  return {
    id: db.id,
    name: db.name,
    icon: db.icon,
    description: db.description || undefined,
    rows,
    createdAt: toDateRequired(db.created_at),
    updatedAt: toDateRequired(db.updated_at),
  };
}

// ============================================================
// HiveRow mappers
// ============================================================

export function hiveRowToDb(row: HiveRow, userId: string): Omit<DbHiveRow, 'created_at' | 'updated_at'> {
  return {
    id: row.id,
    user_id: userId,
    location_id: row.locationId,
    name: row.name,
    order: row.order,
  };
}

export function dbToHiveRow(db: DbHiveRow, hives: Hive[]): HiveRow {
  return {
    id: db.id,
    name: db.name,
    locationId: db.location_id,
    hives,
    order: db.order,
    createdAt: toDateRequired(db.created_at),
    updatedAt: toDateRequired(db.updated_at),
  };
}

// ============================================================
// Hive mappers
// ============================================================

export function hiveToDb(hive: Hive, userId: string): Omit<DbHive, 'created_at' | 'updated_at'> {
  return {
    id: hive.id,
    user_id: userId,
    location_id: hive.locationId,
    row_id: hive.rowId,
    number: hive.number,
    health: hive.health,
    has_queen: hive.hasQueen,
    queen_id: hive.queenId || null,
    last_inspection: toIso(hive.lastInspection),
    frame_count: hive.frameCount ?? 10,
    is_harvested: hive.isHarvested ?? false,
    has_pollen: hive.hasPollen ?? false,
    is_active: (hive as any).isActive ?? true,
    last_feeding_date: toIso(hive.lastFeedingDate),
    last_harvest_date: toIso(hive.lastHarvestDate),
  };
}

export function dbToHive(
  db: DbHive,
  notes: HiveNote[],
  feedingDates: Date[],
  harvestDates: Date[],
): Hive {
  return {
    id: db.id,
    number: db.number,
    locationId: db.location_id,
    rowId: db.row_id,
    health: db.health as HiveHealth,
    hasQueen: db.has_queen,
    queenId: db.queen_id || undefined,
    lastInspection: toDate(db.last_inspection),
    notes: notes.length > 0 ? notes : undefined,
    frameCount: db.frame_count ?? 10,
    isHarvested: db.is_harvested ?? false,
    hasPollen: db.has_pollen ?? false,
    lastFeedingDate: feedingDates.length > 0 ? feedingDates[feedingDates.length - 1] : undefined,
    feedingDates: feedingDates.length > 0 ? feedingDates : undefined,
    lastHarvestDate: harvestDates.length > 0 ? harvestDates[harvestDates.length - 1] : undefined,
    harvestDates: harvestDates.length > 0 ? harvestDates : undefined,
    createdAt: toDateRequired(db.created_at),
    updatedAt: toDateRequired(db.updated_at),
  };
}

// ============================================================
// HiveNote mappers
// ============================================================

export function hiveNoteToDb(note: HiveNote, hiveId: string, userId: string): Omit<DbHiveNote, 'created_at'> {
  return {
    id: note.id,
    user_id: userId,
    hive_id: hiveId,
    text: note.text,
    photos: note.photos && note.photos.length > 0 ? note.photos : null,
  };
}

export function dbToHiveNote(db: DbHiveNote): HiveNote {
  return {
    id: db.id,
    text: db.text,
    photos: db.photos && db.photos.length > 0 ? db.photos : undefined,
    createdAt: toDateRequired(db.created_at),
  };
}

// ============================================================
// Queen mappers
// ============================================================

export function queenToDb(queen: Queen, userId: string): Omit<DbQueen, 'created_at' | 'updated_at'> {
  return {
    id: queen.id,
    user_id: userId,
    name: queen.name || null,
    breed: queen.breed,
    status: queen.status,
    birth_date: toIsoRequired(queen.birthDate),
    color: queen.color || null,
    marking_year: queen.markingYear ?? null,
    current_hive_id: queen.currentHiveId || null,
    mother_queen_id: queen.motherQueenId || null,
    productivity: queen.productivity ?? null,
    temperament: queen.temperament ?? null,
    notes: queen.notes || null,
  };
}

export function dbToQueen(db: DbQueen): Queen {
  return {
    id: db.id,
    name: db.name || undefined,
    breed: db.breed as QueenBreed,
    status: db.status as QueenStatus,
    birthDate: toDateRequired(db.birth_date),
    color: db.color || undefined,
    markingYear: db.marking_year ?? undefined,
    currentHiveId: db.current_hive_id || undefined,
    motherQueenId: db.mother_queen_id || undefined,
    productivity: db.productivity ?? undefined,
    temperament: db.temperament ?? undefined,
    notes: db.notes || undefined,
    createdAt: toDateRequired(db.created_at),
    updatedAt: toDateRequired(db.updated_at),
  };
}

// ============================================================
// QueenBoxRow mappers
// ============================================================

export function queenBoxRowToDb(row: QueenBoxRow, userId: string): Omit<DbQueenBoxRow, 'created_at' | 'updated_at'> {
  return {
    id: row.id,
    user_id: userId,
    name: row.name,
    location: row.location,
    order: row.order,
  };
}

export function dbToQueenBoxRow(db: DbQueenBoxRow, boxes: QueenBox[]): QueenBoxRow {
  return {
    id: db.id,
    name: db.name,
    location: db.location as QueenBoxLocation,
    queenBoxes: boxes,
    order: db.order,
    createdAt: toDateRequired(db.created_at),
    updatedAt: toDateRequired(db.updated_at),
  };
}

// ============================================================
// QueenBox mappers
// ============================================================

export function queenBoxToDb(box: QueenBox, userId: string): Omit<DbQueenBox, 'created_at' | 'updated_at'> {
  return {
    id: box.id,
    user_id: userId,
    row_id: box.rowId,
    number: box.number,
    health: box.health,
    status: box.status,
    start_date: toIso(box.startDate),
    maturity_date: toIso(box.maturityDate),
    removal_date: toIso(box.removalDate),
    notes: box.notes || null,
  };
}

export function dbToQueenBox(db: DbQueenBox): QueenBox {
  const startDate = toDate(db.start_date);
  const maturityDate = toDate(db.maturity_date);
  const removalDate = toDate(db.removal_date);

  // Compute derived fields
  let daysUntilMature: number | undefined;
  if (maturityDate && !removalDate) {
    const diff = maturityDate.getTime() - Date.now();
    daysUntilMature = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  let daysSinceRemoval: number | undefined;
  if (removalDate) {
    const diff = Date.now() - removalDate.getTime();
    daysSinceRemoval = Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  return {
    id: db.id,
    number: db.number,
    rowId: db.row_id,
    health: db.health as QueenBoxHealth,
    status: db.status as QueenBoxStatus,
    startDate,
    maturityDate,
    removalDate,
    daysUntilMature,
    daysSinceRemoval,
    notes: db.notes || undefined,
    createdAt: toDateRequired(db.created_at),
    updatedAt: toDateRequired(db.updated_at),
  };
}

// ============================================================
// Nuclei mappers
// ============================================================

export function nucleiToDb(n: Nuclei, userId: string): Omit<DbNuclei, 'created_at' | 'updated_at'> {
  return {
    id: n.id,
    user_id: userId,
    name: n.name,
    status: n.status,
    queen_id: n.queenId || null,
    frame_count: n.frameCount,
    strength: n.strength,
    created_date: toIsoRequired(n.createdDate),
    ready_date: toIso(n.readyDate),
    price: n.price ?? null,
    notes: n.notes || null,
  };
}

export function dbToNuclei(db: DbNuclei): Nuclei {
  return {
    id: db.id,
    name: db.name,
    status: db.status as NucleiStatus,
    queenId: db.queen_id || undefined,
    frameCount: db.frame_count,
    strength: db.strength,
    createdDate: toDateRequired(db.created_date),
    readyDate: toDate(db.ready_date),
    price: db.price ?? undefined,
    notes: db.notes || undefined,
    createdAt: toDateRequired(db.created_at),
    updatedAt: toDateRequired(db.updated_at),
  };
}

// ============================================================
// Sale mappers
// ============================================================

export function saleToDb(sale: Sale, userId: string): Omit<DbSale, 'created_at' | 'updated_at'> {
  return {
    id: sale.id,
    user_id: userId,
    customer_name: sale.customerName,
    customer_phone: sale.customerPhone || null,
    customer_email: sale.customerEmail || null,
    total_amount: sale.totalAmount,
    status: sale.status,
    sale_date: toIsoRequired(sale.saleDate),
    payment_method: sale.paymentMethod || null,
    notes: sale.notes || null,
  };
}

export function dbToSale(db: DbSale, items: SaleItem[]): Sale {
  return {
    id: db.id,
    customerName: db.customer_name,
    customerPhone: db.customer_phone || undefined,
    customerEmail: db.customer_email || undefined,
    items,
    totalAmount: db.total_amount,
    status: db.status as SaleStatus,
    saleDate: toDateRequired(db.sale_date),
    paymentMethod: db.payment_method || undefined,
    notes: db.notes || undefined,
    createdAt: toDateRequired(db.created_at),
    updatedAt: toDateRequired(db.updated_at),
  };
}

export function saleItemToDb(item: SaleItem, saleId: string, userId: string): Omit<DbSaleItem, 'created_at'> {
  return {
    id: item.id,
    user_id: userId,
    sale_id: saleId,
    type: item.type,
    item_id: item.itemId || null,
    item_name: item.itemName,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.totalPrice,
  };
}

export function dbToSaleItem(db: DbSaleItem): SaleItem {
  return {
    id: db.id,
    type: db.type as SaleItemType,
    itemId: db.item_id || undefined,
    itemName: db.item_name,
    quantity: db.quantity,
    unitPrice: db.unit_price,
    totalPrice: db.total_price,
  };
}

// ============================================================
// Expense mappers
// ============================================================

export function expenseToDb(exp: Expense, userId: string): Omit<DbExpense, 'created_at' | 'updated_at'> {
  return {
    id: exp.id,
    user_id: userId,
    category: exp.category,
    description: exp.description,
    amount: exp.amount,
    date: toIsoRequired(exp.date),
    notes: exp.notes || null,
  };
}

export function dbToExpense(db: DbExpense): Expense {
  return {
    id: db.id,
    category: db.category as ExpenseCategory,
    description: db.description,
    amount: db.amount,
    date: toDateRequired(db.date),
    notes: db.notes || undefined,
    createdAt: toDateRequired(db.created_at),
    updatedAt: toDateRequired(db.updated_at),
  };
}

// ============================================================
// Income mappers
// ============================================================

export function incomeToDb(inc: Income, userId: string): Omit<DbIncome, 'created_at' | 'updated_at'> {
  return {
    id: inc.id,
    user_id: userId,
    category: inc.category,
    description: inc.description,
    amount: inc.amount,
    date: toIsoRequired(inc.date),
    notes: inc.notes || null,
  };
}

export function dbToIncome(db: DbIncome): Income {
  return {
    id: db.id,
    category: db.category as IncomeCategory,
    description: db.description,
    amount: db.amount,
    date: toDateRequired(db.date),
    notes: db.notes || undefined,
    createdAt: toDateRequired(db.created_at),
    updatedAt: toDateRequired(db.updated_at),
  };
}

// ============================================================
// Utility: groupBy helper
// ============================================================

export function groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const k = String(item[key]);
    if (!result[k]) result[k] = [];
    result[k].push(item);
  }
  return result;
}
