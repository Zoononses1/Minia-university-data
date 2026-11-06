/* ===== Questionnaire schema – داتا جامعة المنيا =====
   Built from: Zoonotic Salmonella One Health Surveillance, Minya (Forms 1-5)
   Field types: text | number | datetime | date | textarea | radio | multi | subdiv | gps
   u:1  -> identifier field (cleared when a record is duplicated)               */

const YNU = ['Yes', 'No', 'Unknown'];

/* "Subdivisions" (formerly "Markaz") – sorted in Arabic alphabetical order */
const SUBDIVISIONS = [
  { ar: 'أبوقرقاص', en: 'Abu Qurqas' },
  { ar: 'العدوة',   en: 'Edwa' },
  { ar: 'المنيا',   en: 'Minya' },
  { ar: 'بني مزار', en: 'Beni Mazar' },
  { ar: 'دير مواس', en: 'Deir Mawas' },
  { ar: 'سمالوط',   en: 'Samalut' },
  { ar: 'مطاي',     en: 'Matai' },
  { ar: 'مغاغة',    en: 'Maghagha' },
  { ar: 'ملوي',     en: 'Mallawi' }
];

const COMMON = [
  { k: 'sample_id', l: 'Sample / Form ID',            t: 'text', u: 1, req: 1 },
  { k: 'datetime',  l: 'Date and time',               t: 'datetime' },
  { k: 'collector', l: 'Collector',                   t: 'text' },
  { k: 'village',   l: 'Village / locality',          t: 'text' },
  { k: 'subdivision', l: 'Subdivisions',              t: 'subdiv' },
  { k: 'gps',       l: 'GPS (N / E)',                 t: 'gps' },
  { k: 'linked_id', l: 'Linked Farm / Household ID',  t: 'text' }
];

const NOTES = { k: 'notes', l: 'Notes', t: 'textarea' };

const SX_DIARRHEA_H = 'Diarrhea (≥3 loose stools/day)';

const FORMS = {
  /* ---------------------------------------------------------- Form 1 */
  poultry: {
    id: 'poultry', no: 1, en: 'Poultry', ar: 'دواجن', icon: '🐔', common: true,
    note: 'Layers/broilers; caged and litter/land-raised. One form per flock.',
    sections: [
      { t: '1.1 Farm and flock characteristics', f: [
        { k: 'farm_id', l: 'Farm ID (coded)', t: 'text' },
        { k: 'farm_type', l: 'Farm type', t: 'radio', o: ['Commercial', 'Semi-commercial', 'Backyard'] },
        { k: 'prod_type', l: 'Production type', t: 'radio', o: ['Layers', 'Broilers', 'Breeders', 'Other'] },
        { k: 'housing', l: 'Housing system', t: 'radio', o: ['Caged (battery)', 'Floor / litter-raised', 'Land / free-range'] },
        { k: 'n_houses', l: 'No. of houses', t: 'number' },
        { k: 'flock_size', l: 'Total flock size', t: 'number' },
        { k: 'flock_age', l: 'Flock age', t: 'text' },
        { k: 'breed', l: 'Breed / strain', t: 'text' },
        { k: 'chick_source', l: 'Source of chicks / pullets', t: 'radio', o: ['Hatchery', 'Local market', 'Own breeding'] },
        { k: 'hatchery', l: 'Hatchery (name)', t: 'text' },
        { k: 'all_in_out', l: 'All-in all-out system', t: 'radio', o: YNU },
        { k: 'prev_salm', l: 'Previous Salmonella problems on farm', t: 'radio', o: YNU }
      ]},
      { t: '1.2 Health and management', f: [
        { k: 'signs', l: 'Clinical signs in last 4 weeks', t: 'multi',
          o: ['Diarrhea', 'Increased mortality', 'Drop in egg production', 'Respiratory', 'None'], excl: ['None'] },
        { k: 'mortality', l: 'Mortality in current flock (%)', t: 'number' },
        { k: 'vaccination', l: 'Salmonella vaccination', t: 'radio', o: ['Live', 'Inactivated', 'None', 'Unknown'] },
        { k: 'vacc_product', l: 'Vaccine product / date', t: 'text' },
        { k: 'amu', l: 'Antimicrobial use in last 30 days', t: 'radio', o: YNU },
        { k: 'amu_drug', l: 'Antimicrobial drug / class', t: 'text' },
        { k: 'amu_purpose', l: 'Antimicrobial purpose', t: 'text' },
        { k: 'amu_duration', l: 'Antimicrobial duration', t: 'text' },
        { k: 'feed', l: 'Feed source', t: 'radio', o: ['Commercial mill', 'Home-mixed', 'Both'] },
        { k: 'water', l: 'Water source', t: 'radio', o: ['Well', 'Tap', 'Canal / river', 'Tank', 'Other'] },
        { k: 'litter', l: 'Litter management (litter-raised)', t: 'radio', o: ['Reused', 'Changed each cycle', 'Not applicable'] },
        { k: 'disposal', l: 'Manure / dead bird disposal', t: 'text' }
      ]},
      { t: '1.3 Biosecurity', f: [
        { k: 'fence', l: 'Fence / restricted access', t: 'radio', o: YNU },
        { k: 'footbath', l: 'Footbath / disinfection at entrance', t: 'radio', o: YNU },
        { k: 'rodent_ctrl', l: 'Rodent control program', t: 'radio', o: YNU },
        { k: 'wildlife', l: 'Wild birds or rodents seen inside houses', t: 'radio', o: YNU },
        { k: 'other_animals', l: 'Other animals on farm', t: 'multi',
          o: ['Cattle', 'Sheep / goats', 'Dogs / cats', 'Other poultry', 'None'], excl: ['None'] },
        { k: 'n_workers', l: 'Number of workers', t: 'number' },
        { k: 'ppe', l: 'Protective clothing', t: 'text' },
        { k: 'shared_equip', l: 'Equipment / egg trays shared with other farms', t: 'radio', o: YNU }
      ]},
      { t: '1.4 Samples collected', f: [
        { k: 'sample_type', l: 'Sample type', t: 'multi',
          o: ['Boot swab', 'Drag swab', 'Pooled fresh feces', 'Cloacal swab', 'Litter', 'Dead bird organs'] },
        { k: 'n_samples', l: 'No. of samples / pools', t: 'number' },
        { k: 'sample_ids', l: 'Sample IDs', t: 'text', u: 1 }
      ]}
    ],
    badges: d => [d.prod_type, d.housing, ...(d.signs || [])]
  },

  /* ---------------------------------------------------------- Form 2 */
  cattle: {
    id: 'cattle', no: 2, en: 'Cattle', ar: 'ماشية', icon: '🐄', common: true,
    note: 'One herd block plus one animal block per sampled animal (use "Duplicate" for each additional animal).',
    sections: [
      { t: '2.1 Herd characteristics', f: [
        { k: 'herd_id', l: 'Herd ID (coded)', t: 'text' },
        { k: 'herd_size', l: 'Herd size', t: 'number' },
        { k: 'n_lactating', l: 'No. of lactating cows', t: 'number' },
        { k: 'prod_type', l: 'Production type', t: 'radio', o: ['Dairy', 'Beef / fattening', 'Dual purpose'] },
        { k: 'mgmt', l: 'Management system', t: 'radio', o: ['Intensive', 'Semi-intensive', 'Backyard / tethered'] },
        { k: 'replacement', l: 'Source of replacement animals', t: 'radio', o: ['Own herd', 'Market', 'Dealer', 'Imported'] },
        { k: 'poultry_contact', l: 'Contact with poultry (same premises)', t: 'radio', o: YNU },
        { k: 'feed_water', l: 'Feed and water source', t: 'text' },
        { k: 'manure', l: 'Manure management', t: 'multi', o: ['Used as fertilizer', 'Dumped', 'Dried / sold', 'Biogas'] },
        { k: 'milk_use', l: 'Milk use', t: 'multi',
          o: ['Sold raw', 'Pasteurized', 'Home consumption (raw)', 'Home consumption (boiled)'] },
        { k: 'herd_history', l: 'History of abortion / calf diarrhea / mastitis', t: 'radio', o: YNU }
      ]},
      { t: '2.2 Individual animal (one block per sampled animal)', f: [
        { k: 'animal_id', l: 'Animal ID', t: 'text', u: 1 },
        { k: 'age', l: 'Age', t: 'text' },
        { k: 'sex', l: 'Sex', t: 'radio', o: ['Male', 'Female'] },
        { k: 'breed', l: 'Breed', t: 'text' },
        { k: 'physio', l: 'Physiological status', t: 'multi', o: ['Lactating', 'Dry', 'Pregnant', 'Calf', 'Other'] },
        { k: 'bcs', l: 'Body condition (1–5)', t: 'radio', o: ['1', '2', '3', '4', '5'] },
        { k: 'a_symptoms', l: 'Diarrhea / fever at sampling', t: 'multi', o: ['Diarrhea', 'Fever', 'Neither'], excl: ['Neither'] },
        { k: 'amu', l: 'Antimicrobial treatment in last 30 days', t: 'radio', o: YNU },
        { k: 'amu_drug', l: 'Antimicrobial drug', t: 'text' },
        { k: 'sample_type', l: 'Sample type', t: 'multi',
          o: ['Fresh feces (rectal)', 'Floor feces (pooled)', 'Rectal swab', 'Milk'] },
        { k: 'animal_sample_id', l: 'Animal sample ID', t: 'text', u: 1 }
      ]}
    ],
    badges: d => [d.prod_type, ...(d.a_symptoms || []), ...(d.sample_type || [])]
  },

  /* ---------------------------------------------------------- Form 3 */
  human: {
    id: 'human', no: 3, en: 'Human', ar: 'بشر', icon: '🧑‍⚕️', common: true,
    note: 'Coded data only, no names or national IDs. Consent must be signed before sampling.',
    sections: [
      { t: '3.1 Consent and participant', f: [
        { k: 'consent', l: 'Informed consent obtained', t: 'radio', o: ['Yes', 'No (do not sample)'], consent: 1 },
        { k: 'ethics_no', l: 'Ethics approval no.', t: 'text' },
        { k: 'participant_id', l: 'Participant ID (coded, no names)', t: 'text', u: 1 },
        { k: 'age', l: 'Age', t: 'number' },
        { k: 'sex', l: 'Sex', t: 'radio', o: ['Male', 'Female'] },
        { k: 'category', l: 'Participant category', t: 'radio',
          o: ['Gastroenteritis patient', 'Poultry worker', 'Cattle worker', 'Household contact', 'Healthy control'] },
        { k: 'occupation', l: 'Occupation', t: 'text' },
        { k: 'years_occ', l: 'Years in occupation', t: 'number' },
        { k: 'residence', l: 'Residence', t: 'radio', o: ['Urban', 'Rural'] }
      ]},
      { t: '3.2 Clinical information (last 7 days)', f: [
        { k: 'symptoms', l: 'Symptoms', t: 'multi',
          o: [SX_DIARRHEA_H, 'Bloody stool', 'Fever', 'Abdominal pain', 'Vomiting', 'None'], excl: ['None'] },
        { k: 'onset', l: 'Onset date', t: 'date' },
        { k: 'duration', l: 'Duration (days)', t: 'number' },
        { k: 'hosp', l: 'Hospitalized', t: 'radio', o: YNU },
        { k: 'abx', l: 'Antibiotic use in last 14 days', t: 'radio', o: YNU },
        { k: 'abx_drug', l: 'Antibiotic drug', t: 'text' },
        { k: 'hh_similar', l: 'Other household members with similar symptoms', t: 'radio', o: YNU }
      ]},
      { t: '3.3 Exposure', f: [
        { k: 'contact', l: 'Daily contact with poultry / cattle', t: 'radio', o: ['Poultry', 'Cattle', 'Both', 'None'] },
        { k: 'keeps_animals', l: 'Keeps poultry / livestock at home', t: 'radio', o: YNU },
        { k: 'handwash', l: 'Hand washing after animal contact', t: 'radio', o: ['Always', 'Sometimes', 'Never'] },
        { k: 'ppe', l: 'Protective clothing / gloves used', t: 'radio', o: ['Always', 'Sometimes', 'Never'] },
        { k: 'foods', l: 'Foods consumed in last 7 days', t: 'multi',
          o: ['Raw / undercooked eggs', 'Undercooked poultry', 'Raw milk / unpasteurized dairy', 'Raw meat / liver', 'Street food / restaurant'] },
        { k: 'water', l: 'Drinking water source', t: 'radio', o: ['Tap', 'Well', 'Bottled', 'Filtered', 'Other'] },
        { k: 'toilet', l: 'Toilet / sanitation type', t: 'text' }
      ]},
      { t: '3.4 Sample', f: [
        { k: 'sample_type', l: 'Sample type', t: 'radio', o: ['Stool', 'Rectal swab'] },
        { k: 'sample_dt', l: 'Sample date / time', t: 'datetime' },
        { k: 'human_sample_id', l: 'Sample ID', t: 'text', u: 1 }
      ]}
    ],
    badges: d => [d.category, ...(d.symptoms || [])]
  },

  /* ---------------------------------------------------------- Form 4 */
  environment: {
    id: 'environment', no: 4, en: 'Environment', ar: 'بيئة', icon: '🌍', common: true,
    note: 'One form per environmental sample.',
    sections: [
      { t: '4.1 Environmental sample', f: [
        { k: 'env_id', l: 'Environmental Sample ID', t: 'text', u: 1 },
        { k: 'source_site', l: 'Source site', t: 'radio',
          o: ['Poultry farm', 'Cattle farm', 'Household', 'Market / slaughter point', 'Water body / drain'] },
        { k: 'sample_type', l: 'Sample type', t: 'radio',
          o: ['Litter / bedding', 'Floor / drag swab', 'Drinking water', 'Feed', 'Manure heap / slurry', 'Soil',
              'Drain / wastewater', 'Surface swab (cage, tray, boots, hands)', 'Rodent droppings', 'Flies', 'Eggshell'] },
        { k: 'exact_loc', l: 'Exact location within site', t: 'text' },
        { k: 'quantity', l: 'Quantity (g / mL) or area swabbed (cm²)', t: 'text' },
        { k: 'water_source', l: 'Water source (if water)', t: 'radio', o: ['Well', 'Tap', 'Canal / river', 'Tank', 'Other'] },
        { k: 'chlorinated', l: 'Chlorinated', t: 'radio', o: YNU },
        { k: 'cleaning', l: 'Cleaning / disinfection status at sampling', t: 'radio',
          o: ['Before cleaning', 'After cleaning', 'Not cleaned'] },
        { k: 'temp', l: 'Ambient temperature (°C)', t: 'number' },
        { k: 'rain48', l: 'Rainfall in last 48 h', t: 'text' },
        { k: 'distance', l: 'Distance to nearest other animal / human site (m)', t: 'number' }
      ]}
    ],
    badges: d => [d.source_site, d.sample_type]
  },

  /* ---------------------------------------------------------- Form 5 */
  lab: {
    id: 'lab', no: 5, en: 'Laboratory', ar: 'معمل', icon: '🧪', common: false,
    note: 'Isolation and AST on all/most samples; serology, PCR (invA), MLST and WGS on selected isolates only. One row per sample.',
    sections: [
      { t: 'Laboratory tracking sheet', f: [
        { k: 'sample_id', l: 'Sample ID', t: 'text', u: 1, req: 1 },
        { k: 'sector', l: 'Sector / type', t: 'radio', o: ['Poultry', 'Cattle', 'Human', 'Environment'] },
        { k: 'isolation', l: 'Isolation (+/–)', t: 'radio', o: ['+', '–'] },
        { k: 'serovar', l: 'Serovar', t: 'text' },
        { k: 'ast', l: 'AST', t: 'text' },
        { k: 'inva', l: 'invA PCR', t: 'radio', o: ['+', '–', 'Not done'] },
        { k: 'mlst', l: 'MLST', t: 'text' },
        { k: 'wgs', l: 'WGS', t: 'text' }
      ]}
    ],
    badges: d => [d.sector, d.isolation ? 'Isolation ' + d.isolation : '', d.serovar, d.inva ? 'invA ' + d.inva : '']
  }
};

const FORM_ORDER = ['poultry', 'cattle', 'human', 'environment', 'lab'];

function fieldsOf(form) {
  const out = [];
  if (form.common) out.push(...COMMON);
  form.sections.forEach(s => out.push(...s.f));
  out.push(NOTES);
  return out;
}

/* Quick classification presets (sector + conditions) */
const PRESETS = [
  { l: 'بشر · حمى',                 s: 'human',    c: [['symptoms', 'Fever']] },
  { l: 'بشر · إسهال',               s: 'human',    c: [['symptoms', SX_DIARRHEA_H]] },
  { l: 'بشر · دم في البراز',         s: 'human',    c: [['symptoms', 'Bloody stool']] },
  { l: 'بشر · عمال دواجن',          s: 'human',    c: [['category', 'Poultry worker']] },
  { l: 'دواجن · إسهال',             s: 'poultry',  c: [['signs', 'Diarrhea']] },
  { l: 'دواجن · نفوق زائد',          s: 'poultry',  c: [['signs', 'Increased mortality']] },
  { l: 'دواجن · بياض',              s: 'poultry',  c: [['prod_type', 'Layers']] },
  { l: 'دواجن · تسمين',             s: 'poultry',  c: [['prod_type', 'Broilers']] },
  { l: 'ماشية · إسهال',             s: 'cattle',   c: [['a_symptoms', 'Diarrhea']] },
  { l: 'ماشية · حمى',               s: 'cattle',   c: [['a_symptoms', 'Fever']] },
  { l: 'بيئة · مياه شرب',            s: 'environment', c: [['sample_type', 'Drinking water']] },
  { l: 'معمل · عزل موجب',           s: 'lab',      c: [['isolation', '+']] },
  { l: 'معمل · عزل سالب',           s: 'lab',      c: [['isolation', '–']] }
];
