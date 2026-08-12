/**
 * Minimal chainable mock for `utils/supabase`'s `supabase` client, tailored to
 * the query shapes used in `services/supabaseService.ts`:
 *   .from(table).select('*').order(col, opts?)
 *   .from(table).insert(rows)
 *   .from(table).update(obj).eq('id', id)
 *   .from(table).delete().eq('id', id)
 *   .from(table).delete().in('id', ids)
 *   .from(table).delete().neq('id', '')
 *
 * Every call is recorded in `calls` so tests can assert exactly what was
 * sent to Supabase. Responses are configurable per `table:op` key via
 * `setResponse`; unconfigured calls default to `{ data: [], error: null }`.
 */

export type MockResponse = { data?: any; error?: any };

export type RecordedCall = {
  table: string;
  op: string; // 'select' | 'insert' | 'update' | 'delete'
  method: string; // the specific method invoked (select/insert/update/delete/eq/in/neq/order)
  args: any[];
};

export const calls: RecordedCall[] = [];
let responses: Record<string, MockResponse> = {};

export function resetMock() {
  calls.length = 0;
  responses = {};
}

export function setResponse(key: string, resp: MockResponse) {
  responses[key] = resp;
}

/** Convenience: all calls for a given table (any op). */
export function callsFor(table: string): RecordedCall[] {
  return calls.filter((c) => c.table === table);
}

/** Convenience: the args passed to `.insert(...)` for a table (first call only). */
export function insertArgsFor(table: string): any {
  return calls.find((c) => c.table === table && c.method === 'insert')?.args[0];
}

/** Convenience: the args passed to `.update(...)` for a table (first call only). */
export function updateArgsFor(table: string): any {
  return calls.find((c) => c.table === table && c.method === 'update')?.args[0];
}

function makeBuilder(table: string) {
  let op = ''; // insert/update/delete once set
  const builder: any = {};

  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'in', 'neq', 'order'];
  methods.forEach((method) => {
    builder[method] = (...args: any[]) => {
      if (method === 'insert' || method === 'update' || method === 'delete') {
        op = method;
      }
      calls.push({ table, op: op || 'select', method, args });
      return builder;
    };
  });

  // Make the builder itself awaitable (thenable), like the real
  // supabase-js PostgrestFilterBuilder.
  builder.then = (resolve: any, reject: any) => {
    const key = `${table}:${op || 'select'}`;
    const resp = responses[key] ?? { data: [], error: null };
    return Promise.resolve(resp).then(resolve, reject);
  };

  return builder;
}

export const supabase = {
  from: (table: string) => makeBuilder(table),
};

export const isSupabaseConfigured = () => true;
