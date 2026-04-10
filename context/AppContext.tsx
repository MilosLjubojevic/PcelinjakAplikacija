import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Location, Queen, QueenBoxRow, Sale, Expense, Income, Note, DashboardMetrics } from '../types';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { isSupabaseConfigured, supabase } from '../utils/supabase';
import * as db from '../services/supabaseService';
import { migrateLocalToSupabase } from '../utils/dataMigration';

interface AppContextType {
  state: AppState;
  loading: boolean;
  error: string | null;
  metrics: DashboardMetrics;
  addLocation: (location: Location) => Promise<void>;
  updateLocation: (id: string, location: Partial<Location>) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  addQueen: (queen: Queen) => Promise<void>;
  updateQueen: (id: string, queen: Partial<Queen>) => Promise<void>;
  deleteQueen: (id: string) => Promise<void>;
  addQueenBoxRow: (row: QueenBoxRow) => Promise<void>;
  updateQueenBoxRow: (id: string, row: Partial<QueenBoxRow>) => Promise<void>;
  deleteQueenBoxRow: (id: string) => Promise<void>;
  addSale: (sale: Sale) => Promise<void>;
  updateSale: (id: string, sale: Partial<Sale>) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addIncome: (income: Income) => Promise<void>;
  updateIncome: (id: string, income: Partial<Income>) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  addNote: (note: Note) => Promise<void>;
  updateNote: (id: string, note: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  refreshData: () => void;
  clearAllData: () => Promise<void>;
  exportData: () => Promise<string>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const MIGRATION_KEY = '@pcelinjak_migrated';
const STORAGE_KEY = '@pcelinjak_data';

const emptyState: AppState = {
  locations: [],
  queens: [],
  queenBoxRows: [],
  sales: [],
  expenses: [],
  incomes: [],
  notes: [],
  lastUpdated: new Date(),
};

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const { showToast } = useToast();

  const [state, setState] = useState<AppState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = React.useRef(false);

  // Load data from Supabase on mount (or when user changes)
  useEffect(() => {
    if (userId) {
      loadData(userId);
    }
  }, [userId]);

  const loadData = async (uid: string) => {
    // Prevent concurrent loads (React strict mode / double mount)
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      setLoading(true);
      setError(null);

      if (!isSupabaseConfigured()) {
        setError('Supabase nije konfigurisan');
        setLoading(false);
        return;
      }

      // Check if one-time migration from AsyncStorage is needed
      const migrated = await AsyncStorage.getItem(MIGRATION_KEY);
      if (!migrated) {
        const oldData = await AsyncStorage.getItem(STORAGE_KEY);
        if (oldData) {
          try {
            await migrateLocalToSupabase(oldData, uid);
            await AsyncStorage.setItem(MIGRATION_KEY, 'true');
          } catch (migrationError) {
            console.error('Migration error (continuing with Supabase fetch):', migrationError);
            // Still continue to fetch — data might already exist in Supabase
          }
        } else {
          // No old data to migrate, mark as done
          await AsyncStorage.setItem(MIGRATION_KEY, 'true');
        }
      }

      // Fetch all data from Supabase in parallel
      const [locations, queens, queenBoxRows, salesList, expensesList, incomesList, notesList] =
        await Promise.all([
          db.fetchAllLocations(uid),
          db.fetchAllQueens(uid),
          db.fetchAllQueenBoxRows(uid),
          db.fetchAllSales(uid),
          db.fetchAllExpenses(uid),
          db.fetchAllIncomes(uid),
          db.fetchAllNotes(uid),
        ]);

      setState({
        locations,
        queens,
        queenBoxRows,
        sales: salesList,
        expenses: expensesList,
        incomes: incomesList,
        notes: notesList,
        lastUpdated: new Date(),
      });
    } catch (e: any) {
      console.error('Error loading data:', e);
      setError(e.message || 'Greška pri učitavanju podataka');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  // Subscribe to Supabase Realtime for multi-device sync
  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const channel = supabase
      .channel('app-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        () => {
          // Debounce: wait 500ms after the last change before refreshing
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            loadingRef.current = false;
            loadData(userId);
          }, 500);
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Memoized metrics calculation
  const metrics = useMemo<DashboardMetrics>(() => {
    const allItems = state.locations.flatMap(loc => loc.rows.flatMap(row => row.hives));
    const hiveItems = allItems.filter(h => h.type === 'hive');
    const swarmItems = allItems.filter(h => h.type === 'swarm');

    const totalHives = hiveItems.length;
    const healthyHives = hiveItems.filter(h => h.health === 'good').length;
    const hivesNeedingAttention = hiveItems.filter(h => h.health === 'bad').length;

    const matureQueens = state.queens.filter(
      q => q.status === 'mature' || q.status === 'laying'
    ).length;

    const totalNuclei = swarmItems.length;
    const nucleiForSale = swarmItems.filter(s => s.swarmStatus === 'ready').length;
    const totalLocations = state.locations.length;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const totalSalesThisMonth = state.sales
      .filter(s => {
        const saleDate = new Date(s.saleDate);
        return s.status === 'completed' && saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
      })
      .reduce((sum, sale) => sum + sale.totalAmount, 0);

    return {
      totalHives,
      matureQueens,
      totalNuclei,
      nucleiForSale,
      totalLocations,
      healthyHives,
      hivesNeedingAttention,
      totalSalesThisMonth,
    };
  }, [state.locations, state.queens, state.sales]);

  // Generic local state updater
  const updateState = useCallback((updater: (prev: AppState) => AppState) => {
    setState(prev => ({
      ...updater(prev),
      lastUpdated: new Date(),
    }));
  }, []);

  // ============================================================
  // LOCATION operations
  // ============================================================

  const addLocation = useCallback(async (location: Location) => {
    if (!userId) return;
    updateState(prev => ({ ...prev, locations: [...prev.locations, location] }));
    const success = await db.insertLocation(userId, location);
    if (!success) {
      updateState(prev => ({ ...prev, locations: prev.locations.filter(l => l.id !== location.id) }));
      showToast('Greška pri dodavanju lokacije', 'error');
      return;
    }
    showToast('Lokacija dodana');
  }, [updateState, userId, showToast]);

  const updateLocation = useCallback(async (id: string, updates: Partial<Location>) => {
    if (!userId) return;

    const currentLocation = state.locations.find(loc => loc.id === id);
    if (!currentLocation) return;

    // Optimistic update first
    const snapshot = state.locations;
    updateState(prev => ({
      ...prev,
      locations: prev.locations.map(loc =>
        loc.id === id ? { ...loc, ...updates, updatedAt: new Date() } : loc
      ),
    }));

    const dbOps: Promise<boolean>[] = [];

    if (updates.rows) {
      dbOps.push(db.syncLocationChildren(userId, id, currentLocation.rows, updates.rows));
    }

    const scalarUpdates: Partial<Location> = {};
    if (updates.name !== undefined) scalarUpdates.name = updates.name;
    if (updates.icon !== undefined) scalarUpdates.icon = updates.icon;
    if (updates.description !== undefined) scalarUpdates.description = updates.description;

    if (Object.keys(scalarUpdates).length > 0) {
      dbOps.push(db.updateLocationScalars(userId, id, scalarUpdates));
    }

    const results = await Promise.all(dbOps);
    if (results.some(ok => !ok)) {
      updateState(prev => ({ ...prev, locations: snapshot }));
      showToast('Greška pri ažuriranju lokacije', 'error');
    }
  }, [updateState, userId, state.locations, showToast]);

  const deleteLocation = useCallback(async (id: string) => {
    if (!userId) return;
    const snapshot = state.locations;
    updateState(prev => ({ ...prev, locations: prev.locations.filter(loc => loc.id !== id) }));
    const success = await db.deleteLocation(userId, id);
    if (!success) {
      updateState(prev => ({ ...prev, locations: snapshot }));
      showToast('Greška pri brisanju lokacije', 'error');
      return;
    }
    showToast('Lokacija obrisana');
  }, [updateState, userId, state.locations, showToast]);

  // ============================================================
  // QUEEN operations
  // ============================================================

  const addQueen = useCallback(async (queen: Queen) => {
    if (!userId) return;
    updateState(prev => ({ ...prev, queens: [...prev.queens, queen] }));
    const success = await db.insertQueen(userId, queen);
    if (!success) {
      updateState(prev => ({ ...prev, queens: prev.queens.filter(q => q.id !== queen.id) }));
      showToast('Greška pri dodavanju matice', 'error');
      return;
    }
    showToast('Matica dodana');
  }, [updateState, userId, showToast]);

  const updateQueen = useCallback(async (id: string, updates: Partial<Queen>) => {
    if (!userId) return;
    const snapshot = state.queens;
    updateState(prev => ({
      ...prev,
      queens: prev.queens.map(queen =>
        queen.id === id ? { ...queen, ...updates, updatedAt: new Date() } : queen
      ),
    }));
    const success = await db.updateQueen(userId, id, updates);
    if (!success) {
      updateState(prev => ({ ...prev, queens: snapshot }));
      showToast('Greška pri ažuriranju matice', 'error');
    }
  }, [updateState, userId, state.queens, showToast]);

  const deleteQueen = useCallback(async (id: string) => {
    if (!userId) return;
    const snapshot = state.queens;
    updateState(prev => ({ ...prev, queens: prev.queens.filter(queen => queen.id !== id) }));
    const success = await db.deleteQueen(userId, id);
    if (!success) {
      updateState(prev => ({ ...prev, queens: snapshot }));
      showToast('Greška pri brisanju matice', 'error');
      return;
    }
    showToast('Matica obrisana');
  }, [updateState, userId, state.queens, showToast]);

  // ============================================================
  // QUEEN BOX ROW operations
  // ============================================================

  const addQueenBoxRow = useCallback(async (row: QueenBoxRow) => {
    if (!userId) return;
    updateState(prev => ({ ...prev, queenBoxRows: [...(prev.queenBoxRows || []), row] }));
    const success = await db.insertQueenBoxRow(userId, row);
    if (!success) {
      updateState(prev => ({ ...prev, queenBoxRows: (prev.queenBoxRows || []).filter(r => r.id !== row.id) }));
      showToast('Greška pri dodavanju reda', 'error');
      return;
    }
    showToast('Red dodan');
  }, [updateState, userId, showToast]);

  const updateQueenBoxRow = useCallback(async (id: string, updates: Partial<QueenBoxRow>) => {
    if (!userId) return;

    const currentRow = (state.queenBoxRows || []).find(r => r.id === id);
    if (!currentRow) return;

    const snapshot = state.queenBoxRows || [];
    updateState(prev => ({
      ...prev,
      queenBoxRows: (prev.queenBoxRows || []).map(row =>
        row.id === id ? { ...row, ...updates, updatedAt: new Date() } : row
      ),
    }));

    const dbOps: Promise<boolean>[] = [];

    if (updates.queenBoxes) {
      dbOps.push(db.syncQueenBoxRowChildren(userId, id, currentRow.queenBoxes, updates.queenBoxes));
    }

    const scalarUpdates: Partial<QueenBoxRow> = {};
    if (updates.name !== undefined) scalarUpdates.name = updates.name;
    if (updates.locationId !== undefined) scalarUpdates.locationId = updates.locationId;
    if (updates.capacity !== undefined) scalarUpdates.capacity = updates.capacity;
    if (updates.order !== undefined) scalarUpdates.order = updates.order;

    if (Object.keys(scalarUpdates).length > 0) {
      dbOps.push(db.updateQueenBoxRowScalars(userId, id, scalarUpdates));
    }

    const results = await Promise.all(dbOps);
    if (results.some(ok => !ok)) {
      updateState(prev => ({ ...prev, queenBoxRows: snapshot }));
      showToast('Greška pri ažuriranju reda', 'error');
    }
  }, [updateState, userId, state.queenBoxRows, showToast]);

  const deleteQueenBoxRow = useCallback(async (id: string) => {
    if (!userId) return;
    const snapshot = state.queenBoxRows || [];
    updateState(prev => ({ ...prev, queenBoxRows: (prev.queenBoxRows || []).filter(row => row.id !== id) }));
    const success = await db.deleteQueenBoxRow(userId, id);
    if (!success) {
      updateState(prev => ({ ...prev, queenBoxRows: snapshot }));
      showToast('Greška pri brisanju reda', 'error');
      return;
    }
    showToast('Red obrisan');
  }, [updateState, userId, state.queenBoxRows, showToast]);

  // ============================================================
  // SALE operations
  // ============================================================

  const addSale = useCallback(async (sale: Sale) => {
    if (!userId) return;
    updateState(prev => ({ ...prev, sales: [...prev.sales, sale] }));
    const success = await db.insertSale(userId, sale);
    if (!success) {
      updateState(prev => ({ ...prev, sales: prev.sales.filter(s => s.id !== sale.id) }));
      showToast('Greška pri dodavanju prodaje', 'error');
      return;
    }
    showToast('Prodaja dodana');
  }, [updateState, userId, showToast]);

  const updateSale = useCallback(async (id: string, updates: Partial<Sale>) => {
    if (!userId) return;
    const snapshot = state.sales;
    updateState(prev => ({
      ...prev,
      sales: prev.sales.map(sale =>
        sale.id === id ? { ...sale, ...updates, updatedAt: new Date() } : sale
      ),
    }));
    const success = await db.updateSale(userId, id, updates);
    if (!success) {
      updateState(prev => ({ ...prev, sales: snapshot }));
      showToast('Greška pri ažuriranju prodaje', 'error');
    }
  }, [updateState, userId, state.sales, showToast]);

  const deleteSale = useCallback(async (id: string) => {
    if (!userId) return;
    const snapshot = state.sales;
    updateState(prev => ({ ...prev, sales: prev.sales.filter(sale => sale.id !== id) }));
    const success = await db.deleteSale(userId, id);
    if (!success) {
      updateState(prev => ({ ...prev, sales: snapshot }));
      showToast('Greška pri brisanju prodaje', 'error');
      return;
    }
    showToast('Prodaja obrisana');
  }, [updateState, userId, state.sales, showToast]);

  // ============================================================
  // EXPENSE operations
  // ============================================================

  const addExpense = useCallback(async (expense: Expense) => {
    if (!userId) return;
    updateState(prev => ({ ...prev, expenses: [...prev.expenses, expense] }));
    const success = await db.insertExpense(userId, expense);
    if (!success) {
      updateState(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== expense.id) }));
      showToast('Greška pri dodavanju troška', 'error');
      return;
    }
    showToast('Trosak dodan');
  }, [updateState, userId, showToast]);

  const updateExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
    if (!userId) return;
    const snapshot = state.expenses;
    updateState(prev => ({
      ...prev,
      expenses: prev.expenses.map(expense =>
        expense.id === id ? { ...expense, ...updates, updatedAt: new Date() } : expense
      ),
    }));
    const success = await db.updateExpense(userId, id, updates);
    if (!success) {
      updateState(prev => ({ ...prev, expenses: snapshot }));
      showToast('Greška pri ažuriranju troška', 'error');
    }
  }, [updateState, userId, state.expenses, showToast]);

  const deleteExpense = useCallback(async (id: string) => {
    if (!userId) return;
    const snapshot = state.expenses;
    updateState(prev => ({ ...prev, expenses: prev.expenses.filter(expense => expense.id !== id) }));
    const success = await db.deleteExpense(userId, id);
    if (!success) {
      updateState(prev => ({ ...prev, expenses: snapshot }));
      showToast('Greška pri brisanju troška', 'error');
      return;
    }
    showToast('Trosak obrisan');
  }, [updateState, userId, state.expenses, showToast]);

  // ============================================================
  // INCOME operations
  // ============================================================

  const addIncome = useCallback(async (income: Income) => {
    if (!userId) return;
    updateState(prev => ({ ...prev, incomes: [...(prev.incomes || []), income] }));
    const success = await db.insertIncome(userId, income);
    if (!success) {
      updateState(prev => ({ ...prev, incomes: (prev.incomes || []).filter(i => i.id !== income.id) }));
      showToast('Greška pri dodavanju prihoda', 'error');
      return;
    }
    showToast('Prihod dodan');
  }, [updateState, userId, showToast]);

  const updateIncome = useCallback(async (id: string, updates: Partial<Income>) => {
    if (!userId) return;
    const snapshot = state.incomes;
    updateState(prev => ({
      ...prev,
      incomes: (prev.incomes || []).map(income =>
        income.id === id ? { ...income, ...updates, updatedAt: new Date() } : income
      ),
    }));
    const success = await db.updateIncome(userId, id, updates);
    if (!success) {
      updateState(prev => ({ ...prev, incomes: snapshot }));
      showToast('Greška pri ažuriranju prihoda', 'error');
    }
  }, [updateState, userId, state.incomes, showToast]);

  const deleteIncome = useCallback(async (id: string) => {
    if (!userId) return;
    const snapshot = state.incomes;
    updateState(prev => ({ ...prev, incomes: (prev.incomes || []).filter(income => income.id !== id) }));
    const success = await db.deleteIncome(userId, id);
    if (!success) {
      updateState(prev => ({ ...prev, incomes: snapshot }));
      showToast('Greška pri brisanju prihoda', 'error');
      return;
    }
    showToast('Prihod obrisan');
  }, [updateState, userId, state.incomes, showToast]);

  // ============================================================
  // NOTE operations (bilješke)
  // ============================================================

  const addNote = useCallback(async (note: Note) => {
    if (!userId) return;
    updateState(prev => ({ ...prev, notes: [...(prev.notes || []), note] }));
    const success = await db.insertNote(userId, note);
    if (!success) {
      updateState(prev => ({ ...prev, notes: (prev.notes || []).filter(n => n.id !== note.id) }));
      showToast('Greška pri dodavanju bilješke', 'error');
      return;
    }
    showToast('Bilješka dodana');
  }, [updateState, userId, showToast]);

  const updateNote = useCallback(async (id: string, updates: Partial<Note>) => {
    if (!userId) return;
    const snapshot = state.notes || [];
    updateState(prev => ({
      ...prev,
      notes: (prev.notes || []).map(note =>
        note.id === id ? { ...note, ...updates, updatedAt: new Date() } : note
      ),
    }));
    const success = await db.updateNote(userId, id, updates);
    if (!success) {
      updateState(prev => ({ ...prev, notes: snapshot }));
      showToast('Greška pri ažuriranju bilješke', 'error');
    }
  }, [updateState, userId, state.notes, showToast]);

  const deleteNote = useCallback(async (id: string) => {
    if (!userId) return;
    const snapshot = state.notes || [];
    updateState(prev => ({ ...prev, notes: (prev.notes || []).filter(note => note.id !== id) }));
    const success = await db.deleteNote(userId, id);
    if (!success) {
      updateState(prev => ({ ...prev, notes: snapshot }));
      showToast('Greška pri brisanju bilješke', 'error');
      return;
    }
    showToast('Bilješka obrisana');
  }, [updateState, userId, state.notes, showToast]);

  // ============================================================
  // UTILITY operations
  // ============================================================

  const refreshData = useCallback(() => {
    if (userId) {
      loadingRef.current = false; // Allow reload even if a previous load is in progress
      loadData(userId);
    }
  }, [userId]);

  const clearAllData = useCallback(async () => {
    if (!userId) return;
    try {
      await db.deleteAllUserData(userId);
      setState(emptyState);
    } catch (e) {
      console.error('Error clearing data:', e);
      setError('Greška pri brisanju podataka');
    }
  }, [userId]);

  const exportData = useCallback(async (): Promise<string> => {
    return JSON.stringify(state, null, 2);
  }, [state]);

  const value: AppContextType = {
    state,
    loading,
    error,
    metrics,
    addLocation, updateLocation, deleteLocation,
    addQueen, updateQueen, deleteQueen,
    addQueenBoxRow, updateQueenBoxRow, deleteQueenBoxRow,
    addSale, updateSale, deleteSale,
    addExpense, updateExpense, deleteExpense,
    addIncome, updateIncome, deleteIncome,
    addNote, updateNote, deleteNote,
    refreshData, clearAllData, exportData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
