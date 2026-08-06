# Riesgos aceptados — `security-auditor`

Riesgos que el proyecto aceptó a propósito, en specs ya implementadas. El agente `security-auditor` no debe
reportarlos como hallazgos nuevos en ninguna auditoría; debe citar la spec y seguir adelante. Protocolo en
[README.md](./README.md).

| Riesgo                                                                                   | Aceptado en | Motivo                                                                                                   | Reabrir si                                                                       |
| ----------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Sin Content-Security-Policy, Strict-Transport-Security ni Permissions-Policy               | spec 12     | Requiere enumerar orígenes de Supabase/Resend/OAuth sin romper nada; se decidió como su propia pasada.    | Se añade contenido de terceros (scripts, iframes, fuentes) que un CSP debería acotar. |
| Un usuario autenticado puede insertar una puntuación inflada para su propio `user_id`      | spec 12     | No hay validación de puntuación en servidor; cerrar el guest-insert no resuelve el anti-cheat.             | Se introduce cualquier premio, ranking oficial o consecuencia real ligada al score. |
| Filas `scores` heredadas con `user_id is null` siguen visibles en los leaderboards         | spec 12     | El endurecimiento de la política INSERT es hacia adelante, no una migración de datos históricos.          | Se decide borrar o reclasificar el historial de invitados.                        |
| Sin rate limiting por IP en signup, login o envío de puntuaciones                          | spec 11, 12 | Coincide con el nivel de confianza ya aceptado en la spec 06; depende de un toggle del Dashboard de Auth. | Se observa abuso real (spam de cuentas, inundación de scores) en producción.       |
| Ninguna ruta (catálogo, detalle de juego, o gameplay) está protegida tras login             | spec 11     | Decisión de diseño explícita: los juegos son jugables como invitado, como en un arcade físico.             | Se añade una función que requiera identidad real (compras, contenido exclusivo).   |
| Lectura pública (`using (true)`) en `SELECT` de `games` y `scores`                          | spec 06, 12 | El propio checklist excluye a propósito las políticas de lectura pública de sus advertencias.              | Se añaden columnas sensibles a `scores` o `games` que no deban ser públicas.        |
