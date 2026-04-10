// Product-related types (Supabase)
export interface Product {
  id: number;
  product_name: string;
  desc: string;
  image: string;
  alt: string;
  type: string;
}

export interface ProductPriceOption {
  id: number;
  product_id: number;
  size: string;
  price: string;
  stock: number;
}

export interface ProductWithOptions extends Product {
  price_options: ProductPriceOption[];
}

// Order-related types (Supabase)
export interface Order {
  id: number;
  created_at: string;
  name: string;
  lastname: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  sent: boolean;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_price_option: number;
  quantity: number;
  created_at: string;
  // Joined data
  product?: Product;
  price_option?: ProductPriceOption;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
  total: number;
}

// Hive-related types
export type HiveHealth = "good" | "bad" | "warning";
export type HiveType = "hive" | "swarm";
export type SwarmStatus = "empty" | "developing" | "ready";

export interface HiveNote {
  id: string;
  text: string;
  photos?: string[];
  createdAt: Date;
}

export interface Hive {
  id: string;
  number: number;
  locationId: string;
  rowId: string;
  type: HiveType;
  health: HiveHealth;
  // Hive-specific fields (unused when type="swarm")
  hasQueen?: boolean;
  queenId?: string;
  lastInspection?: Date;
  notes?: HiveNote[];
  frameCount?: number;
  isHarvested?: boolean;
  hasPollen?: boolean;
  lastFeedingDate?: Date;
  feedingDates?: Date[];
  lastHarvestDate?: Date;
  harvestDates?: Date[];
  isActive?: boolean;
  // Swarm-specific fields (unused when type="hive")
  swarmStatus?: SwarmStatus;
  swarmStartDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface HiveRow {
  id: string;
  name: string;
  locationId: string;
  capacity: number;
  hives: Hive[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Location {
  id: string;
  name: string;
  icon: string;
  rows: HiveRow[];
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Queen-related types
export type QueenStatus = "mature" | "developing" | "mated" | "laying" | "retired";
export type QueenBreed = "carniolan" | "italian" | "buckfast" | "caucasian" | "hybrid";

export interface Queen {
  id: string;
  name?: string;
  breed: QueenBreed;
  status: QueenStatus;
  birthDate: Date;
  color?: string;
  markingYear?: number;
  currentHiveId?: string;
  motherQueenId?: string;
  productivity?: number;
  temperament?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Queen Box types for queen production tracking
export type QueenBoxHealth = "excellent" | "good" | "warning" | "critical";
export type QueenBoxStatus = "empty" | "developing" | "mature" | "removed";

export interface QueenBox {
  id: string;
  number: number;
  rowId: string;
  health: QueenBoxHealth;
  status: QueenBoxStatus;
  startDate?: Date;           // When queen cell was placed/started
  maturityDate?: Date;        // Calculated: startDate + 21 days
  removalDate?: Date;         // When queen was removed from box
  daysUntilMature?: number;   // Calculated field
  daysSinceRemoval?: number;  // Calculated field for 21-day counter after removal
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QueenBoxRow {
  id: string;
  name: string;
  locationId: string;
  capacity: number;
  queenBoxes: QueenBox[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// Sale-related types
export type SaleStatus = "pending" | "completed" | "cancelled";
export type SaleItemType = "nuclei" | "queen" | "honey" | "wax" | "other";

export interface SaleItem {
  id: string;
  type: SaleItemType;
  itemId?: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Sale {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  items: SaleItem[];
  totalAmount: number;
  status: SaleStatus;
  saleDate: Date;
  paymentMethod?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Finance-related types
export type ExpenseCategory =
  | "equipment"      // Oprema
  | "feed"          // Hrana za pčele
  | "medication"    // Lekovi
  | "maintenance"   // Održavanje
  | "transportation" // Transport
  | "packaging"     // Pakovanje
  | "other";        // Ostalo

export type IncomeCategory =
  | "honey-sale"     // Prodaja meda
  | "nucleus-sale"   // Prodaja rojeva
  | "queen-sale"     // Prodaja matica
  | "hive-sale"      // Prodaja košnica
  | "wax-sale"       // Prodaja voska
  | "pollination"    // Usluge oprašivanja
  | "other";         // Ostalo

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Income {
  id: string;
  category: IncomeCategory;
  description: string;
  amount: number;
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  expensesByCategory: Record<ExpenseCategory, number>;
  incomeByCategory: Record<IncomeCategory, number>;
}

// Note type (bilješke)
export interface Note {
  id: string;
  title: string;
  content: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Dashboard metrics
export interface DashboardMetrics {
  totalHives: number;
  matureQueens: number;
  totalNuclei: number;
  nucleiForSale: number;
  totalLocations: number;
  healthyHives: number;
  hivesNeedingAttention: number;
  totalSalesThisMonth: number;
}

// Allowed email type (Supabase)
export interface AllowedEmail {
  id: number;
  email: string;
  created_at: string;
}

// App state
export interface AppState {
  locations: Location[];
  queens: Queen[];
  queenBoxRows: QueenBoxRow[];
  sales: Sale[];
  expenses: Expense[];
  incomes: Income[];
  notes: Note[];
  lastUpdated: Date;
}
