import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_KEY!
);

// AK-47 def_index=7, Redline paint_index=282
const { data: item, error: itemError } = await supabase
  .from("items")
  .upsert(
    {
      def_index: 7,
      paint_index: 282,
      market_hash_name: "AK-47 | Redline",
      float_min: 0.15,
      float_max: 0.38,
      is_stattrak: false,
      is_souvenir: false,
      image_url:
        "i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Dx60noTyLwlcK3wiFO0POlPPNSI_-RHGavzOtyufRkASq2lkxx4W-HnNyqJC3FZwYoC5p0Q7FfthW6wdWxPu-371Pdit5HnyXgznQeHYY5wyA/330x192?allow_animated=1",
    },
    { onConflict: "def_index,paint_index" }
  )
  .select("id")
  .single();

if (itemError) throw itemError;
console.log("Item id:", item.id);

const { error: priceError } = await supabase
  .from("float_prices")
  .upsert(
    { item_id: item.id, float_value: 0.15, price: 6000 },
    { onConflict: "item_id,float_value" }
  );

if (priceError) throw priceError;
console.log("Done! AK-47 | Redline float=0.15 price=6000");
