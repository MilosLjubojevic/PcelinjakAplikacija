# Pcelinjak Aplikacija

Mobilna aplikacija za upravljanje pcelinjacima. Pracenje kosnica, matica, rojeva, prodaje i finansija — sve na jednom mestu.

## Funkcionalnosti

### Kosnice i lokacije

- Evidencija lokacija sa redovima i kosnicama
- Pracenje zdravlja kosnica (dobro / lose)
- Beleske sa fotografijama za svaki pregled
- Datumi hranjenja i berbe meda
- Broj ramova, status polena i zetve

### Matice

- Registar matica sa rasom, statusom i produktivnoscu
- Pracenje zrelosti u nucleo-kutijama (25-dnevni ciklus)
- Status: developing, mature, mated, laying, retired
- Rase: kranjska, italijanska, buckfast, kavkaska, hibrid

### Rojevi (Nuclei)

- Evidencija rojeva sa statusom i snagom
- Statusi: developing, ready, for-sale, sold, merged
- Povezivanje sa maticom i pracenje broja ramova

### Prodaja

- Kreiranje prodaja sa vise stavki (rojevi, matice, med, vosak)
- Pracenje kupaca i statusa narudzbi
- Istorija svih transakcija

### Finansije

- Evidencija prihoda i rashoda po kategorijama
- Rashodi: oprema, hrana, lekovi, odrzavanje, transport, pakovanje
- Prihodi: prodaja meda, rojeva, matica, voska, oprasivanje
- Pregled neto profita

### Dashboard

- Pregled kljucnih metrika: ukupno kosnica, matica, rojeva
- Kosnice koje zahtevaju paznju
- Mesecna prodaja
- Widget za vremensku prognozu
- Pozdrav prema dobu dana (srpski jezik)

### Admin panel

- Upravljanje narudzbama iz web prodavnice
- Pregled proizvoda i zaliha
- Upozorenja za nizak nivo zaliha

## Tehnicki stek

| Sloj              | Tehnologija                          |
| ----------------- | ------------------------------------ |
| Framework         | Expo 54 / React Native 0.81          |
| Jezik             | TypeScript                           |
| Navigacija        | expo-router (Drawer)                 |
| Backend           | Supabase (Auth, PostgreSQL, Storage) |
| Autentifikacija   | Google OAuth preko Supabase          |
| Lokalno skladiste | AsyncStorage (samo auth sesija)      |
| UUID generacija   | expo-crypto                          |

## Struktura projekta

```
app/                  # Ekrani (file-based routing)
  index.tsx           # Dashboard
  hive.tsx            # Upravljanje kosnicama
  queens.tsx          # Matice
  nuclei.tsx          # Rojevi
  finansije.tsx       # Finansije (prihodi/rashodi)
  analytics.tsx       # Prodaja
  orders.tsx          # Narudzbe
  products.tsx        # Proizvodi
  admin.tsx           # Admin panel
  google-auth.tsx     # Google prijava
components/           # UI komponente (Button, Card, Modal, Picker...)
constants/            # Design tokeni (boje, razmaci, velicine)
context/              # React konteksti
  AppContext.tsx      # Glavni state (Supabase CRUD)
  AuthContext.tsx     # Autentifikacija
  SupabaseContext.tsx # Proizvodi, narudzbe, dozvoljeni emailovi
  ThemeContext.tsx    # Tamni rezim (light/dark/system)
services/             # Supabase servis
types/                # TypeScript interfejsi
utils/                # Pomocne funkcije (mapper, migracija, valuta)
```

## Pokretanje

### Preduslovi

- Node.js 18+
- Expo CLI
- Supabase projekat sa konfigurisanim tabelama (videti `supabase_migration.sql`)

### Instalacija

```bash
npm install
```

### Podesavanje okruzenja

Napravite `.env` fajl u korenu projekta:

```env
EXPO_PUBLIC_SUPABASE_URL=<vas-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<vas-anon-key>
```

### Pokretanje aplikacije

```bash
npx expo start
```

### Build (EAS)

```bash
eas build --platform android
eas build --platform ios
```

## Baza podataka

Aplikacija koristi 14 Supabase tabela sa RLS politikama:

`locations`, `hive_rows`, `hives`, `hive_notes`, `hive_feeding_dates`, `hive_harvest_dates`, `queens`, `queen_box_rows`, `queen_boxes`, `nuclei`, `sales`, `sale_items`, `expenses`, `incomes`

Sve tabele koriste UUID primarne kljuceve i `user_id` FK prema `auth.users`.

SQL migracija: [`supabase_migration.sql`](supabase_migration.sql)

## Valuta

Aplikacija koristi KM (Konvertibilna Marka) sa srpskim lokalom za formatiranje.

## Licenca

Privatni projekat.
