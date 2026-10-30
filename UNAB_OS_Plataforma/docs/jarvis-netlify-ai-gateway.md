# Puente de Jarvis a Netlify AI Gateway

Universidad OS expone un único endpoint OpenAI-compatible para el bot:

`POST /api/jarvis/ai/chat/completions`

La ruta autentica con `JARVIS_BRIDGE_TOKEN` y fija en el servidor `gpt-5.4-nano`, razonamiento `none`, una sola elección, un máximo de 1.200 tokens de salida, herramientas secuenciales, sin almacenamiento y sin streaming. El cliente no puede cambiar el modelo, la URL del proveedor ni la clave que Netlify usa aguas arriba.

## Conectar el cliente Python después del despliegue

No hace falta cambiar el bucle de `JarvisAssistant`: el SDK de OpenAI seguirá llamando `client.chat.completions.create(...)` y seguirá recibiendo `message.tool_calls` en el formato actual.

En Railway, para el servicio `jarvis-telegram`:

1. Eliminar `NVIDIA_API` y `NVIDIA_API_KEY`; la configuración actual da prioridad a NVIDIA mientras exista cualquiera de las dos.
2. Definir `OPENAI_BASE_URL=https://universidad-os-monoga.netlify.app/api/jarvis/ai`.
3. Definir `OPENAI_API_KEY` con exactamente el mismo valor secreto de 32 o más caracteres que `JARVIS_BRIDGE_TOKEN` tiene en Netlify. No pegar ese valor en código, logs ni documentación.
4. Definir `OPENAI_MODEL=gpt-5.4-nano` para que la configuración sea legible. La ruta vuelve a fijar el modelo y no confía en este valor del cliente.
5. Reiniciar solamente `jarvis-telegram` y probar primero una respuesta de texto y después una llamada a `crear_tarea`.

El `base_url` termina en `/api/jarvis/ai` porque el SDK Python agrega `/chat/completions`. Las credenciales `OPENAI_API_KEY` y `OPENAI_BASE_URL` que Netlify inyecta dentro de su Function se usan únicamente para el salto de Netlify AI Gateway a OpenAI.

## Contrato y límites

- Solo se aceptan mensajes de texto con roles de Chat Completions y continuaciones `assistant.tool_calls` → `tool` válidas.
- Solo se aceptan las cuatro herramientas actuales: `crear_tarea`, `listar_tareas`, `completar_tarea` y `programar_recordatorio`.
- Máximo 40 mensajes, 48.000 caracteres de conversación, cuatro herramientas y cuatro tool calls por mensaje.
- Cuerpo máximo de 96 KiB, respuesta máxima de 256 KiB y timeout aguas arriba de 25 segundos.
- Los errores conservan la forma `{ "error": { ... } }` esperada por el SDK de OpenAI y distinguen autenticación, configuración, límite del proveedor, timeout y respuesta inválida.

## Límite local que debe aplicar el bot

La ruta es deliberadamente stateless y solo conoce el token compartido del servicio; no debe intentar contabilizar cuotas por estudiante. Después de estabilizar el pairing, el bot puede imponer 30 turnos generativos por usuario y día antes de entrar a `JarvisAssistant.reply`, sin contar rutas deterministas ni entrega de materiales. Debe reservar un turno una sola vez por mensaje del usuario, no una vez por cada llamada interna del tool loop.

El contrato soporta reducir el bucle Python de cinco a tres iteraciones: aun en el peor caso permitido de cuatro tool calls por iteración, el historial queda por debajo del máximo de 40 mensajes. Un error HTTP, de conexión o timeout de esta ruta hace que el SDK lance una excepción identificable. La reserva puede liberarse si falla la primera llamada antes de obtener cualquier completion; si ya hubo una completion o se ejecutó una herramienta, conviene conservarla porque ya existió consumo y posiblemente un efecto persistente.

Referencias oficiales consultadas: [Netlify AI Gateway](https://docs.netlify.com/build/ai-gateway/overview/), [GPT-5.4 nano](https://developers.openai.com/api/docs/models/gpt-5.4-nano) y [Chat Completions](https://developers.openai.com/api/reference/cli/resources/chat/subresources/completions).
