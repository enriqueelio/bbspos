import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@bubba/ui";
import {
  formatPrice,
  formatDurationMinutes,
  PaymentMethodLabel,
  type CashierDailyData,
} from "@bubba/types";

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-white">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {hint && <p className="text-xs text-white">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function ReportView({
  data,
  myName,
}: {
  data: CashierDailyData;
  myName: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label={`Ingresos del día (${data.date})`}
          value={formatPrice(data.revenueTotal)}
        />
        <Kpi label="Pedidos entregados" value={String(data.deliveredOrders)} />
        <Kpi label="Ticket promedio" value={formatPrice(data.avgTicket)} />
        <Kpi
          label="Tiempo promedio de entrega"
          value={
            data.avgDeliveryMinutes !== null
              ? formatDurationMinutes(data.avgDeliveryMinutes)
              : "—"
          }
          hint="Desde el ingreso hasta la entrega"
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Mi rendimiento</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-white">
              Pedidos entregados por {myName}
            </p>
            <p className="text-3xl font-bold">{data.myDeliveredOrders}</p>
          </div>
          <div>
            <p className="text-sm text-white">
              Mi tiempo promedio de entrega
            </p>
            <p className="text-3xl font-bold">
              {data.myAvgDeliveryMinutes !== null
                ? formatDurationMinutes(data.myAvgDeliveryMinutes)
                : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Métodos de pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {data.paymentBreakdown.length === 0 ? (
            <p className="py-4 text-center text-sm text-white">
              Sin pagos registrados hoy.
            </p>
          ) : (
            data.paymentBreakdown.map((row) => (
              <div
                key={row.method}
                className="flex items-center justify-between border-b py-2 last:border-b-0"
              >
                <span>{PaymentMethodLabel[row.method] ?? row.method}</span>
                <span className="text-sm text-white">
                  {row.orders} pedido{row.orders !== 1 ? "s" : ""}
                </span>
                <span className="font-medium">{formatPrice(row.revenue)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
