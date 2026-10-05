Diagnóstico
Estás mezclando 3 dominios distintos en la fila de customers:
Identidad: nombre, ci, telefono -> esto ES el cliente. Siempre se ve.Finanzas: saldo, creditLimit, tipo PREPAGO/POSTPAGO -> esto ES la cuenta. Solo existe si es pensionado.Comportamiento: visitas, gasto total, puntos, ultimaVisita -> esto ES estadística. Es un cálculo, no un dato del cliente.Y al separarlo en /customers y /pensionados creaste 2 verdades. Un pensionado sigue siendo un cliente, no debería desaparecer de la lista normal.
La solución que propongo
1. Una sola fuente de verdad: /customers -> Todos
Una tabla limpia, sin métricas.
Columnas: Nombre | CI | Teléfono | Estado | Saldo | Acción
Estado es un badge, no una página distinta:NORMAL - grisPENSIONADO PREPAGO - azul (saldo >=0)PENSIONADO POSTPAGO - rojo si debe, naranja si tiene límiteFRECUENTE - dorado (si totalVisits > X)Saldo solo aparece si customer.account != null. Si no tiene cuenta, -Filtros arriba tipo chip: [Todos] [Pensionados] [Deudores] [Frecuentes] - pero es la misma tabla filtrada, no otra página.
2. La conversión deja de ser otra página, es una acción
En cada fila de cliente normal, botón ... > Hacer Pensionado.
Ese botón abre un modal:javascriptConvertir a Pensionado: Juan Perez (CI: 123)
Tipo: [ ] PREPAGO (saldo a favor) [ ] POSTPAGO (fiado)
Límite de crédito: 500 Bs (solo si es POSTPAGO)
Saldo inicial: 0Al guardar, crea CustomerAccount + primer CustomerLedger si tiene saldo inicial. El cliente SIGUE en /customers, solo que ahora su badge cambia a PENSIONADO.
3. Lo que no te gusta sacarlo de la tabla y llevarlo al detalle
visitas, gasto total, puntos, ultimaVisita NO va en la lista. Va en:
Click en cliente > Drawer lateral / Página /customers/[id]
Ahí sí:
Pestaña Perfil: Nombre, CI, TelPestaña Cuenta: Saldo actual, historial Ledger, botón Recargar / Cobrar DeudaPestaña Lealtad: Visitas, Gasto total, Puntos, Última visita, historial de órdenes fidelizablesY la página /ranking que ya tienes se queda como la vista analítica de Lealtad, no /customers.
Resumen de cambio técnico:
Mantén Customer con totalVisits, totalSpent como caché interno, pero no lo selecciones en findMany de la tabla principal. Solo para el detalle.Borra la ruta /pensionados como listado. Renómbrala a /cuentas o /saldos si quieres ver solo los que tienen deuda/saldo, pero que sea una vista financiera, no de clientes.Nueva ruta /clientes/accion no existe, es un modal en la misma página.