-- ============================================================================
-- Limpieza de productos huerfanos - Catalogo antiguo (Bibosi / LA MILANESA)
-- Fuente esquema: bbs Antiguo.sql (MySQL 5.5, tablas `producto` y `categoria`)
-- ----------------------------------------------------------------------------
-- Logica: desactiva (estado=0) los productos ACTIVOS (estado=1) cuya categoria
-- asociada (p.categoria = c.texto) esta INACTIVA (c.estado = 0).
-- Afecta: 157 productos (de 343 activos -> quedan 186 activos).
-- El JOIN es insensible a mayusculas/minusculas (colacion latin1, caso MySQL).
-- ============================================================================

-- (1) OPCIONAL - Verificar cuantos productos se veran afectados antes de ejecutar.
--     Debe devolver: 157
SELECT COUNT(*) AS productos_a_desactivar
FROM producto p
JOIN categoria c ON p.categoria = c.texto
WHERE c.estado = 0 AND p.estado = 1;

-- (2) LA LIMPIEZA - Ejecutar una sola vez.
UPDATE producto p
JOIN categoria c ON p.categoria = c.texto
SET p.estado = 0
WHERE c.estado = 0 AND p.estado = 1;

-- (3) OPCIONAL - Verificacion posterior. Debe devolver: 0
SELECT COUNT(*) AS huerfanos_restantes
FROM producto p
JOIN categoria c ON p.categoria = c.texto
WHERE c.estado = 0 AND p.estado = 1;

-- (4) OPCIONAL - Estado final del catalogo.
SELECT
  SUM(CASE WHEN p.estado = 1 THEN 1 ELSE 0 END) AS productos_activos,
  SUM(CASE WHEN p.estado = 0 THEN 1 ELSE 0 END) AS productos_inactivos,
  COUNT(*) AS productos_total
FROM producto p;