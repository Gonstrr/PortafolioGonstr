import type { APIContext } from 'astro';

// LogsGonstr Security Middleware
export const onRequest = async (context: APIContext, next: Function) => {
  const startTime = Date.now();
  const userAgent = context.request.headers.get('user-agent') || 'unknown';
  const clientIP = context.clientAddress || 'unknown';
  
  // Log de seguridad
  console.log(`[LogsGonstr-Security] ${new Date().toISOString()} - Request: ${context.request.method} ${context.url.pathname} - IP: ${clientIP} - UA: ${userAgent}`);

  try {
    const response = await next();
    
    // Headers de seguridad críticos
    response.headers.set('Content-Security-Policy', 
      "default-src 'self'; " +
      "img-src 'self' https: data: blob:; " +
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com; " +
      "font-src 'self' fonts.gstatic.com; " +
      "script-src 'self' 'unsafe-inline'; " +
      "connect-src 'self' vercel.live; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'"
    );
    
    // Headers de protección adicionales
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 
      'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()'
    );
    
    // Header personalizado LogsGonstr
    response.headers.set('X-Powered-By-LogsGonstr', 'Secure-Portfolio-v1.0');
    response.headers.set('X-Security-Scan', `${Date.now()}`);
    
    const responseTime = Date.now() - startTime;
    
    // Log de respuesta exitosa
    console.log(`[LogsGonstr-Security] ${new Date().toISOString()} - Response: ${response.status} - Time: ${responseTime}ms - Path: ${context.url.pathname}`);
    
    return response;
    
  } catch (error) {
    // Log de errores de seguridad
    console.error(`[LogsGonstr-Security-ERROR] ${new Date().toISOString()} - Error: ${error} - IP: ${clientIP} - Path: ${context.url.pathname}`);
    
    // Crear respuesta de error segura
    const errorResponse = new Response('Internal Server Error', { 
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        'X-Error-ID': `LogsGonstr-${Date.now()}`,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY'
      }
    });
    
    return errorResponse;
  }
};