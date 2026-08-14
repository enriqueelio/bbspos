import Link from "next/link";
import { Button } from "@bubba/ui";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@bubba/ui";
import {
  BobaKindLabel,
  FlavorCategoryLabel,
  FlavorCategoryList,
  formatPrice,
} from "@bubba/types";
import { getCatalog } from "@/lib/catalog";

export const metadata = {
  title: "Bubba Drinks — Bubble Tea y bebidas con boba",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const catalog = await getCatalog();

  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100 p-10 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Bubba Drinks
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-lg text-muted-foreground">
          Arma tu bubble drink perfecta: elige el tamaño de tu vaso, tu sabor
          favorito y el tipo de boba. Hecho al momento para ti.
        </p>
        <Button size="lg" className="mt-6" asChild>
          <Link href="/build">Arma tu boba ahora</Link>
        </Button>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">Nuestro menú</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Vasos
                <Badge variant="secondary">{catalog.sizes.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {catalog.sizes.map((size) => (
                <div
                  key={size.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    {size.name} · {size.ml} ml
                  </span>
                  <span className="font-semibold">
                    {formatPrice(size.price)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Sabores
                <Badge variant="secondary">{catalog.flavors.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {FlavorCategoryList.map((category) => (
                <div key={category}>
                  <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                    {FlavorCategoryLabel[category]}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {catalog.flavors
                      .filter((f) => f.category === category)
                      .map((f) => (
                        <Badge key={f.id} variant="outline">
                          {f.name}
                        </Badge>
                      ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Bobas
                <Badge variant="secondary">
                  {catalog.bobaTypes.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {catalog.bobaTypes.map((boba) => (
                <div
                  key={boba.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    {boba.name} · {BobaKindLabel[boba.kind]}
                  </span>
                  <span className="font-semibold">
                    {formatPrice(boba.price)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
