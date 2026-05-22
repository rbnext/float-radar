import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_KEY!)

// Use raw SQL via RPC
const { data, error } = await sb.rpc('get_schema_info' as any)

// Fallback: just fetch a row and log the keys
for (const table of ['items', 'orders'] as const) {
  const { data, error } = await (sb as any).from(table).select('*').limit(1)
  if (error) console.log(table, 'error:', error.message)
  else if (data?.length) console.log(`\n=== ${table} columns ===\n`, Object.keys(data[0]).join(', '))
  else {
    // empty table - insert/select trick won't work, try a count
    const { count } = await (sb as any).from(table).select('*', { count: 'exact', head: true })
    console.log(`\n=== ${table} === (empty, count=${count})`)
  }
}
