import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Location, Queen, QueenBoxRow, Nuclei, Sale, Expense, Income, DashboardMetrics } from '../types';
import { useAuth } from './AuthContext';
import { isSupabaseConfigured } from '../utils/supabase';
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
  addNuclei: (nuclei: Nuclei) => Promise<void>;
  updateNuclei: (id: string, nuclei: Partial<Nuclei>) => Promise<void>;
  deleteNuclei: (id: string) => Promise<void>;
  addSale: (sale: Sale) => Promise<void>;
  updateSale: (id: string, sale: Partial<Sale>) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addIncome: (income: Income) => Promise<void>;
  updateIncome: (id: string, income: Partial<Income>) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  refreshMetrics: () => void;
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
  nuclei: [],
  sales: [],
  expenses: [],
  incomes: [],
  lastUpdated: new Date(),
};

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;

  const [state, setState] = useState<AppState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data from Supabase on mount (or when user changes)
  useEffect(() => {
    if (userId) {
      loadData(userId);
    }
  }, [userId]);

  const loadData = async (uid: string) => {
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
      const [locations, queens, queenBoxRows, nucleiList, salesList, expensesList, incomesList] =
        await Promise.all([
          db.fetchAllLocations(uid),
          db.fetchAllQueens(uid),
          db.fetchAllQueenBoxRows(uid),
          db.fetchAllNuclei(uid),
          db.fetchAllSales(uid),
          db.fetchAllExpenses(uid),
          db.fetchAllIncomes(uid),
        ]);

      setState({
        locations,
        queens,
        queenBoxRows,
        nuclei: nucleiList,
        sales: salesList,
        expenses: expensesList,
        incomes: incomesList,
        lastUpdated: new Date(),
      });
    } catch (e: any) {
      console.error('Error loading data:', e);
      setError(e.message || 'Greska pri ucitavanju podataka');
    } finally {
      setLoading(false);
    }
  };

  // Memoized metrics calculation
  const metrics = useMemo<DashboardMetrics>(() => {
    const totalHives = state.locations.reduce(
      (sum, loc) => sum + loc.rows.reduce((rowSum, row) => rowSum + row.hives.length, 0),
      0
    );

    const matureQueens = state.queens.filter(
      q => q.status === 'mature' || q.status === 'laying'
    ).length;

    const totalNuclei = state.nuclei.length;
    const nucleiForSale = state.nuclei.filter(n => n.status === 'for-sale').length;
    const totalLocations = state.locations.length;

    const allHives = state.locations.flatMap(loc => loc.rows.flatMap(row => row.hives));
    const healthyHives = allHives.filter(h => h.health === 'good').length;
    const hivesNeedingAttention = allHives.filter(h => h.health === 'bad').length;

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
  }, [state.locations, state.queens, state.nuclei, state.sales]);

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
    const success = await db.insertLocation(userId, location);
    if (!success) {
      setError('Greska pri dodavanju lokacije');
      return;
    }
    updateState(prev => ({ ...prev, locations: [...prev.locations, location] }));
  }, [updateState, userId]);

  const updateLocation = useCallback(async (id: string, updates: Partial<Location>) => {
    if (!userId) return;

    // Find the current location for diffing
    const currentLocation = state.locations.find(loc => loc.id === id);
    if (!currentLocation) return;

    // If rows changed, use diff-based sync
    if (updates.rows) {
      const success = await db.syncLocationChildren(userId, id, currentLocation.rows, updates.rows);
      if (!success) {
        setError('Greska pri azuriranju lokacije');
        return;
      }
    }

    // Update scalar fields if any (name, icon, description)
    const scalarUpdates: Partial<Location> = {};
    if (updates.name !== undefined) scalarUpdates.name = updates.name;
    if (updates.icon !== undefined) scalarUpdates.icon = updates.icon;
    if (updates.description !== undefined) scalarUpdates.description = updates.description;

    if (Object.keys(scalarUpdates).length > 0) {
      const success = await db.updateLocationScalars(userId, id, scalarUpdates);
      if (!success) {
        setError('Greska pri azuriranju lokacije');
        return;
      }
    }

    // Optimistic local state update
    updateState(prev => ({
      ...prev,
      locations: prev.locations.map(loc =>
        loc.id === id ? { ...loc, ...updates, updatedAt: new Date() } : loc
      ),
    }));
  }, [updateState, userId, state.locations]);

  const deleteLocation = useCallback(async (id: string) => {
    if (!userId) return;
    const success = await db.deleteLocation(userId, id);
    if (!success) {
      setError('Greska pri brisanju lokacije');
      return;
    }
    updateState(prev => ({
      ...prev,
      locations: prev.locations.filter(loc => loc.id !== id),
    }));
  }, [updateState, userId]);

  // ============================================================
  // QUEEN operations
  // ============================================================

  const addQueen = useCallback(async (queen: Queen) => {
    if (!userId) return;
    const success = await db.insertQueen(userId, queen);
    if (!success) {
      setError('Greska pri dodavanju matice');
      return;
    }
    updateState(prev => ({ ...prev, queens: [...prev.queens, queen] }));
  }, [updateState, userId]);

  const updateQueen = useCallback(async (id: string, updates: Partial<Queen>) => {
    if (!userId) return;
    const success = await db.updateQueen(userId, id, updates);
    if (!success) {
      setError('Greska pri azuriranju matice');
      return;
    }
    updateState(prev => ({
      ...prev,
      queens: prev.queens.map(queen =>
        queen.id === id ? { ...queen, ...updates, updatedAt: new Date() } : queen
      ),
    }));
  }, [updateState, userId]);

  const deleteQueen = useCallback(async (id: string) => {
    if (!userId) return;
    const success = await db.deleteQueen(userId, id);
    if (!success) {
      setError('Greska pri brisanju matice');
      return;
    }
    updateState(prev => ({
      ...prev,
      queens: prev.queens.filter(queen => queen.id !== id),
    }));
  }, [updateState, userId]);

  // ============================================================
  // QUEEN BOX ROW operations
  // ============================================================

  const addQueenBoxRow = useCallback(async (row: QueenBoxRow) => {
    if (!userId) return;
    const success = await db.insertQueenBoxRow(userId, row);
    if (!success) {
      setError('Greska pri dodavanju reda');
      return;
    }
    updateState(prev => ({
      ...prev,
      queenBoxRows: [...(prev.queenBoxRows || []), row],
    }));
  }, [updateState, userId]);

  const updateQueenBoxRow = useCallback(async (id: string, updates: Partial<QueenBoxRow>) => {
    if (!userId) return;

    // Find current row for diffing boxes
    const currentRow = (state.queenBoxRows || []).find(r => r.id === id);
    if (!currentRow) return;

    // If queenBoxes changed, use diff-based sync
    if (updates.queenBoxes) {
      const success = await db.syncQueenBoxRowChildren(userId, id, currentRow.queenBoxes, updates.queenBoxes);
      if (!success) {
        setError('Greska pri azuriranju reda');
        return;
      }
    }

    // Update scalar fields
    const scalarUpdates: Partial<QueenBoxRow> = {};
    if (updates.name !== undefined) scalarUpdates.name = updates.name;
    if (updates.location !== undefined) scalarUpdates.location = updates.location;
    if (updates.order !== undefined) scalarUpdates.order = updates.order;

    if (Object.keys(scalarUpdates).length > 0) {
      const success = await db.updateQueenBoxRowScalars(userId, id, scalarUpdates);
      if (!success) {
        setError('Greska pri azuriranju reda');
        return;
      }
    }

    // Optimistic local state update
    updateState(prev => ({
      ...prev,
      queenBoxRows: (prev.queenBoxRows || []).map(row =>
        row.id === id ? { ...row, ...updates, updatedAt: new Date() } : row
      ),
    }));
  }, [updateState, userId, state.queenBoxRows]);

  const deleteQueenBoxRow = useCallback(async (id: string) => {
    if (!userId) return;
    const success = await db.deleteQueenBoxRow(userId, id);
    if (!success) {
      setError('Greska pri brisanju reda');
      return;
    }
    updateState(prev => ({
      ...prev,
      queenBoxRows: (prev.queenBoxRows || []).filter(row => row.id !== id),
    }));
  }, [updateState, userId]);

  // ============================================================
  // NUCLEI operations
  // ============================================================

  const addNuclei = useCallback(async (nuclei: Nuclei) => {
    if (!userId) return;
    const success = await db.insertNucleus(userId, nuclei);
    if (!success) {
      setError('Greska pri dodavanju roja');
      return;
    }
    updateState(prev => ({ ...prev, nuclei: [...prev.nuclei, nuclei] }));
  }, [updateState, userId]);

  const updateNuclei = useCallback(async (id: string, updates: Partial<Nuclei>) => {
    if (!userId) return;
    const success = await db.updateNucleus(userId, id, updates);
    if (!success) {
      setError('Greska pri azuriranju roja');
      return;
    }
    updateState(prev => ({
      ...prev,
      nuclei: prev.nuclei.map(n =>
        n.id === id ? { ...n, ...updates, updatedAt: new Date() } : n
      ),
    }));
  }, [updateState, userId]);

  const deleteNuclei = useCallback(async (id: string) => {
    if (!userId) return;
    const success = await db.deleteNucleus(userId, id);
    if (!success) {
      setError('Greska pri brisanju roja');
      return;
    }
    updateState(prev => ({
      ...prev,
      nuclei: prev.nuclei.filter(n => n.id !== id),
    }));
  }, [updateState, userId]);

  // ============================================================
  // SALE operations
  // ============================================================

  const addSale = useCallback(async (sale: Sale) => {
    if (!userId) return;
    const success = await db.insertSale(userId, sale);
    if (!success) {
      setError('Greska pri dodavanju prodaje');
      return;
    }
    updateState(prev => ({ ...prev, sales: [...prev.sales, sale] }));
  }, [updateState, userId]);

  const updateSale = useCallback(async (id: string, updates: Partial<Sale>) => {
    if (!userId) return;
    const success = await db.updateSale(userId, id, updates);
    if (!success) {
      setError('Greska pri azuriranju prodaje');
      return;
    }
    updateState(prev => ({
      ...prev,
      sales: prev.sales.map(sale =>
        sale.id === id ? { ...sale, ...updates, updatedAt: new Date() } : sale
      ),
    }));
  }, [updateState, userId]);

  const deleteSale = useCallback(async (id: string) => {
    if (!userId) return;
    const success = await db.deleteSale(userId, id);
    if (!success) {
      setError('Greska pri brisanju prodaje');
      return;
    }
    updateState(prev => ({
      ...prev,
      sales: prev.sales.filter(sale => sale.id !== id),
    }));
  }, [updateState, userId]);

  // ============================================================
  // EXPENSE operations
  // ============================================================

  const addExpense = useCallback(async (expense: Expense) => {
    if (!userId) return;
    const success = await db.insertExpense(userId, expense);
    if (!success) {
      setError('Greska pri dodavanju troska');
      return;
    }
    updateState(prev => ({ ...prev, expenses: [...prev.expenses, expense] }));
  }, [updateState, userId]);

  const updateExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
    if (!userId) return;
    const success = await db.updateExpense(userId, id, updates);
    if (!success) {
      setError('Greska pri azuriranju troska');
      return;
    }
    updateState(prev => ({
      ...prev,
      expenses: prev.expenses.map(expense =>
        expense.id === id ? { ...expense, ...updates, updatedAt: new Date() } : expense
      ),
    }));
  }, [updateState, userId]);

  const deleteExpense = useCallback(async (id: string) => {
    if (!userId) return;
    const success = await db.deleteExpense(userId, id);
    if (!success) {
      setError('Greska pri brisanju troska');
      return;
    }
    updateState(prev => ({
      ...prev,
      expenses: prev.expenses.filter(expense => expense.id !== id),
    }));
  }, [updateState, userId]);

  // ============================================================
  // INCOME operations
  // ============================================================

  const addIncome = useCallback(async (income: Income) => {
    if (!userId) return;
    const success = await db.insertIncome(userId, income);
    if (!success) {
      setError('Greska pri dodavanju prihoda');
      return;
    }
    updateState(prev => ({ ...prev, incomes: [...(prev.incomes || []), income] }));
  }, [updateState, userId]);

  const updateIncome = useCallback(async (id: string, updates: Partial<Income>) => {
    if (!userId) return;
    const success = await db.updateIncome(userId, id, updates);
    if (!success) {
      setError('Greska pri azuriranju prihoda');
      return;
    }
    updateState(prev => ({
      ...prev,
      incomes: (prev.incomes || []).map(income =>
        income.id === id ? { ...income, ...updates, updatedAt: new Date() } : income
      ),
    }));
  }, [updateState, userId]);

  const deleteIncome = useCallback(async (id: string) => {
    if (!userId) return;
    const success = await db.deleteIncome(userId, id);
    if (!success) {
      setError('Greska pri brisanju prihoda');
      return;
    }
    updateState(prev => ({
      ...prev,
      incomes: (prev.incomes || []).filter(income => income.id !== id),
    }));
  }, [updateState, userId]);

  // ============================================================
  // UTILITY operations
  // ============================================================

  const refreshMetrics = useCallback(() => {
    if (userId) {
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
      setError('Greska pri brisanju podataka');
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
    addNuclei, updateNuclei, deleteNuclei,
    addSale, updateSale, deleteSale,
    addExpense, updateExpense, deleteExpense,
    addIncome, updateIncome, deleteIncome,
    refreshMetrics, clearAllData, exportData,
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
