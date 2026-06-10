import type { APIRoute } from 'astro';
import { LogsGonstr, SECURITY_EVENTS } from '../../utils/security-logger';

export const GET: APIRoute = async ({ request }) => {
  const clientAddress = request.headers.get('x-forwarded-for') || 
                        request.headers.get('x-real-ip') || 
                        'static-build';
  const authHeader = request.headers.get('authorization') || request.headers.get('x-admin-token') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader;
  
  // En producción el token se debe configurar en la variable de entorno SECURITY_STATUS_TOKEN
  const ADMIN_TOKEN = import.meta.env.SECURITY_STATUS_TOKEN;
  
  if (!ADMIN_TOKEN) {
    LogsGonstr.log('ERROR', SECURITY_EVENTS.SYSTEM_ERROR, {
      reason: 'Missing SECURITY_STATUS_TOKEN environment variable',
      endpoint: '/api/security-status'
    }, request);
    return new Response('Server misconfiguration', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
  
  if (token !== ADMIN_TOKEN) {
    LogsGonstr.log('WARN', SECURITY_EVENTS.SUSPICIOUS_ACCESS, {
      reason: 'Invalid admin token attempt',
      ip: clientAddress,
      endpoint: '/api/security-status'
    }, request);
    
    return new Response('Unauthorized', { 
      status: 401,
      headers: {
        'Content-Type': 'text/plain',
        'X-Security-Alert': 'Invalid Token'
      }
    });
  }
  
  LogsGonstr.log('INFO', SECURITY_EVENTS.SECURITY_SCAN, {
    action: 'Security status requested',
    admin: true
  }, request);
  
  const report = LogsGonstr.generateSecurityReport();
  
  return new Response(JSON.stringify({
    status: 'secure',
    timestamp: new Date().toISOString(),
    version: '1.0.0-LogsGonstr',
    environment: 'production',
    security: {
      csp: 'enabled',
      headers: 'secured',
      middleware: 'active',
      monitoring: 'active'
    },
    ...report
  }, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Security-Level': 'high',
      'X-LogsGonstr-Version': '1.0.0'
    }
  });
};