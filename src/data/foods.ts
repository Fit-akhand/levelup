// Common Indian foods with APPROXIMATE nutrition per household serving ("katori" = small bowl,
// about 150 ml). Real values vary with recipe and oil used; costs are rough rupee estimates
// and vary by city and season. DRAFT: a registered dietitian must review before launch.
import type { Allergen, DietPref, Food } from "@/lib/types";

// f(id, name, unit, plural, step, kcal, protein, carbs, fat, cost, diet, allergens)
function f(
  id: string, name: string, unit: string, unitPlural: string, step: number,
  kcal: number, protein: number, carbs: number, fat: number,
  cost: number, diet: DietPref = "veg", allergens: Allergen[] = [],
): Food {
  return { id, name, unit, unitPlural, step, kcal, protein, carbs, fat, cost, diet, allergens };
}

export const foods: Food[] = [
  // Grains & breads
  f("roti", "Roti (whole wheat)", "roti", "roti", 1, 120, 3.5, 22, 2, 3, "veg", ["gluten"]),
  f("jowar-roti", "Jowar roti", "roti", "roti", 1, 110, 3, 23, 0.7, 4),
  f("rice", "Steamed rice", "katori", "katori", 0.5, 195, 4, 43, 0.5, 4),
  f("veg-pulao", "Vegetable pulao", "plate", "plates", 0.5, 280, 6, 48, 7, 14),
  f("khichdi", "Moong dal khichdi", "katori", "katori", 0.5, 210, 8, 38, 3, 10),
  f("bread", "Brown bread", "slice", "slices", 1, 75, 3, 13, 1, 3, "veg", ["gluten"]),
  // Dals, legumes, soya
  f("dal", "Dal (toor / moong)", "katori", "katori", 0.5, 140, 8, 20, 3, 7),
  f("rajma", "Rajma curry", "katori", "katori", 0.5, 190, 9, 27, 5, 10),
  f("chole", "Chole (chickpea curry)", "katori", "katori", 0.5, 210, 10, 28, 6, 10),
  f("soya", "Soya chunks curry", "katori", "katori", 0.5, 150, 16, 12, 4, 10),
  f("boiled-chana", "Boiled chana (salted)", "katori", "katori", 0.5, 165, 9, 27, 2.6, 8),
  f("sprouts", "Sprouts salad", "bowl", "bowls", 0.5, 110, 8, 18, 1, 8),
  // Vegetables
  f("mixveg", "Mixed vegetable sabzi", "katori", "katori", 0.5, 100, 3, 12, 5, 9),
  f("salad", "Cucumber-tomato salad", "plate", "plates", 0.5, 35, 1.5, 7, 0.3, 6),
  // Dairy & eggs & meat
  f("paneer", "Paneer sabzi", "katori", "katori", 0.5, 240, 12, 8, 18, 30, "veg", ["dairy"]),
  f("curd", "Curd (dahi)", "katori", "katori", 0.5, 65, 3.5, 5, 3.3, 6, "veg", ["dairy"]),
  f("lassi", "Salted lassi / chaas", "glass", "glasses", 1, 50, 3, 5, 1.5, 5, "veg", ["dairy"]),
  f("milk", "Milk (toned)", "glass", "glasses", 0.5, 120, 6.5, 9.5, 6, 13, "veg", ["dairy"]),
  f("egg", "Boiled egg", "egg", "eggs", 1, 78, 6.3, 0.6, 5.3, 7, "egg"),
  f("omelette", "Masala omelette (2 eggs)", "omelette", "omelettes", 1, 200, 13, 2, 15, 17, "egg"),
  f("egg-curry", "Egg curry (2 eggs)", "katori", "katori", 0.5, 230, 14, 6, 16, 20, "egg"),
  f("chicken", "Chicken curry (about 100 g chicken)", "katori", "katori", 0.5, 200, 22, 4, 10, 38, "nonveg"),
  f("fish", "Fish curry (about 100 g fish)", "katori", "katori", 0.5, 160, 20, 3, 7, 40, "nonveg"),
  // Breakfast items
  f("poha", "Vegetable poha", "plate", "plates", 0.5, 250, 5, 45, 6, 9, "veg", ["peanuts"]),
  f("upma", "Vegetable upma", "plate", "plates", 0.5, 230, 5, 35, 8, 8, "veg", ["gluten"]),
  f("idli", "Idli", "idli", "idli", 1, 60, 2, 12, 0.3, 3),
  f("sambar", "Sambar", "katori", "katori", 0.5, 90, 4, 14, 2, 6),
  f("dosa", "Plain dosa", "dosa", "dosa", 1, 130, 3, 22, 3, 6),
  f("oats", "Oats porridge with milk", "bowl", "bowls", 0.5, 240, 10, 35, 7, 16, "veg", ["dairy", "gluten"]),
  f("besan-chilla", "Besan chilla", "chilla", "chilla", 1, 110, 5, 13, 4, 5),
  f("moong-chilla", "Moong dal chilla", "chilla", "chilla", 1, 100, 6, 12, 2.5, 6),
  f("pb", "Peanut butter", "tbsp", "tbsp", 1, 95, 4, 3, 8, 6, "veg", ["peanuts"]),
  // Snacks & fruit
  f("peanuts", "Roasted peanuts", "handful", "handfuls", 0.5, 170, 8, 5, 14, 5, "veg", ["peanuts"]),
  f("chana-roast", "Roasted chana", "handful", "handfuls", 0.5, 110, 6, 18, 1.5, 4),
  f("makhana", "Roasted makhana", "handful", "handfuls", 0.5, 105, 3, 23, 0.2, 14),
  f("sattu", "Sattu drink", "glass", "glasses", 1, 130, 7, 20, 2, 6),
  f("banana", "Banana", "banana", "bananas", 1, 105, 1.3, 27, 0.4, 6),
  f("fruit", "Seasonal fruit (guava / apple / papaya)", "bowl", "bowls", 0.5, 80, 1, 19, 0.5, 15),
  f("dates", "Dates", "date", "dates", 1, 25, 0.2, 6.6, 0, 3),
];

export const foodById = new Map(foods.map((x) => [x.id, x]));
