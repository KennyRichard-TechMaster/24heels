const SOURCE_URL = 'https://raw.githubusercontent.com/ayoolaowoilu/Nigeria-Locations-Dataset-2026-API/main/nigeria_locations.json';

// These are ceilings supplied by 24 Heelz NG. Every generated area has an
// individual amount and nothing is allowed to exceed its state's ceiling.
const STATE_MAXIMUMS = {
  Abia: 4000, Adamawa: 6000, 'Akwa Ibom': 4000, Anambra: 4000, Bauchi: 6000,
  Bayelsa: 4000, Benue: 5000, Borno: 6000, 'Cross River': 4000, Delta: 4000,
  Ebonyi: 4000, Edo: 4000, Ekiti: 3500, Enugu: 4000, 'FCT Abuja': 5000,
  Gombe: 6000, Imo: 4000, Jigawa: 6000, Kaduna: 6000, Kano: 6000,
  Katsina: 6000, Kebbi: 6000, Kogi: 5000, Kwara: 3500, Nasarawa: 5000,
  Niger: 5000, Ogun: 3500, Ondo: 3500, Osun: 3500, Oyo: 3500,
  Plateau: 5000, Rivers: 4000, Sokoto: 6000, Taraba: 5000, Yobe: 6000,
  Zamfara: 6000,
};

const slug = value => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const key = value => String(value).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const unique = values => [...new Set(values.filter(Boolean))];

// Curated Lagos landmarks used before the customer adds the exact house/street.
// The rest of Nigeria retains the town and LGA centre as searchable landmark
// suggestions, while customers may still type a more precise landmark.
const LAGOS_LANDMARKS = {
  'Lekki Phase 1': ['Lekki Phase 1 Gate', 'Admiralty Way', 'Circle Mall', 'Lekki First Gate'],
  'Lekki Phase 2': ['Lekki Phase 2 Gate', 'Jakande Roundabout', 'Chevron Drive', 'Ikate Gate'],
  'Lekki Phase 3': ['Lekki Phase 3 Gate', 'Freedom Way', 'Admiralty Way'],
  'Victoria Island': ['Law School', 'Eko Hotel Roundabout', 'Adeola Odeku', 'Ahmadu Bello Way'],
  'Eko Atlantic': ['Eko Atlantic City Gate', 'Eko Pearl Towers', 'Bar Beach'],
  Ikoyi: ['Falomo Roundabout', 'Ikoyi Club', 'Dolphin Estate', 'Obalende'],
  Obalende: ['Obalende Bus Stop', 'Law School', 'Falomo Roundabout'],
  Marina: ['Marina Bus Stop', 'CMS Bus Stop', 'Tafawa Balewa Square'],
  Idumota: ['Idumota Bus Stop', 'Eko Idumota', 'Tinubu Square'],
  'Lagos Island': ['CMS Bus Stop', 'Tinubu Square', 'Obalende Bus Stop'],
  Ajah: ['Ajah Roundabout', 'Ado Road Junction', 'Badore Road'],
  Sangotedo: ['Sangotedo Bus Stop', 'Novare Mall', 'Monastery Road'],
  Awoyaya: ['Awoyaya Bus Stop', 'Mayfair Gardens', 'Abraham Adesanya'],
  'Ibeju-Lekki': ['Eleko Junction', 'Free Trade Zone Gate', 'Lakowe Lakes'],
  Ikeja: ['Computer Village', 'Alausa Bus Stop', 'Ikeja Along'],
  Maryland: ['Maryland Bus Stop', 'Maryland Mall', 'Anthony Bus Stop'],
  Magodo: ['Magodo Gate', 'CMD Road', 'Shangisha Bus Stop'],
  Ojodu: ['Ojodu Berger', 'Omole Gate', 'Grammar School Bus Stop'],
  Berger: ['Berger Bus Stop', 'Ojodu Berger', 'Kara Bridge'],
  Ogba: ['Ogba Bus Stop', 'Excellence Hotel', 'Ikeja City Mall'],
  Alimosho: ['Iyana Ipaja Bus Stop', 'Egbeda Bus Stop', 'Ikotun Roundabout'],
  Ejigbo: ['Ejigbo Bus Stop', 'NNPC Junction', 'Jakande Gate'],
  Idimu: ['Idimu Bus Stop', 'Council Bus Stop', 'Powerline'],
  Surulere: ['Ojuelegba Bus Stop', 'National Stadium', 'Bode Thomas'],
  Yaba: ['Yaba Bus Stop', 'Sabo Bus Stop', 'Adekunle Bus Stop'],
  'Festac Town': ['First Gate', 'Second Avenue', 'Apple Junction'],
  'Amuwo Odofin': ['Apple Junction', 'Festac First Gate', 'Mile 2'],
  Apapa: ['Apapa Under Bridge', 'Liverpool Bus Stop', 'Tincan First Gate'],
  Ojo: ['Ojo Barracks', 'Iyana Iba', 'Alaba International'],
  Ikorodu: ['Ikorodu Garage', 'Benson Bus Stop', 'Agric Bus Stop'],
  Badagry: ['Badagry Roundabout', 'Ajara Bus Stop', 'Ibereko Bus Stop'],
};

const LAGOS_PRICES = [
  [3500, ['Lekki Phase 1','Lekki Phase 2','Lekki Phase 3','Admiralty Way','Fola Osibo','Jakande','Elegushi','Ikate','Ikate Elegushi','Oniru','Maroko','Ologolo']],
  [4000, ['Agungi','Osapa London','Chisco','Chevron','Conservation Road','Igbo Efon','Idado','Ilasan','Lafiaji','Orchid Road','Oral Estate','Chevy View Estate','Lekki County','Mayfair Gardens','Ikota','VGC','Victoria Garden City']],
  [5000, ['Ajah','Ado','Badore','Addo Road','Abraham Adesanya','Ogombo','Langbasa','Okun-Ajah','Sangotedo','Eputu','Awoyaya','Lakowe','Bogije','Eleko','Monastery Road']],
  [3500, ['Victoria Island','Eko Atlantic','Adeola Odeku','Ahmadu Bello Way','Ozumba Mbadiwe','Ligali Ayorinde','Kuramo','Bar Beach','Bonny Camp','Falomo']],
  [3500, ['Ikoyi','Old Ikoyi','Banana Island','Parkview Estate','Osborne']],
  [2000, ['Marina','Broad Street','Balogun','Idumota','Obalende','Isale Eko','CMS','Tinubu Square','Campos','Adeniji Adele','Ebute Ero','Oke Arin','Sandgrouse','Idumagbo','Ereko']],
  [8500, ['Ibeju','Akodo','Free Trade Zone','Iwerekun','Orimedu','Ise','Epe','Eredo','Igbonla','Poka','Ketu-Epe','Odomola']],
  [3500, ['Surulere','Aguda','Bode Thomas','Ojuelegba','Ijesha','Itire','Lawanson','Coker','Masha','Stadium']],
  [3500, ['Yaba','Sabo','Jibowu','Akoka','Onike','Alagomeji','Abule Ijesha','Iwaya','Unilag','Shomolu','Bariga','Pedro']],
  [5000, ['Agege','Dopemu','Pen Cinema','Abule Egba','Iyana Ipaja','Ipaja','Ayobo','Egbeda','Akowonjo','Shasha']],
  [4000, ['Mushin','Idi Oro','Ilasamaja','Oshodi','Bolade','Mafoluku','Isolo','Okota','Ajao Estate','Papa Ajao']],
  [4000, ['Gbagada','Ketu','Ojota','Ogudu','Anthony','Palmgrove','Mile 12']],
  [4000, ['Apapa','Apapa GRA','Ajegunle','Boundary','Tincan','Kirikiri','Olodi Apapa','Ijora']],
  [4500, ['Festac','Festac Town','Amuwo Odofin','Mile 2','Satellite Town','Trade Fair','Apple Junction','Ago Palace','Alakija','Iba']],
  [6000, ['Ojo','Iyana Iba','Okokomaiko','Alaba International','LASU','Ajangbadi','Isashi','Badagry']],
  [6000, ['Ikorodu','Agric','Igbogbo','Ipakodo','Ebute','Owutu','Maya','Odogunyan']],
];

const lagosPrice = (name, lga = '') => {
  // Eleko occurs in two customer-supplied groups; the Ibeju-Lekki address is
  // the farther one, while any other matching Eleko keeps the lower ceiling.
  if (key(name) === 'eleko' && /ibeju/i.test(lga)) return 8500;
  return (LAGOS_PRICES.find(([, names]) => names.some(area => key(area) === key(name))) || [4000])[0];
};
const genericLandmarks = (state, lga, area) => unique([LAGOS_LANDMARKS[area], LAGOS_LANDMARKS[lga], area, lga, `${lga} Secretariat`].flat());

function makeRecord(state, lga, area, price, sort) {
  return { id: `ng-${slug(state)}-${slug(lga)}-${slug(area)}`, state, name: area, lga, zone: state === 'Lagos' ? 'Lagos' : state, price, enabled: true, sort, busStops: genericLandmarks(state, lga, area) };
}

function buildCatalogue(source) {
  const rows = [];
  const states = source.states || [];
  for (const item of states) {
    const state = item.name === 'Federal Capital Territory' ? 'FCT Abuja' : item.name;
    const maximum = STATE_MAXIMUMS[state] || 5000;
    for (const lga of item.lgas || []) for (const area of unique([...(lga.areas || []), lga.name])) {
      const capitalArea = key(area) === key(item.capital) || key(lga.name) === key(item.capital);
      const price = state === 'Lagos' ? lagosPrice(area, lga.name) : Math.max(500, maximum - (capitalArea ? 500 : 0));
      rows.push(makeRecord(state, lga.name, area, price, rows.length));
    }
  }
  const lagoon = states.find(item => item.name === 'Lagos');
  const knownLgas = new Map((lagoon?.lgas || []).flatMap(lga => (lga.areas || []).map(area => [key(area), lga.name])));
  for (const [, areas] of LAGOS_PRICES) for (const area of areas) if (!rows.some(row => row.state === 'Lagos' && key(row.name) === key(area))) { const lga = knownLgas.get(key(area)) || 'Eti-Osa'; rows.push(makeRecord('Lagos', lga, area, lagosPrice(area, lga), rows.length)); }
  return rows;
}

async function downloadNigeriaLocations(url = process.env.NIGERIA_LOCATIONS_URL || SOURCE_URL) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download Nigeria locations (${response.status})`);
  const source = await response.json();
  const lgaCount = (source.states || []).reduce((count, state) => count + (state.lgas || []).length, 0);
  if (!Array.isArray(source.states) || source.states.length !== 37 || lgaCount !== 774) throw new Error('Nigeria locations data is incomplete');
  return source;
}

module.exports = { SOURCE_URL, STATE_MAXIMUMS, buildCatalogue, downloadNigeriaLocations };
