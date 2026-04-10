# Pcelinjak Database Schema

## Auth

- **auth.users** — Supabase built-in auth table
  - `id` (UUID, PK)

---

## Locations & Hives

### locations

| Column      | Type        | Notes           |
| ----------- | ----------- | --------------- |
| id          | UUID        | PK              |
| user_id     | UUID        | FK → auth.users |
| name        | text        |                 |
| icon        | text        |                 |
| description | text        |                 |
| created_at  | timestamptz |                 |
| updated_at  | timestamptz |                 |

### hive_rows

| Column      | Type        | Notes           |
| ----------- | ----------- | --------------- |
| id          | UUID        | PK              |
| user_id     | UUID        | FK → auth.users |
| location_id | UUID        | FK → locations  |
| name        | text        |                 |
| order       | int         |                 |
| created_at  | timestamptz |                 |
| updated_at  | timestamptz |                 |
| capacity    | int4        |                 |

### hives

| Column            | Type        | Notes           |
| ----------------- | ----------- | --------------- |
| id                | UUID        | PK              |
| user_id           | UUID        | FK → auth.users |
| location_id       | UUID        | FK → locations  |
| row_id            | UUID        | FK → hive_rows  |
| number            | int         |                 |
| health            | text        |                 |
| has_queen         | bool        |                 |
| queen_id          | UUID        | FK → queens     |
| last_inspection   | timestamptz |                 |
| frame_count       | int         |                 |
| is_harvested      | bool        |                 |
| has_pollen        | bool        |                 |
| is_active         | bool        |                 |
| last_feeding_date | timestamptz |                 |
| last_harvest_date | timestamptz |                 |
| created_at        | timestamptz |                 |
| updated_at        | timestamptz |                 |
| type              | text        |                 |
| swarm_status      | text        |                 |
| swarm_start_date  | timestamptz |                 |

### hive_notes

| Column     | Type        | Notes           |
| ---------- | ----------- | --------------- |
| id         | UUID        | PK              |
| user_id    | UUID        | FK → auth.users |
| hive_id    | UUID        | FK → hives      |
| text       | text        |                 |
| photos     | jsonb       |                 |
| created_at | timestamptz |                 |

### hive_feeding_dates

| Column     | Type        | Notes           |
| ---------- | ----------- | --------------- |
| id         | UUID        | PK              |
| hive_id    | UUID        | FK → hives      |
| user_id    | UUID        | FK → auth.users |
| date       | timestamptz |                 |
| created_at | timestamptz |                 |

### hive_harvest_dates

| Column     | Type        | Notes           |
| ---------- | ----------- | --------------- |
| id         | UUID        | PK              |
| hive_id    | UUID        | FK → hives      |
| user_id    | UUID        | FK → auth.users |
| date       | timestamptz |                 |
| created_at | timestamptz |                 |

---

## Queens

### queens

| Column          | Type        | Notes                  |
| --------------- | ----------- | ---------------------- |
| id              | UUID        | PK                     |
| user_id         | UUID        | FK → auth.users        |
| name            | text        |                        |
| breed           | text        |                        |
| status          | text        |                        |
| birth_date      | timestamptz |                        |
| color           | text        |                        |
| marking_year    | int         |                        |
| current_hive_id | UUID        | FK → hives             |
| mother_queen_id | UUID        | FK → queens (self-ref) |
| productivity    | text        |                        |
| temperament     | text        |                        |
| notes           | text        |                        |
| created_at      | timestamptz |                        |
| updated_at      | timestamptz |                        |

### queen_box_rows

| Column     | Type        | Notes           |
| ---------- | ----------- | --------------- |
| id         | UUID        | PK              |
| user_id    | UUID        | FK → auth.users |
| name       | text        |                 |
| order      | int         |                 |
| created_at | timestamptz |                 |
| updated_at | timestamptz |                 |
| capacity   | int         |                 |

### queen_boxes

| Column        | Type        | Notes               |
| ------------- | ----------- | ------------------- |
| id            | UUID        | PK                  |
| user_id       | UUID        | FK → auth.users     |
| row_id        | UUID        | FK → queen_box_rows |
| number        | int         |                     |
| health        | text        |                     |
| status        | text        |                     |
| start_date    | timestamptz |                     |
| maturity_date | timestamptz |                     |
| removed_date  | timestamptz |                     |
| notes         | text        |                     |
| created_at    | timestamptz |                     |
| updated_at    | timestamptz |                     |

---

## Products & Orders

### Products

| Column       | Type | Notes |
| ------------ | ---- | ----- |
| id           | UUID | PK    |
| product_name | text |       |
| desc         | text |       |
| image        | text |       |
| alt          | text |       |
| type         | text |       |

### Product_price_options

| Column     | Type    | Notes         |
| ---------- | ------- | ------------- |
| id         | UUID    | PK            |
| product_id | UUID    | FK → Products |
| size       | text    |               |
| price      | numeric |               |
| stock      | int     |               |

### Orders

| Column     | Type        | Notes |
| ---------- | ----------- | ----- |
| id         | UUID        | PK    |
| created_at | timestamptz |       |
| name       | text        |       |
| lastname   | text        |       |
| address    | text        |       |
| city       | text        |       |
| phone      | text        |       |
| email      | text        |       |
| sent       | bool        |       |

### Order_items

| Column               | Type        | Notes                      |
| -------------------- | ----------- | -------------------------- |
| id                   | UUID        | PK                         |
| order_id             | UUID        | FK → Orders                |
| product_id           | UUID        | FK → Products              |
| product_price_option | UUID        | FK → Product_price_options |
| quantity             | int         |                            |
| created_at           | timestamptz |                            |

---

## Sales & Finances

### sales

| Column         | Type        | Notes           |
| -------------- | ----------- | --------------- |
| id             | UUID        | PK              |
| user_id        | UUID        | FK → auth.users |
| customer_name  | text        |                 |
| customer_phone | text        |                 |
| customer_email | text        |                 |
| total_amount   | numeric     |                 |
| status         | text        |                 |
| sale_data      | timestamptz |                 |
| payment_method | text        |                 |
| notes          | text        |                 |
| created_at     | timestamptz |                 |
| updated_at     | timestamptz |                 |

### sale_items

| Column      | Type        | Notes           |
| ----------- | ----------- | --------------- |
| id          | UUID        | PK              |
| user_id     | UUID        | FK → auth.users |
| sale_id     | UUID        | FK → sales      |
| type        | text        |                 |
| item_id     | UUID        |                 |
| item_name   | text        |                 |
| quantity    | int         |                 |
| unit_price  | numeric     |                 |
| total_price | numeric     |                 |
| created_at  | timestamptz |                 |

### expenses

| Column      | Type        | Notes           |
| ----------- | ----------- | --------------- |
| id          | UUID        | PK              |
| user_id     | UUID        | FK → auth.users |
| category    | text        |                 |
| description | text        |                 |
| amount      | numeric     |                 |
| date        | timestamptz |                 |
| notes       | text        |                 |
| created_at  | timestamptz |                 |
| updated_at  | timestamptz |                 |

### incomes

| Column      | Type        | Notes           |
| ----------- | ----------- | --------------- |
| id          | UUID        | PK              |
| user_id     | UUID        | FK → auth.users |
| category    | text        |                 |
| description | text        |                 |
| amount      | numeric     |                 |
| date        | timestamptz |                 |
| notes       | text        |                 |
| created_at  | timestamptz |                 |
| updated_at  | timestamptz |                 |

---

## Access Control

### allowed_emails

| Column     | Type        | Notes |
| ---------- | ----------- | ----- |
| id         | UUID        | PK    |
| email      | text        |       |
| created_at | timestamptz |       |
