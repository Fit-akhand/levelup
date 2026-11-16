// Meal combos: realistic Indian meals built from the foods in foods.ts. The planner scales the
// portions of a combo up or down to hit a calorie target; nutrition is always computed from the
// food list (never typed by hand), so the numbers stay consistent.
// A combo's diet type and allergens are derived from its foods automatically.
import type { MealCombo, MealSlot } from "@/lib/types";

function m(slot: MealSlot, id: string, name: string, items: [string, number][]): MealCombo {
  return { id, slot, name, items: items.map(([foodId, qty]) => ({ foodId, qty })) };
}

export const meals: MealCombo[] = [
  // ───────────── Breakfast ─────────────
  m("breakfast", "b-poha-sprouts", "Poha with sprouts", [["poha", 1], ["sprouts", 0.5]]),
  m("breakfast", "b-poha-egg", "Poha with boiled eggs", [["poha", 1], ["egg", 2]]),
  m("breakfast", "b-idli-sambar", "Idli and sambar", [["idli", 3], ["sambar", 1]]),
  m("breakfast", "b-dosa-sambar", "Dosa and sambar", [["dosa", 2], ["sambar", 1]]),
  m("breakfast", "b-besan-curd", "Besan chilla with curd", [["besan-chilla", 2], ["curd", 1]]),
  m("breakfast", "b-besan-sprouts", "Besan chilla with sprouts salad", [["besan-chilla", 2], ["sprouts", 1]]),
  m("breakfast", "b-moong-curd", "Moong dal chilla with curd", [["moong-chilla", 2], ["curd", 1]]),
  m("breakfast", "b-moong-salad", "Moong dal chilla with salad", [["moong-chilla", 3], ["salad", 1]]),
  m("breakfast", "b-oats-banana", "Oats porridge with banana", [["oats", 1], ["banana", 1]]),
  m("breakfast", "b-upma-egg", "Upma with boiled eggs", [["upma", 1], ["egg", 2]]),
  m("breakfast", "b-upma-milk", "Upma with a glass of milk", [["upma", 1], ["milk", 1]]),
  m("breakfast", "b-pb-toast", "Peanut butter toast with banana", [["bread", 2], ["pb", 1], ["banana", 1]]),
  m("breakfast", "b-bread-omelette", "Bread omelette", [["bread", 2], ["omelette", 1]]),
  m("breakfast", "b-khichdi-curd", "Moong khichdi with curd", [["khichdi", 1], ["curd", 1]]),
  m("breakfast", "b-sattu-banana", "Sattu drink, banana and dates", [["sattu", 1], ["banana", 1], ["dates", 2]]),
  m("breakfast", "b-idli-chutney-sprouts", "Idli with sprouts salad", [["idli", 3], ["sprouts", 1]]),
  m("breakfast", "b-moong-sprouts", "Moong dal chilla with sprouts", [["moong-chilla", 3], ["sprouts", 1]]),
  m("breakfast", "b-soya-roti", "Soya curry with roti", [["roti", 2], ["soya", 1]]),

  // ───────────── Lunch ─────────────
  m("lunch", "l-dal-rice-sabzi", "Dal, rice, sabzi and salad", [["rice", 1.5], ["dal", 1.5], ["mixveg", 1], ["salad", 1]]),
  m("lunch", "l-roti-dal-sabzi", "Roti, dal, sabzi and curd", [["roti", 3], ["dal", 1], ["mixveg", 1], ["curd", 1]]),
  m("lunch", "l-rajma-rice", "Rajma rice with salad", [["rice", 1.5], ["rajma", 1.5], ["salad", 1]]),
  m("lunch", "l-chole-roti", "Chole with roti and salad", [["roti", 2], ["chole", 1.5], ["salad", 1]]),
  m("lunch", "l-chole-rice", "Chole rice with salad", [["rice", 1.5], ["chole", 1.5], ["salad", 1]]),
  m("lunch", "l-soya-roti", "Soya curry, roti and sabzi", [["roti", 3], ["soya", 1], ["mixveg", 1]]),
  m("lunch", "l-soya-rice", "Soya curry, rice and salad", [["rice", 1.5], ["soya", 1.5], ["salad", 1]]),
  m("lunch", "l-paneer-roti", "Paneer sabzi, roti and salad", [["roti", 3], ["paneer", 1], ["salad", 1]]),
  m("lunch", "l-chicken-roti", "Chicken curry, roti and sabzi", [["roti", 2], ["chicken", 1], ["mixveg", 1]]),
  m("lunch", "l-chicken-rice", "Chicken curry, rice and salad", [["rice", 1.5], ["chicken", 1.5], ["salad", 1]]),
  m("lunch", "l-fish-rice", "Fish curry, rice and sabzi", [["rice", 1.5], ["fish", 1.5], ["mixveg", 1]]),
  m("lunch", "l-egg-curry-rice", "Egg curry, rice and sabzi", [["rice", 1.5], ["egg-curry", 1], ["mixveg", 1]]),
  m("lunch", "l-khichdi-curd", "Khichdi, curd and salad", [["khichdi", 1.5], ["curd", 1], ["salad", 1]]),
  m("lunch", "l-pulao-raita", "Veg pulao with curd", [["veg-pulao", 1], ["curd", 1]]),
  m("lunch", "l-jowar-dal", "Jowar roti, dal and sabzi", [["jowar-roti", 3], ["dal", 1.5], ["mixveg", 1]]),
  m("lunch", "l-soya-dal-roti", "Soya curry, dal, roti and salad", [["roti", 2], ["soya", 1], ["dal", 1], ["salad", 1]]),
  m("lunch", "l-soya-dal-rice", "Soya curry, dal, rice and salad", [["rice", 1], ["soya", 1], ["dal", 1], ["salad", 1]]),

  // ───────────── Snacks ─────────────
  m("snack", "s-chana-fruit", "Roasted chana and fruit", [["chana-roast", 1], ["fruit", 1]]),
  m("snack", "s-fruit-peanuts", "Fruit with roasted peanuts", [["fruit", 1], ["peanuts", 0.5]]),
  m("snack", "s-sprouts", "Sprouts salad", [["sprouts", 1]]),
  m("snack", "s-makhana-milk", "Roasted makhana with milk", [["makhana", 1], ["milk", 1]]),
  m("snack", "s-boiled-chana", "Boiled chana", [["boiled-chana", 1]]),
  m("snack", "s-banana-milk", "Banana and milk", [["banana", 1], ["milk", 1]]),
  m("snack", "s-lassi-chana", "Chaas with roasted chana", [["lassi", 1], ["chana-roast", 1]]),
  m("snack", "s-egg-banana", "Boiled eggs and banana", [["egg", 2], ["banana", 1]]),
  m("snack", "s-sattu-dates", "Sattu drink with dates", [["sattu", 1], ["dates", 2]]),
  m("snack", "s-dates-peanuts", "Dates and roasted peanuts", [["dates", 3], ["peanuts", 0.5]]),
  m("snack", "s-curd-fruit", "Curd with fruit", [["curd", 1], ["fruit", 1]]),
  m("snack", "s-banana-chana", "Banana and roasted chana", [["banana", 1], ["chana-roast", 1]]),
  m("snack", "s-sprouts-chana", "Sprouts and boiled chana", [["sprouts", 1], ["boiled-chana", 1]]),
  m("snack", "s-sattu-chana", "Sattu drink with roasted chana", [["sattu", 1], ["chana-roast", 1]]),

  // ───────────── Dinner ─────────────
  m("dinner", "d-roti-dal-sabzi", "Roti, dal and sabzi", [["roti", 2], ["dal", 1], ["mixveg", 1]]),
  m("dinner", "d-roti-paneer", "Roti, paneer sabzi and salad", [["roti", 2], ["paneer", 1], ["salad", 1]]),
  m("dinner", "d-roti-chicken", "Roti, chicken curry and salad", [["roti", 2], ["chicken", 1], ["salad", 1]]),
  m("dinner", "d-rice-dal", "Rice, dal and sabzi", [["rice", 1.5], ["dal", 1.5], ["mixveg", 1]]),
  m("dinner", "d-khichdi-sabzi", "Khichdi with sabzi", [["khichdi", 1.5], ["mixveg", 1]]),
  m("dinner", "d-roti-soya", "Roti, soya curry and salad", [["roti", 2], ["soya", 1], ["salad", 1]]),
  m("dinner", "d-roti-egg-curry", "Roti, egg curry and salad", [["roti", 2], ["egg-curry", 1], ["salad", 1]]),
  m("dinner", "d-rice-fish", "Rice, fish curry and sabzi", [["rice", 1], ["fish", 1.5], ["mixveg", 1]]),
  m("dinner", "d-rice-chicken", "Rice, chicken curry and salad", [["rice", 1], ["chicken", 1.5], ["salad", 1]]),
  m("dinner", "d-dosa-sambar", "Dosa with sambar", [["dosa", 2], ["sambar", 1.5]]),
  m("dinner", "d-jowar-soya", "Jowar roti, soya curry and sabzi", [["jowar-roti", 2], ["soya", 1.5], ["mixveg", 1]]),
  m("dinner", "d-roti-rajma", "Roti and rajma with salad", [["roti", 2], ["rajma", 1.5], ["salad", 1]]),
  m("dinner", "d-rice-chole", "Rice and chole with salad", [["rice", 1], ["chole", 1.5], ["salad", 1]]),
  m("dinner", "d-soya-dal-jowar", "Jowar roti, soya curry and dal", [["jowar-roti", 2], ["soya", 1], ["dal", 1], ["salad", 1]]),
  m("dinner", "d-soya-rice", "Rice, soya curry and sabzi", [["rice", 1], ["soya", 1.5], ["mixveg", 1]]),
  m("dinner", "d-idli-sambar","Idli, sambar and sabzi", [["idli", 4], ["sambar", 1.5], ["mixveg", 0.5]]),
];
