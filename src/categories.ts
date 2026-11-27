// Category catalog: colour, icon, alternative names, and keywords used to guess a recipe's look.
// Any category name not listed here still works; it gets a stable colour from its name and a tag icon.

export interface Hue { fg: string; bg: string; dk: string }
export const HUES: Record<string, Hue> = {
  green:  { fg: '#2f6b4f', bg: '#dff0e5', dk: '#7fd1a6' },
  teal:   { fg: '#0f766e', bg: '#d6f1ec', dk: '#5fd3c6' },
  cyan:   { fg: '#0e7490', bg: '#d5f0f6', dk: '#67d3ec' },
  lime:   { fg: '#4d7c0f', bg: '#e8f3d3', dk: '#a9d861' },
  olive:  { fg: '#5b6b1f', bg: '#eceee0', dk: '#c3d47a' },
  saffron:{ fg: '#b4530a', bg: '#fdead2', dk: '#f6b66b' },
  orange: { fg: '#c2410c', bg: '#fde6d8', dk: '#ff9e6b' },
  red:    { fg: '#c23a2b', bg: '#fde1dc', dk: '#ff8f80' },
  brown:  { fg: '#8a5a1c', bg: '#f5e8d4', dk: '#e0b27a' },
  gold:   { fg: '#a16207', bg: '#faefcc', dk: '#f0c94f' },
  pink:   { fg: '#be185d', bg: '#fbe0ec', dk: '#f58bb8' },
  plum:   { fg: '#86198f', bg: '#f6e2f8', dk: '#e59cf0' },
  violet: { fg: '#7c3aed', bg: '#ede4fd', dk: '#b9a0ff' },
  indigo: { fg: '#4338ca', bg: '#e3e5fc', dk: '#a3a9ff' },
  navy:   { fg: '#1e40af', bg: '#dfe6fb', dk: '#8fa8ff' },
  sky:    { fg: '#0369a1', bg: '#dcedfa', dk: '#7cc4f3' },
  slate:  { fg: '#475569', bg: '#e6eaf0', dk: '#a9b6c8' },
};

export type Group = 'Course' | 'Cuisine' | 'Diet' | 'Main ingredient' | 'Method & occasion';
interface Entry { name: string; group: Group; hue: keyof typeof HUES; icon: string; aliases?: string[]; keywords?: string[] }

const C = (group: Group, name: string, hue: keyof typeof HUES, icon: string, aliases: string[] = [], keywords: string[] = []): Entry =>
  ({ name, group, hue, icon, aliases, keywords });

export const CATALOG: Entry[] = [
  // Courses and dish types
  C('Course', 'Mains', 'green', 'utensils', ['main', 'main course', 'mains', 'dinner', 'dinners', 'entree', 'entrees', 'entrée'], ['lasagna', 'risotto', 'tenderloin', 'casserole', 'pie']),
  C('Course', 'Sides', 'brown', 'carrot', ['side', 'side dish', 'side dishes'], ['roasted potatoes', 'roasted broccoli', 'roasted carrots', 'mashed']),
  C('Course', 'Soup', 'teal', 'soup', ['soups'], ['soup', 'broth', 'bisque', 'chowder', 'potage', 'velouté']),
  C('Course', 'Stews', 'olive', 'pot', ['stew', 'braises', 'braise'], ['stew', 'ragout', 'goulash', 'braised', 'tagine', 'wot']),
  C('Course', 'Salad', 'lime', 'salad', ['salads'], ['salad', 'slaw', 'arugula', 'kale salad']),
  C('Course', 'Bowls', 'cyan', 'bowl', ['bowl', 'buddha bowls', 'grain bowls', 'poke'], ['bowl']),
  C('Course', 'Breakfast', 'sky', 'egg', ['brunch', 'breakfasts'], ['granola', 'pancake', 'waffle', 'oatmeal', 'breakfast', 'omelette', 'huevos']),
  C('Course', 'Snacks', 'orange', 'cookie', ['snack', 'bites'], ['bites', 'balls', 'nuggets', 'patties', 'energy']),
  C('Course', 'Appetizers', 'plum', 'party', ['appetizer', 'starters', 'starter', 'apps', 'tapas', "hors d'oeuvres", 'finger food'], ['bruschetta', 'crostini', 'canapé']),
  C('Course', 'Dips & Spreads', 'olive', 'jar', ['dips', 'dip', 'spreads', 'spread'], ['hummus', 'dip', 'spread', 'creton', 'pâté', 'pate', 'guacamole', 'tzatziki']),
  C('Course', 'Sauces & Dressings', 'violet', 'drop', ['sauces', 'sauce', 'dressings', 'dressing', 'condiments', 'condiment', 'marinades'], ['sauce', 'dressing', 'pesto', 'vinaigrette', 'gravy', 'alfredo', 'marinade']),
  C('Course', 'Pickles & Preserves', 'lime', 'jar', ['pickles', 'preserves', 'canning', 'jams', 'jam', 'ferments'], ['pickled', 'pickle', 'jam', 'preserve', 'chutney', 'kimchi']),
  C('Course', 'Sandwiches & Wraps', 'gold', 'sandwich', ['sandwiches', 'sandwich', 'wraps', 'burgers', 'burger'], ['sandwich', 'wrap', 'burger', 'panini']),
  C('Course', 'Baking', 'gold', 'wheat', ['baked goods', 'baked'], ['muffin', 'crust', 'scone', 'tortillas', 'yeast']),
  C('Course', 'Bread', 'brown', 'bread', ['breads'], ['bread', 'loaf', 'baguette', 'sourdough', 'focaccia', 'naan', 'bagel']),
  C('Course', 'Dessert', 'pink', 'cake', ['desserts', 'sweets', 'sweet', 'treats'], ['cake', 'cookie', 'cookies', 'cheesecake', 'squares', 'brownie', 'tart', 'pudding', 'candied']),
  C('Course', 'Frozen treats', 'sky', 'icecream', ['ice cream', 'popsicles', 'sorbet'], ['ice cream', 'sorbet', 'gelato', 'popsicle']),
  C('Course', 'Drinks', 'indigo', 'cup', ['drink', 'beverages', 'beverage', 'smoothies', 'smoothie', 'juices'], ['milk', 'smoothie', 'horchata', 'juice', 'latte', 'lemonade', 'tea']),
  C('Course', 'Cocktails', 'plum', 'martini', ['cocktail', 'mocktails', 'mocktail', 'drinks & cocktails'], ['cocktail', 'mezcal', 'gin', 'rum', 'vodka', 'tequila', 'whisky', 'whiskey', 'sour']),
  // Cuisines
  C('Cuisine', 'Italian', 'red', 'pizza', ['italy'], ['lasagna', 'risotto', 'parmigiano', 'ragu', 'gnocchi', 'carbonara', 'marinara']),
  C('Cuisine', 'Pasta', 'gold', 'noodles', ['pastas', 'noodles'], ['pasta', 'spaghetti', 'penne', 'macaroni', 'fettuccine', 'linguine', 'noodle']),
  C('Cuisine', 'Pizza', 'red', 'pizza', ['pizzas', 'flatbread'], ['pizza']),
  C('Cuisine', 'French', 'navy', 'croissant', ['france'], ['dauphinoise', 'béchamel', 'bechamel', 'gratin', 'bourguignon', 'ratatouille', 'quiche', 'french']),
  C('Cuisine', 'Spanish', 'orange', 'pepper', ['spain'], ['bravas', 'paella', 'chorizo', 'gazpacho', 'tortilla española']),
  C('Cuisine', 'Greek', 'sky', 'olive', ['greece'], ['feta', 'tzatziki', 'souvlaki', 'moussaka', 'greek']),
  C('Cuisine', 'Mediterranean', 'cyan', 'olive', ['med'], ['olives', 'mediterranean']),
  C('Cuisine', 'Middle Eastern', 'saffron', 'sunMed', ['middle east', 'levantine', 'lebanese', 'persian', 'turkish', 'israeli'], ['shawarma', 'tahini', 'falafel', "za'atar", 'sumac', 'pomegranate molasses']),
  C('Cuisine', 'Moroccan', 'orange', 'sunMed', ['morocco', 'north african'], ['harissa', 'ras el hanout', 'tagine', 'moroccan']),
  C('Cuisine', 'African', 'brown', 'globe', ['ethiopian', 'west african', 'east african', 'nigerian'], ['berbere', 'ethiopian', 'jollof', 'injera', 'african', 'peri peri']),
  C('Cuisine', 'Indian', 'saffron', 'flame', ['india', 'south asian', 'curry', 'curries'], ['curry', 'masala', 'dal', 'paneer', 'tandoori', 'garam masala', 'chana', 'biryani', 'korma', 'vindaloo', 'tikka', 'madras', 'pasanda']),
  C('Cuisine', 'Thai', 'red', 'leaf', ['thailand'], ['thai', 'lemongrass', 'red curry paste', 'green curry', 'tom kha', 'pad thai', 'galangal', 'kaffir']),
  C('Cuisine', 'Chinese', 'red', 'chopsticks', ['china', 'cantonese', 'sichuan', 'szechuan'], ['stir fry', 'stir-fry', 'hoisin', 'bok choy', 'dumpling', 'five spice', 'chow mein', 'kung pao']),
  C('Cuisine', 'Japanese', 'navy', 'chopsticks', ['japan'], ['miso', 'sushi', 'ramen', 'teriyaki', 'tempura', 'udon', 'katsu', 'dashi', 'mirin']),
  C('Cuisine', 'Korean', 'pink', 'pepper', ['korea'], ['gochujang', 'kimchi', 'bulgogi', 'bibimbap', 'gochugaru', 'japchae']),
  C('Cuisine', 'Vietnamese', 'teal', 'noodles', ['vietnam'], ['pho', 'banh mi', 'vermicelli', 'nuoc cham', 'spring rolls']),
  C('Cuisine', 'Asian', 'red', 'chopsticks', ['east asian', 'southeast asian', 'asian fusion'], ['soy sauce', 'sesame oil', 'rice vinegar']),
  C('Cuisine', 'Mexican', 'orange', 'taco', ['mexico', 'tex-mex', 'latin', 'latin american'], ['taco', 'tortilla', 'salsa', 'chipotle', 'enchilada', 'quesadilla', 'huevos rancheros', 'refried', 'horchata', 'burrito', 'guacamole']),
  C('Cuisine', 'Caribbean', 'cyan', 'sunMed', ['jamaican', 'cuban'], ['jerk', 'plantain', 'scotch bonnet']),
  C('Cuisine', 'American', 'navy', 'grill', ['usa', 'southern', 'comfort food'], ['bbq', 'mac and cheese', 'mac & cheese', 'cornbread', 'meatloaf']),
  C('Cuisine', 'Québécois', 'red', 'maple', ['quebec', 'québec', 'quebecois', 'canadian', 'canada', 'french canadian'], ['tourtière', 'tourtiere', 'pea soup', 'creton', 'maple', 'poutine', 'ragoût', 'ragout']),
  C('Cuisine', 'British', 'slate', 'cup', ['english', 'uk', 'irish', 'scottish'], ['cottage pie', "shepherd's pie", 'scone', 'yorkshire', 'bisto']),
  // Diets
  C('Diet', 'Vegetarian', 'lime', 'sprout', ['veggie', 'meatless'], []),
  C('Diet', 'Vegan', 'green', 'sprout', ['plant-based', 'plant based'], ['vegan']),
  C('Diet', 'Healthy', 'teal', 'heartPulse', ['light', 'wholesome', 'lighter', 'clean'], ['healthy']),
  C('Diet', 'Gluten-free', 'gold', 'wheatOff', ['gluten free', 'gf', 'celiac'], ['gluten free', 'gluten-free']),
  C('Diet', 'Dairy-free', 'sky', 'drop', ['dairy free', 'lactose free'], ['dairy-free']),
  C('Diet', 'High protein', 'slate', 'dumbbell', ['protein', 'high-protein'], []),
  C('Diet', 'Low carb', 'cyan', 'gauge', ['keto', 'low-carb'], []),
  // Main ingredients
  C('Main ingredient', 'Chicken', 'gold', 'drumstick', ['poultry', 'turkey'], ['chicken', 'turkey']),
  C('Main ingredient', 'Beef', 'red', 'beef', ['steak'], ['beef', 'steak', 'ground beef']),
  C('Main ingredient', 'Pork', 'pink', 'ham', ['ham', 'bacon', 'sausage'], ['pork', 'bacon', 'ham', 'sausage', 'pancetta']),
  C('Main ingredient', 'Seafood', 'sky', 'fish', ['fish', 'shellfish', 'shrimp', 'salmon'], ['salmon', 'fish', 'shrimp', 'cod', 'tuna', 'prawn', 'mussels', 'scallop']),
  C('Main ingredient', 'Eggs', 'gold', 'egg', ['egg'], ['eggs', 'frittata', 'shakshuka']),
  C('Main ingredient', 'Tofu & Tempeh', 'slate', 'box', ['tofu', 'tempeh', 'seitan'], ['tofu', 'tempeh', 'seitan']),
  C('Main ingredient', 'Beans & Lentils', 'brown', 'bean', ['beans', 'lentils', 'legumes', 'pulses', 'chickpeas'], ['lentils', 'chickpeas', 'kidney beans', 'black beans', 'white beans', 'dal']),
  C('Main ingredient', 'Rice & Grains', 'olive', 'grain', ['rice', 'grains', 'quinoa', 'couscous', 'risotto'], ['rice', 'quinoa', 'couscous', 'millet', 'barley', 'farro', 'bulgur']),
  C('Main ingredient', 'Vegetables', 'green', 'carrot', ['veggies', 'vegetable'], ['zucchini', 'cauliflower', 'eggplant', 'squash', 'sweet potato']),
  C('Main ingredient', 'Fruit', 'pink', 'apple', ['fruits'], ['apple', 'berries', 'strawberries', 'banana', 'lemon', 'peach']),
  C('Main ingredient', 'Cheese', 'gold', 'cheese', ['dairy'], ['cheddar', 'gruyere', 'parmesan', 'goat cheese', 'mozzarella', 'ricotta']),
  // Methods and occasions
  C('Method & occasion', 'Quick', 'orange', 'zap', ['quick & easy', 'easy', 'weeknight', '30 minutes', 'fast'], []),
  C('Method & occasion', 'One-pot', 'brown', 'pot', ['one pot', 'one-pan', 'sheet pan', 'one pan'], ['sheet pan', 'one pot', 'one-pot']),
  C('Method & occasion', 'Slow cooker', 'slate', 'clock', ['crockpot', 'crock pot', 'slow-cooker'], ['slow cooker', 'crockpot']),
  C('Method & occasion', 'Pressure cooker', 'slate', 'gauge', ['instant pot', 'instapot'], ['instant pot', 'pressure cooker']),
  C('Method & occasion', 'Grill & BBQ', 'red', 'grill', ['grill', 'grilling', 'bbq', 'barbecue', 'bbq & grill'], ['grill', 'grilled', 'barbecue']),
  C('Method & occasion', 'Air fryer', 'slate', 'zap', ['airfryer'], ['air fryer']),
  C('Method & occasion', 'Meal prep', 'teal', 'box', ['lunches', 'lunch', 'batch cooking', 'make ahead', 'make-ahead'], ['meal prep', 'lunches']),
  C('Method & occasion', 'Freezer-friendly', 'sky', 'snowflake', ['freezer', 'freezable', 'freezes well'], ['freezes well', 'freeze']),
  C('Method & occasion', 'Holiday', 'red', 'gift', ['holidays', 'christmas', 'thanksgiving', 'easter', 'festive'], ['christmas', 'thanksgiving', 'holiday']),
  C('Method & occasion', 'Party', 'plum', 'party', ['entertaining', 'potluck', 'crowd', 'game day'], ['potluck', 'party']),
  C('Method & occasion', 'Kids', 'sky', 'baby', ['kid-friendly', 'kid friendly', 'family', 'family-friendly'], []),
  C('Method & occasion', 'Techniques', 'slate', 'wrench', ['technique', 'how to', 'how-to', 'basics', 'tips'], ['how to', 'tenderise', 'tenderize']),
];

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();

const INDEX = new Map<string, Entry>();
for (const e of CATALOG) for (const n of [e.name, ...(e.aliases ?? [])]) if (!INDEX.has(norm(n))) INDEX.set(norm(n), e);

export interface Look { name: string; hue: Hue; icon: string; known: boolean }

const HUE_KEYS = Object.keys(HUES);
function hashHue(s: string): Hue {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HUES[HUE_KEYS[h % HUE_KEYS.length]];
}

/** The look of a category name, known or not. */
export function categoryLook(name: string): Look {
  const e = INDEX.get(norm(name));
  if (e) return { name: e.name, hue: HUES[e.hue], icon: e.icon, known: true };
  return { name, hue: hashHue(norm(name)), icon: 'tag', known: false };
}

/** Canonical spelling for a typed category ("soups" -> "Soup"); unknown names are kept as typed. */
export function canonicalCategory(name: string): string {
  return INDEX.get(norm(name))?.name ?? name.trim();
}

// Guessing order: dish types first (most visual), then cuisines, then ingredients.
const GUESS_ORDER: Group[] = ['Course', 'Cuisine', 'Main ingredient', 'Method & occasion', 'Diet'];
const GUESSERS = GUESS_ORDER.flatMap((g) => CATALOG.filter((e) => e.group === g && e.keywords?.length));

/** Best catalog category for free text (title weighs most), or undefined. */
export function guessCategory(title: string, body = ''): Entry | undefined {
  const t = ' ' + norm(title) + ' ';
  const b = ' ' + norm(body) + ' ';
  for (const hay of [t, b]) {
    for (const e of GUESSERS) if (e.keywords!.some((k) => hay.includes(' ' + norm(k) + ' '))) return e;
  }
  return undefined;
}

/** Colour and icon for a recipe: its first category, else a keyword guess, else a stable colour from the title. */
export function recipeLook(r: { title: string; categories: string[]; ingredients?: string[] }): Look {
  if (r.categories.length) {
    // Prefer the first category the catalog knows, so custom labels don't hide a good icon.
    const known = r.categories.map(categoryLook).find((l) => l.known);
    return known ?? categoryLook(r.categories[0]);
  }
  const g = guessCategory(r.title, (r.ingredients ?? []).join(' '));
  if (g) return { name: g.name, hue: HUES[g.hue], icon: g.icon, known: true };
  return { name: '', hue: hashHue(norm(r.title)), icon: 'utensils', known: false };
}

/** CSS variables for a look, used by .tint / .solid classes. */
export function lookVars(l: Look): React.CSSProperties {
  return { ['--cfg' as string]: l.hue.fg, ['--cbg' as string]: l.hue.bg, ['--cdk' as string]: l.hue.dk } as React.CSSProperties;
}
