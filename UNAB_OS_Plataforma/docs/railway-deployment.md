# Ejecutar Universidad OS y Jarvis en Railway

La configuración despliega ambos procesos en un único servicio Docker y conserva TEMA, SQLite y el puente de Jarvis en un volumen persistente. No crea recursos por sí sola.

## Ruta rápida

1. Confirma que el repositorio privado contiene Universidad OS y `deployment/jarvis`, sin archivos `.env` ni datos locales.
2. Crea un servicio Railway desde ese repositorio y usa el plan Hobby o superior.
3. Adjunta un único volumen de 5 GB en `/data`.
4. Configura las variables de la tabla siguiente como variables selladas cuando sean secretas.
5. Carga los datos privados en el volumen con la distribución indicada y despliega.
6. Verifica `/api/health`, el inicio de Jarvis en los logs y un mensaje real en Telegram.

## Variables

| Variable | Alcance | Valor esperado |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Dashboard, pública | URL HTTPS del proyecto Supabase. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Dashboard, pública | Clave publicable; nunca una clave `service_role`. |
| `TELEGRAM_BOT_TOKEN` | Jarvis, secreto | Token entregado por BotFather. |
| `TELEGRAM_ALLOWED_USER_ID` | Jarvis, privado | ID numérico de la única cuenta autorizada. |
| `OPENAI_API_KEY` | Jarvis, secreto recomendado | Clave del proveedor directo cuando no se configura el gateway. |
| `OPENAI_MODEL` | Jarvis, configuración | Modelo directo; por defecto `gpt-5.6-luna`. |
| `NVIDIA_API` o `NVIDIA_API_KEY` | Jarvis, secreto opcional | Fallback cuando no se configura el gateway ni OpenAI. |
| `NVIDIA_BASE_URL`, `NVIDIA_MODEL` | Jarvis, configuración | Endpoint y modelo NVIDIA; los valores predeterminados del código son válidos. |
| `JARVIS_TIMEZONE` | Ambos | `America/Bogota` si no se define otro huso. |
| `COACH_ENABLED`, `COACH_NAME`, `COACH_HOURS` | Jarvis | Configuración de acompañamiento. |
| `REMINDER_POLL_SECONDS`, `COACH_POLL_SECONDS`, `UNAB_OS_BRIDGE_POLL_SECONDS` | Jarvis | Intervalos; conserva los valores predeterminados salvo necesidad comprobada. |

La imagen ya define estas rutas y normalmente no deben sobrescribirse:

```text
TEMA_DATA_ROOT=/data/tema
JARVIS_BRIDGE_PATH=/data/university-os-bridge
UNAB_OS_BRIDGE_PATH=/data/university-os-bridge
JARVIS_DB_PATH=/data/jarvis/jarvis.db
JARVIS_CONTEXT_PATH=/data/jarvis/ACADEMIC_CONTEXT.md
```

Railway inyecta `PORT`; no lo fijes manualmente. No uses variables `NEXT_PUBLIC_*` para secretos.

La prioridad de IA es `JARVIS_AI_BASE_URL` + `JARVIS_AI_API_KEY`, OpenAI y NVIDIA. Para el modo directo guarda `OPENAI_API_KEY` como secreto de Railway y, si hace falta, define `OPENAI_MODEL`; no copies un `.env` local. La URL oficial de OpenAI está fijada en el código.

## Carga inicial del volumen

Detén el Jarvis local durante la copia de SQLite para obtener una instantánea consistente. Copia únicamente estos elementos:

```text
/data/tema/inventory.json
/data/tema/download-manifest.json
/data/tema/downloads/**
/data/jarvis/jarvis.db
/data/jarvis/ACADEMIC_CONTEXT.md
/data/university-os-bridge/delivered/**
/data/university-os-bridge/reports/**
/data/university-os-bridge/documents/**
```

Usa la gestión de archivos de volúmenes de Railway (`railway volume browse` o los subcomandos disponibles en `railway volume files --help`). No copies `.env`, `.venv`, cachés, logs ni archivos SQLite `-wal`/`-shm` de un proceso que siga en ejecución.

## Verificación

- `GET /api/health` responde `200` y `{"status":"ok"}`.
- Los logs muestran Next.js y Jarvis activos sin reinicios repetidos.
- Iniciar sesión en el dominio Railway conserva la sesión Supabase.
- Un material TEMA se abre desde el dashboard.
- Enviar un material a Jarvis crea, entrega y muestra el informe de vuelta.
- Reiniciar el servicio conserva tareas, informes y documentos.

Railway usa el healthcheck durante el despliegue, no como monitor continuo. El supervisor termina todo el contenedor si cualquiera de los dos procesos cae, lo que permite que la política `ON_FAILURE` reinicie ambos.

## Límites conocidos

- Un servicio con volumen no admite réplicas y tiene una interrupción breve durante el despliegue.
- El volumen está disponible en runtime, no durante `next build`; ninguna página debe leer TEMA al compilar.
- `codex app-server` sigue requiriendo el binario y una autenticación local que esta imagen no instala. Hasta migrarlo a una API de servidor, el tutor puede devolver su respuesta segura de contingencia, pero las demás funciones siguen operativas.
- El archivo de contexto predeterminado no contiene datos privados. Sustitúyelo en el volumen para habilitar el contexto académico real.

## Sincronización de TEMA

El catálogo multiusuario se actualiza con el servicio Cron finito `tema-daily-sync`. Railway lo inicia cada 10 minutos, pero el proceso solo sincroniza una conexión cuando corresponde: al recibir una solicitud nueva desde el dashboard o una vez al día después de las 05:00 de Bogotá. Un fallo aplica una espera mínima de una hora para evitar reintentos y consumo innecesarios; una reconexión nueva puede solicitar un intento inmediato.

### Configuración normal

1. Conserva `Dockerfile.tema-sync`, el comando y `*/10 * * * *` definidos en `railway.tema-sync.json`.
2. No asignes dominio ni volumen. El proceso usa almacenamiento temporal y termina al finalizar.
3. Configura `SUPABASE_SECRET_KEY` y `TEMA_CREDENTIALS_KEY` como secretos. Usa la misma `TEMA_CREDENTIALS_KEY` del backend del dashboard.
4. Configura `SUPABASE_URL`; `NEXT_PUBLIC_SUPABASE_URL` solo queda como alternativa compatible para la URL pública.
5. Conecta TEMA desde el dashboard. El servidor cambia usuario y contraseña por un token móvil, cifra el token y marca `sync_requested_at`; la primera captura debe comenzar en uno de los siguientes ciclos, en un máximo normal de 10 minutos.
6. Confirma en los logs un resultado JSON para ese estudiante y una ejecución `complete` o `partial` en el historial del dashboard.

La contraseña de TEMA nunca se guarda. El token móvil cifrado vive en `tema_connections` y solo el rol de servicio puede leerlo. Una captura se publica en una transacción: un fallo fatal conserva el catálogo anterior, mientras un endpoint opcional fallido conserva únicamente el último dominio válido afectado.

### Ejecución manual legacy

`TEMA_TOKEN` y `UNAB_OS_OWNER_ID` existen solo para diagnóstico manual. No los configures en el Cron multiusuario. El token manual debe coincidir con la conexión cifrada vigente del mismo propietario; una cuenta revocada o reconectada no puede publicar una captura antigua. Usa `TEMA_SYNC_FORCE=1` únicamente durante una verificación controlada.

## Despliegue de Colaboración Académica Beta

Para habilitar el espacio colaborativo por secciones de clase lideradas por profesores:

### Orden de ejecución del operador

1. Configurar el proveedor de correo passwordless (Magic Links / OTP) en Supabase Auth.
2. Registrar el dominio del servicio Railway y `https://<railway-domain>/auth/callback` en la configuración de URLs de redirección de Supabase Auth.
3. Configurar en Railway las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Definir `ACADEMIC_CURRENT_TERM_KEY=2026-2` y `ACADEMIC_COLLABORATION_ENABLED=true` en las variables de entorno de Railway.
5. Mantener `NEXT_PUBLIC_ENABLE_TEST_ACCESS=false` y asegurar que los inicios de sesión anónimos estén deshabilitados en Supabase.
6. Desde un entorno de operador protegido, aplicar las migraciones revisadas: `supabase db push`.
7. Desplegar y confirmar que `GET /api/health` responde con HTTP 200.

### Procedimiento de Smoke Test (Dos cuentas)

- Probar inicio de sesión con correo `@unab.edu.co` y verificar que correos no institucionales son rechazados.
- Cuenta A: Ingresar a `/materias`, buscar una materia (ej. Cálculo I) y seleccionar el profesor Carlos Martínez.
- Cuenta A: Crear una evaluación con instrucciones y ejercicios clave.
- Cuenta B: Iniciar sesión, unirse al mismo grupo con el mismo profesor y verificar que la evaluación aparece en `/evaluaciones` y en su `/dashboard`.
- Cuenta B: Editar el contenido y comprobar que el historial atribuye los cambios a ambas cuentas.
- Cuenta C (otro profesor de la misma materia): Verificar aislamiento total; no ve los contenidos del grupo del profesor Martínez.
- Probar borrado suave y restauración desde el historial.

### Procedimiento de Rollback de Emergencia

Si se detecta un incidente en producción:
1. Cambiar la variable en Railway a `ACADEMIC_COLLABORATION_ENABLED=false` y redesplegar.
2. Esto deshabilita inmediatamente las rutas colaborativas y devuelve los accesos previos sin alterar datos ni borrar tablas.
3. Conservar la base de datos y la tabla de revisiones intactas para análisis forense y resolución de errores.

