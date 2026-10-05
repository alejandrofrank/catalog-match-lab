// Newly authored illustrative records. These are not captured model outputs.
export const provenance = {
  kind: 'illustrative',
  label: 'Illustrative records · offline',
  description: 'Hand-authored titles and attributes demonstrate the fields used by Bakiano enrichment. No saved warehouse data or model response is included.',
  schemaVersion: 4,
};
const attributes = (product_type, subtype, extra = {}) => ({
  product_type, subtype, brand: null, brand_confidence: null,
  variant: null, state: null, base_ingredient: null,
  unit: 'g', weight_grams: null, pack_count: 1,
  type_confidence: 'high', size_confidence: 'high', ...extra,
});
const listing = (id, name, enriched) => ({ id, raw: { product_name: name }, enriched });
export const experiments = [
  {
    id: 'egg-protein', title: 'Egg ≠ egg protein', topic: 'Identity / ingredient',
    question: 'Does mentioning egg make a product an egg?',
    explanation: 'A person reads “proteína de huevo” as a supplement. The system needs the identity and ingredient in separate fields to exclude it from an egg search.',
    term: 'huevo', filter: { product_type: 'eggs', subtype: 'egg' },
    focus: ['product_type', 'subtype', 'base_ingredient'],
    lesson: 'The supplement is protein_powder. Huevo describes its ingredient, not its product identity.',
    products: [
      listing('eggs', 'HUEVOS BLANCOS X12', attributes('eggs', 'egg', { unit: 'unit', pack_count: 12, state: 'fresh' })),
      listing('egg-protein', 'PROTEINA DE HUEVO 250 G', attributes('other', 'protein_powder', { weight_grams: 250, state: 'powdered', base_ingredient: 'huevo' })),
    ],
  },
  {
    id: 'chicken-flavor', title: 'Chicken ≠ chicken flavor', topic: 'Identity / flavor',
    question: 'Why would a chicken search return soup and pet food?',
    explanation: 'The word pollo is useful for finding candidates. It also appears as a flavor in unrelated products. Enrichment makes those roles queryable.',
    term: 'pollo', filter: { product_type: 'poultry', subtype: 'whole_chicken' },
    focus: ['product_type', 'subtype', 'variant'],
    lesson: 'Pollo as a flavor does not turn soup_mix or dog_food into whole_chicken.',
    products: [
      listing('chicken', 'POLLO ENTERO FRESCO 1 KG', attributes('poultry', 'whole_chicken', { weight_grams: 1000, state: 'fresh' })),
      listing('soup', 'SOPA INSTANTANEA SABOR A POLLO 70 G', attributes('condiment', 'soup_mix', { weight_grams: 70, state: 'powdered', variant: 'pollo' })),
      listing('pet', 'ALIMENTO PARA PERROS SABOR POLLO 2 KG', attributes('pet', 'dog_food', { weight_grams: 2000, variant: 'pollo' })),
    ],
  },
  {
    id: 'milk-powder', title: 'Milk: liquid or powder?', topic: 'Subtype / presentation',
    question: 'Are these two “leche completa” listings comparable?',
    explanation: 'The same formulation words describe liquid milk and powdered milk. A useful record separates the product subtype, state and measurement dimension.',
    term: 'leche', filter: { product_type: 'dairy', subtype: 'whole_milk' },
    focus: ['subtype', 'state', 'unit'],
    lesson: 'Whole milk in ml and powdered_milk in g are different presentations. The shared formulation does not establish equivalence.',
    products: [
      listing('liquid', 'LECHE COMPLETA LOMA UHT 1 LT', attributes('dairy', 'whole_milk', { brand: 'loma', brand_confidence: 'high', unit: 'ml', weight_grams: 1000 })),
      listing('powder', 'LECHE COMPLETA LOMA BOLSA 900 GR', attributes('dairy', 'powdered_milk', { brand: 'loma', brand_confidence: 'high', weight_grams: 900, state: 'powdered', variant: 'completa' })),
    ],
  },
  {
    id: 'milk-synonyms', title: 'Entera = completa', topic: 'Synonyms / normalization',
    question: 'Can different names describe the same milk?',
    explanation: 'Word order, formulation synonyms and unit spellings differ. Both records can still resolve to the same typed presentation.',
    term: 'entera', filter: { product_type: 'dairy', subtype: 'whole_milk' },
    focus: ['subtype', 'unit', 'weight_grams'],
    lesson: 'Entera and completa both become whole_milk. 1 LT and 1000cc both become 1000 ml. Enrichment can recover matches as well as reject them.',
    products: [
      listing('whole', 'LECHE ENTERA ESTERILIZADA LOMA 1 LT', attributes('dairy', 'whole_milk', { brand: 'loma', brand_confidence: 'high', unit: 'ml', weight_grams: 1000 })),
      listing('complete', 'LOMA LECHE COMPLETA UHT 1000cc', attributes('dairy', 'whole_milk', { brand: 'loma', brand_confidence: 'high', unit: 'ml', weight_grams: 1000 })),
    ],
  },
  {
    id: 'arequipe', title: 'Arequipe = dulce de leche', topic: 'Semantic identity',
    question: 'What if the titles share no product word?',
    explanation: 'A raw arequipe filter misses the listing called dulce de leche. A normalized subtype gives both titles a common identity.',
    term: 'arequipe', filter: { product_type: 'dairy', subtype: 'arequipe' },
    focus: ['product_type', 'subtype', 'base_ingredient'],
    lesson: 'Dulce de leche and arequipe resolve to arequipe. This is a semantic identity, not merely matching the word leche.',
    products: [
      listing('arequipe', 'AREQUIPE LOMA 400 G', attributes('dairy', 'arequipe', { brand: 'loma', brand_confidence: 'high', weight_grams: 400, base_ingredient: 'leche', state: 'prepared' })),
      listing('dulce', 'DULCE DE LECHE LOMA 400 GR', attributes('dairy', 'arequipe', { brand: 'loma', brand_confidence: 'high', weight_grams: 400, base_ingredient: 'leche', state: 'prepared' })),
    ],
  },
  {
    id: 'tomato-state', title: 'Fresh ≠ canned', topic: 'Identity / state',
    question: 'Does the same product family imply the same presentation?',
    explanation: 'Both listings are tomato. A fresh-produce query must also inspect state so canned tomatoes do not silently enter the comparison.',
    term: 'tomate', filter: { product_type: 'produce', subtype: 'tomato', state: 'fresh' },
    focus: ['subtype', 'state'],
    lesson: 'State changes the presentation while subtype stays tomato. Ingredient identity and retail presentation answer different questions.',
    products: [
      listing('fresh-tomato', 'TOMATE ENTERO FRESCO 400 G', attributes('produce', 'tomato', { weight_grams: 400, state: 'fresh' })),
      listing('canned-tomato', 'TOMATE ENTERO PELADO EN LATA 400 G', attributes('produce', 'tomato', { weight_grams: 400, state: 'canned' })),
    ],
  },
  {
    id: 'missing-size', title: 'Unknown stays unknown', topic: 'Missing evidence',
    question: 'What if enrichment still lacks the package size?',
    explanation: 'Knowing the product family helps search. It does not establish exact presentation identity when one listing has no reliable size.',
    term: 'leche', filter: { product_type: 'dairy', subtype: 'whole_milk' },
    focus: ['weight_grams', 'size_confidence'],
    lesson: 'Both are whole_milk candidates. The exact comparison stays in Review until the missing size is verified.',
    products: [
      listing('known-size', 'LECHE ENTERA LOMA 1 L', attributes('dairy', 'whole_milk', { brand: 'loma', brand_confidence: 'high', unit: 'ml', weight_grams: 1000 })),
      listing('unknown-size', 'LECHE ENTERA LOMA', attributes('dairy', 'whole_milk', { brand: 'loma', brand_confidence: 'high', unit: 'ml', size_confidence: 'low' })),
    ],
  },
];
