export interface RecipeMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

export interface RecipeIngredient {
  id?: string;
  name: string;
  amount: number;
  unit: string;
  calories?: number | string;
  protein?: number | string;
  carbs?: number | string;
  fat?: number | string;
}

export interface RecipeVariation {
  id: string;
  name: string;
  isDefault?: boolean;
  description?: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  macros: RecipeMacros;
  prepTime?: string | number;
  cookTime?: string | number;
  totalTime?: string | number;
}

export interface RecipeServingUnit {
  label: string;
  amount: number;
  unit: string;
  calories?: number | string;
  protein?: number | string;
  carbs?: number | string;
  fat?: number | string;
  fiber?: number | string;
}

export interface Recipe {
  id: string;
  title: string;
  image?: string;
  imageUrl?: string;
  categories: string[];
  equipment: string[];
  ingredients: RecipeIngredient[];
  steps: string[];
  macros: RecipeMacros;
  servingUnits?: RecipeServingUnit[];
  nutritionBasis?: string;
  recipeType?: string;
  prepTime?: string | number;
  cookTime?: string | number;
  rating?: number | string;
  baseServings: number;
  favorite?: boolean;
  createdAt?: number;
  updatedAt?: number;
  variations?: RecipeVariation[];
}
