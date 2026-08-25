import type { Flavor, FlavorCategory } from "@bubba/types";
import { FlavorCategoryLabel } from "@bubba/types";
import { cn } from "../../lib/utils";
import {
  MdCoffee,
  MdCookie,
  MdCake,
  MdLeaf,
  MdLocalBar,
  MdLocalCafe,
  MdEmojiFoodBeverage,
  MdIcecream,
  MdEgg,
  MdRestaurant,
  MdLunchDining,
  MdBreakfastDining,
  MdDinnerDining,
  MdSetMeal,
  MdTapas,
  MdOutdoorGrill,
  MdFoodBank,
} from "react-icons/md";
import {
  FaCookieBite,
  FaLemon,
  FaCheese,
  FaBreadSlice,
  FaBeerMugEmpty,
  FaWineGlass,
  FaAppleWhole,
  FaEgg,
} from "react-icons/fa6";

const FLAVOR_ICONS: Record<string, React.ComponentType<any>> = {
  "capuchino": MdCoffee,
  "oreo": FaCookieBite,
  "fruticoco": MdCake,
  "matcha": MdLeaf,
  "piña colada": MdLocalBar,
  "limonada brasilera": MdLocalCafe,
  "frutilimon": MdEmojiFoodBeverage,
  "taro": MdIcecream,
  "frutilla": MdCake,
  "limón": FaLemon,
  "piña": MdEmojiFoodBeverage,
  "manzana": FaAppleWhole,
  "naranja": MdEmojiFoodBeverage,
  "mango": MdEmojiFoodBeverage,
  "coco": MdEmojiFoodBeverage,
  "vainilla": MdIcecream,
  "chocolate": MdCake,
  "mora": MdCake,
};

function getFlavorIcon(name: string): React.ReactNode {
  const IconComponent = FLAVOR_ICONS[name.toLowerCase()];
  if (!IconComponent) return <MdEmojiFoodBeverage className="h-4 w-4" />;
  return <IconComponent className="h-4 w-4" />;
}

export interface FlavorPickerProps {
  flavors: Flavor[];
  category: FlavorCategory;
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function FlavorPicker({
  flavors,
  category,
  selectedId,
  onSelect,
}: FlavorPickerProps) {
  const categoryFlavors = flavors.filter((f) =>
    f.categories.includes(category),
  );

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {FlavorCategoryLabel[category]}
      </h3>
      {categoryFlavors.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay sabores disponibles en esta categoría.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-3">
          {categoryFlavors.map((flavor) => {
            const selected = flavor.id === selectedId;
            return (
              <button
                key={flavor.id}
                type="button"
                onClick={() => onSelect(flavor.id)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card",
                )}
              >
                <span className="flex items-center justify-between font-medium">
                  {flavor.name}
                  {getFlavorIcon(flavor.name)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
