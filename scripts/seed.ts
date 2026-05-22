import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/lib/db/types'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_KEY

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_KEY in .env')
  process.exit(1)
}

const supabase = createClient<Database>(url, key)

const CATEGORIES = [
  { name: 'Rifles',  slug: 'rifles' },
  { name: 'Pistols', slug: 'pistols' },
  { name: 'SMGs',    slug: 'smgs' },
  { name: 'Heavy',   slug: 'heavy' },
  { name: 'Knives',  slug: 'knives' },
  { name: 'Gloves',  slug: 'gloves' },
]

const SUBCATEGORIES: { categorySlug: string; name: string; slug: string }[] = [
  // Rifles
  { categorySlug: 'rifles', name: 'AK-47',    slug: 'ak-47' },
  { categorySlug: 'rifles', name: 'AUG',      slug: 'aug' },
  { categorySlug: 'rifles', name: 'AWP',      slug: 'awp' },
  { categorySlug: 'rifles', name: 'FAMAS',    slug: 'famas' },
  { categorySlug: 'rifles', name: 'G3SG1',    slug: 'g3sg1' },
  { categorySlug: 'rifles', name: 'Galil AR', slug: 'galil-ar' },
  { categorySlug: 'rifles', name: 'M4A1-S',   slug: 'm4a1-s' },
  { categorySlug: 'rifles', name: 'M4A4',     slug: 'm4a4' },
  { categorySlug: 'rifles', name: 'SCAR-20',  slug: 'scar-20' },
  { categorySlug: 'rifles', name: 'SG 553',   slug: 'sg-553' },
  { categorySlug: 'rifles', name: 'SSG 08',   slug: 'ssg-08' },
  // Pistols
  { categorySlug: 'pistols', name: 'CZ75-Auto',     slug: 'cz75-auto' },
  { categorySlug: 'pistols', name: 'Desert Eagle',  slug: 'desert-eagle' },
  { categorySlug: 'pistols', name: 'Dual Berettas', slug: 'dual-berettas' },
  { categorySlug: 'pistols', name: 'Five-SeveN',    slug: 'five-seven' },
  { categorySlug: 'pistols', name: 'Glock-18',      slug: 'glock-18' },
  { categorySlug: 'pistols', name: 'P2000',         slug: 'p2000' },
  { categorySlug: 'pistols', name: 'P250',          slug: 'p250' },
  { categorySlug: 'pistols', name: 'R8 Revolver',   slug: 'r8-revolver' },
  { categorySlug: 'pistols', name: 'Tec-9',         slug: 'tec-9' },
  { categorySlug: 'pistols', name: 'USP-S',         slug: 'usp-s' },
  // SMGs
  { categorySlug: 'smgs', name: 'MAC-10',   slug: 'mac-10' },
  { categorySlug: 'smgs', name: 'MP5-SD',   slug: 'mp5-sd' },
  { categorySlug: 'smgs', name: 'MP7',      slug: 'mp7' },
  { categorySlug: 'smgs', name: 'MP9',      slug: 'mp9' },
  { categorySlug: 'smgs', name: 'P90',      slug: 'p90' },
  { categorySlug: 'smgs', name: 'PP-Bizon', slug: 'pp-bizon' },
  { categorySlug: 'smgs', name: 'UMP-45',   slug: 'ump-45' },
  // Heavy
  { categorySlug: 'heavy', name: 'M249',      slug: 'm249' },
  { categorySlug: 'heavy', name: 'MAG-7',     slug: 'mag-7' },
  { categorySlug: 'heavy', name: 'Negev',     slug: 'negev' },
  { categorySlug: 'heavy', name: 'Nova',      slug: 'nova' },
  { categorySlug: 'heavy', name: 'Sawed-Off', slug: 'sawed-off' },
  { categorySlug: 'heavy', name: 'XM1014',    slug: 'xm1014' },
  // Knives
  { categorySlug: 'knives', name: 'Bayonet',         slug: 'bayonet' },
  { categorySlug: 'knives', name: 'Bowie Knife',     slug: 'bowie-knife' },
  { categorySlug: 'knives', name: 'Butterfly Knife', slug: 'butterfly-knife' },
  { categorySlug: 'knives', name: 'Classic Knife',   slug: 'classic-knife' },
  { categorySlug: 'knives', name: 'Falchion Knife',  slug: 'falchion-knife' },
  { categorySlug: 'knives', name: 'Flip Knife',      slug: 'flip-knife' },
  { categorySlug: 'knives', name: 'Gut Knife',       slug: 'gut-knife' },
  { categorySlug: 'knives', name: 'Huntsman Knife',  slug: 'huntsman-knife' },
  { categorySlug: 'knives', name: 'Karambit',        slug: 'karambit' },
  { categorySlug: 'knives', name: 'M9 Bayonet',      slug: 'm9-bayonet' },
  { categorySlug: 'knives', name: 'Navaja Knife',    slug: 'navaja-knife' },
  { categorySlug: 'knives', name: 'Nomad Knife',     slug: 'nomad-knife' },
  { categorySlug: 'knives', name: 'Paracord Knife',  slug: 'paracord-knife' },
  { categorySlug: 'knives', name: 'Shadow Daggers',  slug: 'shadow-daggers' },
  { categorySlug: 'knives', name: 'Skeleton Knife',  slug: 'skeleton-knife' },
  { categorySlug: 'knives', name: 'Stiletto Knife',  slug: 'stiletto-knife' },
  { categorySlug: 'knives', name: 'Survival Knife',  slug: 'survival-knife' },
  { categorySlug: 'knives', name: 'Talon Knife',     slug: 'talon-knife' },
  { categorySlug: 'knives', name: 'Ursus Knife',     slug: 'ursus-knife' },
  // Gloves
  { categorySlug: 'gloves', name: 'Bloodhound Gloves',  slug: 'bloodhound-gloves' },
  { categorySlug: 'gloves', name: 'Broken Fang Gloves', slug: 'broken-fang-gloves' },
  { categorySlug: 'gloves', name: 'Driver Gloves',      slug: 'driver-gloves' },
  { categorySlug: 'gloves', name: 'Hand Wraps',         slug: 'hand-wraps' },
  { categorySlug: 'gloves', name: 'Hydra Gloves',       slug: 'hydra-gloves' },
  { categorySlug: 'gloves', name: 'Moto Gloves',        slug: 'moto-gloves' },
  { categorySlug: 'gloves', name: 'Specialist Gloves',  slug: 'specialist-gloves' },
  { categorySlug: 'gloves', name: 'Sport Gloves',       slug: 'sport-gloves' },
]

async function seed() {
  console.log('Seeding categories...')
  const { data: cats, error: catsError } = await supabase
    .from('categories')
    .upsert(CATEGORIES, { onConflict: 'slug' })
    .select()
  if (catsError) throw catsError
  console.log(`  ✓ ${cats.length} categories`)

  console.log('Seeding subcategories...')
  const { data: allCats, error: fetchError } = await supabase
    .from('categories')
    .select('id, slug')
  if (fetchError) throw fetchError

  const catBySlug = Object.fromEntries(allCats.map((c) => [c.slug, c.id]))
  const rows = SUBCATEGORIES.map(({ categorySlug, name, slug }) => ({
    category_id: catBySlug[categorySlug],
    name,
    slug,
  }))

  const { data: subs, error: subsError } = await supabase
    .from('subcategories')
    .upsert(rows, { onConflict: 'category_id,slug' })
    .select()
  if (subsError) throw subsError
  console.log(`  ✓ ${subs.length} subcategories`)

  console.log('Done!')
}

seed().catch((e) => {
  console.error(e)
  process.exit(1)
})
