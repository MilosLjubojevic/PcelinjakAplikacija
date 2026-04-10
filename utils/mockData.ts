import { AppState, Location, Queen, Sale, Hive, HiveRow } from '../types';

export function generateMockData(): AppState {
  const now = new Date();

  // Generate queens
  const queens: Queen[] = [
    {
      id: 'queen-1',
      name: 'Kraljica 1',
      breed: 'carniolan',
      status: 'laying',
      birthDate: new Date(2024, 3, 15),
      color: 'yellow',
      markingYear: 2024,
      productivity: 9,
      temperament: 8,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'queen-2',
      name: 'Kraljica 2',
      breed: 'italian',
      status: 'mature',
      birthDate: new Date(2024, 5, 20),
      color: 'white',
      markingYear: 2024,
      productivity: 8,
      temperament: 9,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'queen-3',
      breed: 'buckfast',
      status: 'laying',
      birthDate: new Date(2023, 7, 10),
      color: 'red',
      markingYear: 2023,
      productivity: 10,
      temperament: 7,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'queen-4',
      breed: 'carniolan',
      status: 'mated',
      birthDate: new Date(2024, 8, 5),
      color: 'green',
      markingYear: 2024,
      productivity: 7,
      temperament: 8,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'queen-5',
      breed: 'italian',
      status: 'developing',
      birthDate: new Date(2024, 10, 1),
      color: 'blue',
      markingYear: 2024,
      productivity: 6,
      temperament: 7,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // Generate locations with rows and hives
  const locations: Location[] = [
    {
      id: 'kuca',
      name: 'Kuća',
      icon: 'home',
      description: 'Lokacija kod kuće',
      rows: [
        generateRow('kuca-red-1', 'Red 1', 'kuca', 35, queens, 0),
        generateRow('kuca-red-2', 'Red 2', 'kuca', 38, queens, 1),
        generateRow('kuca-red-3', 'Red 3', 'kuca', 32, queens, 2),
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'suma',
      name: 'Šuma',
      icon: 'leaf',
      description: 'Lokacija u šumi',
      rows: [
        generateRow('suma-red-1', 'Red 1', 'suma', 40, queens, 0),
        generateRow('suma-red-2', 'Red 2', 'suma', 36, queens, 1),
        generateRow('suma-red-3', 'Red 3', 'suma', 35, queens, 2),
      ],
      createdAt: now,
      updatedAt: now,
    },
  ];

  // Generate sales
  const sales: Sale[] = [
    {
      id: 'sale-1',
      customerName: 'Marko Marković',
      customerPhone: '+381 64 123 4567',
      items: [
        {
          id: 'item-1',
          type: 'nuclei',
          itemId: 'nuclei-1',
          itemName: 'Roj 1',
          quantity: 1,
          unitPrice: 15000,
          totalPrice: 15000,
        },
      ],
      totalAmount: 15000,
      status: 'completed',
      saleDate: new Date(2024, 11, 15),
      paymentMethod: 'Gotovina',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'sale-2',
      customerName: 'Jovana Jovanović',
      customerPhone: '+381 65 987 6543',
      customerEmail: 'jovana@example.com',
      items: [
        {
          id: 'item-2',
          type: 'honey',
          itemName: 'Med bagremov',
          quantity: 10,
          unitPrice: 1000,
          totalPrice: 10000,
        },
      ],
      totalAmount: 10000,
      status: 'completed',
      saleDate: new Date(2024, 11, 20),
      paymentMethod: 'Gotovina',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'sale-3',
      customerName: 'Petar Petrović',
      customerPhone: '+381 63 555 1234',
      items: [
        {
          id: 'item-3',
          type: 'nuclei',
          itemName: 'Roj 2',
          quantity: 1,
          unitPrice: 14000,
          totalPrice: 14000,
        },
      ],
      totalAmount: 14000,
      status: 'pending',
      saleDate: new Date(2025, 0, 5),
      paymentMethod: 'Uplata na račun',
      createdAt: now,
      updatedAt: now,
    },
  ];

  return {
    locations,
    queens,
    queenBoxRows: [],
    sales,
    expenses: [],
    incomes: [],
    notes: [],
    lastUpdated: now,
  };
}

function generateRow(
  id: string,
  name: string,
  locationId: string,
  hiveCount: number,
  queens: Queen[],
  order: number
): HiveRow {
  const now = new Date();
  const hives: Hive[] = Array.from({ length: hiveCount }, (_, i) => {
    const healthOptions: Array<'good' | 'bad'> = ['good', 'bad'];
    const health = healthOptions[i % 2];
    const hasQueen = i % 5 !== 0;
    const queenId = hasQueen && queens[i % queens.length] ? queens[i % queens.length].id : undefined;

    return {
      id: `${id}-h${i + 1}`,
      number: i + 1,
      locationId,
      rowId: id,
      type: 'hive' as const,
      health,
      hasQueen,
      queenId,
      frameCount: 10 + (i % 5),
      lastInspection: new Date(2024, 11, Math.floor(Math.random() * 30) + 1),
      createdAt: now,
      updatedAt: now,
    };
  });

  return {
    id,
    name,
    locationId,
    capacity: hiveCount,
    hives,
    order,
    createdAt: now,
    updatedAt: now,
  };
}
