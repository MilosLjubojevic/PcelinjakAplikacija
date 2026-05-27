import {
  AppState,
  Expense,
  Hive,
  Income,
  Location,
  Note,
  PolenHarvest,
  Queen,
  QueenBox,
  QueenBoxRow,
  Sale,
} from "../types";

export function generateMockData(): AppState {
  const now = new Date();
  const d = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400_000);

  const queens: Queen[] = [
    {
      id: "q1",
      name: "Zlatica",
      breed: "carniolan",
      status: "laying",
      birthDate: d(400),
      color: "yellow",
      markingYear: 2024,
      productivity: 9,
      temperament: 8,
      notes: "Odlična nosivost",
      createdAt: d(400),
      updatedAt: d(10),
    },
    {
      id: "q2",
      breed: "buckfast",
      status: "laying",
      birthDate: d(600),
      color: "red",
      markingYear: 2023,
      productivity: 10,
      temperament: 7,
      createdAt: d(600),
      updatedAt: d(5),
    },
    {
      id: "q3",
      name: "Bijela",
      breed: "italian",
      status: "mature",
      birthDate: d(180),
      color: "white",
      markingYear: 2025,
      productivity: 8,
      temperament: 9,
      createdAt: d(180),
      updatedAt: d(2),
    },
    {
      id: "q4",
      breed: "carniolan",
      status: "mated",
      birthDate: d(60),
      color: "green",
      markingYear: 2025,
      productivity: 7,
      temperament: 8,
      createdAt: d(60),
      updatedAt: d(1),
    },
    {
      id: "q5",
      breed: "hybrid",
      status: "developing",
      birthDate: d(20),
      color: "blue",
      markingYear: 2025,
      createdAt: d(20),
      updatedAt: d(0),
    },
  ];

  const makeHive = (
    id: string,
    number: number,
    locationId: string,
    rowId: string,
    opts: Partial<Hive> = {},
  ): Hive => ({
    id,
    number,
    locationId,
    rowId,
    type: "hive",
    health: "good",
    hasQueen: true,
    frameCount: 10,
    isActive: true,
    createdAt: d(200),
    updatedAt: d(3),
    ...opts,
  });

  const makeSwarm = (
    id: string,
    number: number,
    locationId: string,
    rowId: string,
    opts: Partial<Hive> = {},
  ): Hive => ({
    id,
    number,
    locationId,
    rowId,
    type: "swarm",
    health: "good",
    swarmStatus: "developing",
    swarmStartDate: d(10),
    createdAt: d(10),
    updatedAt: d(1),
    ...opts,
  });

  const kucaRow1Hives: Hive[] = [
    makeHive("k1-r1-h1", 1, "kuca", "k1-r1", {
      queenId: "q1",
      feedingDates: [d(7)],
      harvestDates: [d(30)],
    }),
    makeHive("k1-r1-h2", 2, "kuca", "k1-r1", {
      health: "bad",
      hasQueen: false,
    }),
    makeHive("k1-r1-h3", 3, "kuca", "k1-r1", {
      queenId: "q2",
      frameCount: 12,
      harvestDates: [d(14)],
    }),
    makeHive("k1-r1-h4", 4, "kuca", "k1-r1", {
      health: "warning",
      frameCount: 7,
    }),
    makeHive("k1-r1-h5", 5, "kuca", "k1-r1", { queenId: "q3", frameCount: 11 }),
    makeHive("k1-r1-h6", 6, "kuca", "k1-r1", {
      health: "bad",
      hasQueen: false,
    }),
    makeHive("k1-r1-h7", 7, "kuca", "k1-r1", {
      frameCount: 9,
      feedingDates: [d(3)],
    }),
    makeHive("k1-r1-h8", 8, "kuca", "k1-r1", {
      queenId: "q4",
      health: "warning",
    }),
  ];

  const kucaRow2Hives: Hive[] = [
    makeHive("k1-r2-h1", 1, "kuca", "k1-r2", { queenId: "q2", frameCount: 13 }),
    makeHive("k1-r2-h2", 2, "kuca", "k1-r2", { health: "warning" }),
    makeSwarm("k1-r2-h3", 3, "kuca", "k1-r2", { swarmStatus: "ready" }),
    makeHive("k1-r2-h4", 4, "kuca", "k1-r2", { frameCount: 8 }),
    makeSwarm("k1-r2-h5", 5, "kuca", "k1-r2", { swarmStatus: "developing" }),
    makeHive("k1-r2-h6", 6, "kuca", "k1-r2", { queenId: "q1", frameCount: 10 }),
  ];

  const livadaRow1Hives: Hive[] = [
    makeHive("l1-r1-h1", 1, "livada", "l1-r1", {
      queenId: "q2",
      frameCount: 11,
    }),
    makeHive("l1-r1-h2", 2, "livada", "l1-r1", {
      health: "bad",
      hasQueen: false,
    }),
    makeHive("l1-r1-h3", 3, "livada", "l1-r1", {
      frameCount: 9,
      feedingDates: [d(5)],
    }),
    makeHive("l1-r1-h4", 4, "livada", "l1-r1", {
      health: "warning",
      frameCount: 6,
    }),
    makeSwarm("l1-r1-h5", 5, "livada", "l1-r1", { swarmStatus: "ready" }),
  ];

  const locations: Location[] = [
    {
      id: "kuca",
      name: "Kuća",
      icon: "home",
      description: "Lokacija kod kuće",
      rows: [
        {
          id: "k1-r1",
          name: "Red 1",
          locationId: "kuca",
          capacity: 10,
          hives: kucaRow1Hives,
          order: 0,
          createdAt: d(200),
          updatedAt: d(3),
        },
        {
          id: "k1-r2",
          name: "Red 2",
          locationId: "kuca",
          capacity: 8,
          hives: kucaRow2Hives,
          order: 1,
          createdAt: d(200),
          updatedAt: d(2),
        },
      ],
      createdAt: d(300),
      updatedAt: d(3),
    },
    {
      id: "livada",
      name: "Livada",
      icon: "leaf",
      description: "Livadska lokacija",
      rows: [
        {
          id: "l1-r1",
          name: "Red 1",
          locationId: "livada",
          capacity: 8,
          hives: livadaRow1Hives,
          order: 0,
          createdAt: d(150),
          updatedAt: d(5),
        },
      ],
      createdAt: d(150),
      updatedAt: d(5),
    },
  ];

  const queenBoxes: QueenBox[] = [
    {
      id: "qb1",
      number: 1,
      rowId: "qbr1",
      health: "good",
      status: "developing",
      startDate: d(10),
      maturityDate: d(-11),
      daysUntilMature: 11,
      notes: "Počeci razvoja",
      createdAt: d(10),
      updatedAt: d(1),
    },
    {
      id: "qb2",
      number: 2,
      rowId: "qbr1",
      health: "excellent",
      status: "mature",
      startDate: d(25),
      maturityDate: d(0),
      daysUntilMature: 0,
      createdAt: d(25),
      updatedAt: d(0),
    },
    {
      id: "qb3",
      number: 3,
      rowId: "qbr1",
      health: "warning",
      status: "developing",
      startDate: d(8),
      maturityDate: d(-13),
      daysUntilMature: 13,
      createdAt: d(8),
      updatedAt: d(1),
    },
    {
      id: "qb4",
      number: 4,
      rowId: "qbr1",
      health: "good",
      status: "empty",
      createdAt: d(30),
      updatedAt: d(5),
    },
  ];

  const queenBoxRows: QueenBoxRow[] = [
    {
      id: "qbr1",
      name: "Odgajivačnik A",
      locationId: "kuca",
      capacity: 6,
      queenBoxes,
      order: 0,
      createdAt: d(30),
      updatedAt: d(1),
    },
  ];

  const sales: Sale[] = [
    {
      id: "s1",
      customerName: "Marko Marković",
      customerPhone: "+387 61 123 456",
      items: [
        {
          id: "si1",
          type: "honey",
          itemName: "Med bagremov",
          quantity: 5,
          unitPrice: 12,
          totalPrice: 60,
        },
      ],
      totalAmount: 60,
      status: "completed",
      saleDate: d(5),
      paymentMethod: "Gotovina",
      createdAt: d(5),
      updatedAt: d(5),
    },
    {
      id: "s2",
      customerName: "Jovana Jovanović",
      customerPhone: "+387 65 987 654",
      customerEmail: "jovana@example.com",
      items: [
        {
          id: "si2",
          type: "nuclei",
          itemId: "k1-r2-h3",
          itemName: "Roj - Red 2/3",
          quantity: 1,
          unitPrice: 80,
          totalPrice: 80,
        },
        {
          id: "si3",
          type: "queen",
          itemId: "q3",
          itemName: "Matica Bijela",
          quantity: 1,
          unitPrice: 25,
          totalPrice: 25,
        },
      ],
      totalAmount: 105,
      status: "completed",
      saleDate: d(15),
      paymentMethod: "Uplata na račun",
      createdAt: d(15),
      updatedAt: d(15),
    },
    {
      id: "s3",
      customerName: "Petar Petrović",
      customerPhone: "+387 63 555 123",
      items: [
        {
          id: "si4",
          type: "honey",
          itemName: "Med cvjetni",
          quantity: 10,
          unitPrice: 10,
          totalPrice: 100,
        },
      ],
      totalAmount: 100,
      status: "pending",
      saleDate: d(2),
      paymentMethod: "Gotovina",
      notes: "Dostaviti do petka",
      createdAt: d(2),
      updatedAt: d(2),
    },
  ];

  const expenses: Expense[] = [
    {
      id: "e1",
      category: "medication",
      description: "Apiguard - varroa tretman",
      amount: 45,
      date: d(30),
      createdAt: d(30),
      updatedAt: d(30),
    },
    {
      id: "e2",
      category: "feed",
      description: "Šećerni sirup 25kg",
      amount: 28,
      date: d(20),
      createdAt: d(20),
      updatedAt: d(20),
    },
    {
      id: "e3",
      category: "equipment",
      description: "Novi satni osnovi x10",
      amount: 35,
      date: d(12),
      createdAt: d(12),
      updatedAt: d(12),
    },
    {
      id: "e4",
      category: "transportation",
      description: "Gorivo za selidbu košnica",
      amount: 22,
      date: d(4),
      createdAt: d(4),
      updatedAt: d(4),
    },
  ];

  const incomes: Income[] = [
    {
      id: "i1",
      category: "honey-sale",
      description: "Prodaja bagremovog meda - 15kg",
      amount: 180,
      date: d(8),
      createdAt: d(8),
      updatedAt: d(8),
    },
    {
      id: "i2",
      category: "nucleus-sale",
      description: "Prodaja 2 roja",
      amount: 160,
      date: d(18),
      createdAt: d(18),
      updatedAt: d(18),
    },
    {
      id: "i3",
      category: "queen-sale",
      description: "Prodaja 3 matice",
      amount: 75,
      date: d(3),
      createdAt: d(3),
      updatedAt: d(3),
    },
  ];

  const notes: Note[] = [
    {
      id: "n1",
      title: "Proljetni pregled",
      content:
        "Sve košnice u redu 1 pregledane. Košnica 2 bez matice - dodati novu. Zalihe hrane dovoljne za još 2 sedmice.",
      date: d(7),
      createdAt: d(7),
      updatedAt: d(7),
    },
    {
      id: "n2",
      title: "Varroa tretman",
      content:
        "Postaviti Apiguard tablete u sve košnice. Ponoviti za 2 sedmice.",
      date: d(30),
      createdAt: d(30),
      updatedAt: d(25),
    },
    {
      id: "n3",
      title: "Sezona bagremovog meda",
      content:
        "Bagremi cvjetaju. Dodati medišta na 5 najjačih košnica. Početi pripreme za vrcanje.",
      date: d(1),
      createdAt: d(1),
      updatedAt: d(1),
    },
  ];

  const polenHarvests: PolenHarvest[] = [
    {
      id: "ph1",
      date: d(60),
      weightGrams: 850,
      notes: "Voćnjak - jabuke",
      createdAt: d(60),
      updatedAt: d(60),
    },
    {
      id: "ph2",
      date: d(45),
      weightGrams: 1200,
      notes: "Livadsko cvijeće",
      createdAt: d(45),
      updatedAt: d(45),
    },
    {
      id: "ph3",
      date: d(30),
      weightGrams: 600,
      createdAt: d(30),
      updatedAt: d(30),
    },
    {
      id: "ph4",
      date: d(10),
      weightGrams: 980,
      notes: "Bagrem - odlična sezona",
      createdAt: d(10),
      updatedAt: d(10),
    },
  ];

  return {
    locations,
    queens,
    queenBoxRows,
    sales,
    expenses,
    incomes,
    notes,
    polenHarvests,
    lastUpdated: now,
  };
}
