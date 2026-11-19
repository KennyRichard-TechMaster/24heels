const { db } = require('../lib/database');
const { buildCatalogue, downloadNigeriaLocations } = require('../lib/delivery-catalogue');

async function main() {
  const source = await downloadNigeriaLocations();
  const areas = buildCatalogue(source);
  const sql = db();
  await sql`ALTER TABLE delivery_areas ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'Lagos'`;
  await sql`DELETE FROM delivery_areas`;
  for (const area of areas) await sql`INSERT INTO delivery_areas(id,state,name,lga,zone,price,enabled,sort,bus_stops) VALUES(${area.id},${area.state},${area.name},${area.lga},${area.zone},${area.price},${area.enabled},${area.sort},${JSON.stringify(area.busStops)}::jsonb)`;
  console.log(`Seeded ${areas.length} delivery areas across ${source.states.length} states and territories.`);
}
main().catch(error => { console.error(error); process.exit(1); });
