# Migraciones Manuales

Este directorio contiene las migraciones SQL que se aplican manualmente usando el script `apply-migration.bat`.

## Migraciones Aplicadas

### 1. `add-images-column.sql`
- **Fecha**: 2025-11-22
- **Descripción**: Agrega la columna `images` (JSON) a la tabla `orders` para almacenar rutas de imágenes de vehículos

### 2. `time-tracking.sql`
- **Fecha**: 2025-11-23
- **Descripción**: Agrega columnas de tracking de tiempo a la tabla `orders`:
  - `started_at`: Timestamp cuando la orden pasa a IN_PROGRESS
  - `completed_at`: Timestamp cuando la orden pasa a WAITING_PAYMENT
  - `duration`: Duración del lavado en minutos

## Cómo Aplicar una Migración

Desde la raíz del proyecto backend, ejecuta:

```bash
apply-migration.bat <nombre-archivo.sql>
```

Ejemplo:
```bash
apply-migration.bat time-tracking.sql
```

El script automáticamente:
1. Ejecuta el SQL en la base de datos
2. Regenera el Prisma Client
3. Te indica que reinicies el servidor

## Notas

- Estas migraciones se usan cuando `prisma migrate dev` no funciona por restricciones de PowerShell
- Siempre verifica el contenido del SQL antes de aplicarlo
- Después de aplicar una migración, reinicia el servidor backend
