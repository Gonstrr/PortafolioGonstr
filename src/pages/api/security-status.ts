import type { APIRoute } from 'astro';
import { LogsGonstr, SECURITY_EVENTS } from '../../utils/security-logger';

export const GET: APIRoute = async ({ request, clientAddress }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  
  // Token simple de seguridad (en producción usar algo más robusto)
  const ADMIN_TOKEN = 'LogsGonstr-Admin-2026';
  
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