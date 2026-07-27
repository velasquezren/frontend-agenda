/**
 * Ruta base del API.
 *
 * En dev, `proxy.conf.json` redirige /agenda-api -> http://127.0.0.1:8001.
 * En produccion, Apache hace lo mismo contra el uvicorn de :8001.
 * Asi la ruta es identica en los dos entornos.
 */
export const API_BASE = '/agenda-api';

export const TOKEN_KEY = 'agenda.token';
