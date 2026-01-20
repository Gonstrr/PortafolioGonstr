// LogsGonstr Security Monitoring System
// Version: 1.0.0
// Last Updated: 2026-01-20

export interface SecurityLog {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  event: string;
  details: Record<string, any>;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
}

export class LogsGonstrSecurity {
  private static instance: LogsGonstrSecurity;
  private logs: SecurityLog[] = [];
  private readonly maxLogs = 1000;
  
  private constructor() {}
  
  public static getInstance(): LogsGonstrSecurity {
    if (!LogsGonstrSecurity.instance) {
      LogsGonstrSecurity.instance = new LogsGonstrSecurity();
    }
    return LogsGonstrSecurity.instance;
  }
  
  public log(level: SecurityLog['level'], event: string, details: Record<string, any> = {}, request?: Request): void {
    const logEntry: SecurityLog = {
      timestamp: new Date().toISOString(),
      level,
      event,
      details: {
        ...details,
        buildVersion: __VERSION__ || '1.0.0-LogsGonstr',
        buildTime: __BUILD_TIME__ || new Date().toISOString()
      },
      ip: this.extractIP(request),
      userAgent: request?.headers.get('user-agent') || undefined,
      endpoint: request ? new URL(request.url).pathname : undefined
    };
    
    // Mantener solo los últimos logs para evitar problemas de memoria
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // Log a console
    const consoleMessage = `[LogsGonstr-${level}] ${logEntry.timestamp} - ${event}`;
    switch (level) {
      case 'INFO':
        console.log(consoleMessage, logEntry);
        break;
      case 'WARN':
        console.warn(consoleMessage, logEntry);
        break;
      case 'ERROR':
        console.error(consoleMessage, logEntry);
        break;
      case 'CRITICAL':
        console.error(`🚨 ${consoleMessage}`, logEntry);
        break;
    }
    
    // Enviar logs críticos a endpoint externo (si está configurado)
    if (level === 'CRITICAL' && typeof window !== 'undefined') {
      this.sendCriticalAlert(logEntry);
    }
  }
  
  private extractIP(request?: Request): string | undefined {
    if (!request) return undefined;
    
    // Intentar obtener IP real de headers de Vercel
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const vercelForwardedFor = request.headers.get('x-vercel-forwarded-for');
    
    return vercelForwardedFor || realIP || forwardedFor?.split(',')[0] || undefined;
  }
  
  private async sendCriticalAlert(log: SecurityLog): Promise<void> {
    try {
      // En producción, aquí enviarías a tu servicio de monitoreo
      console.log('🚨 CRITICAL SECURITY ALERT:', log);
      
      // Placeholder para integración futura con servicios como Sentry, DataDog, etc.
      // await fetch('/api/security-alert', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(log)
      // });
    } catch (error) {
      console.error('[LogsGonstr] Failed to send critical alert:', error);
    }
  }
  
  public getRecentLogs(limit = 50): SecurityLog[] {
    return this.logs.slice(-limit);
  }
  
  public getLogsByLevel(level: SecurityLog['level'], limit = 50): SecurityLog[] {
    return this.logs
      .filter(log => log.level === level)
      .slice(-limit);
  }
  
  public getCriticalEvents(): SecurityLog[] {
    return this.logs.filter(log => log.level === 'CRITICAL');
  }
  
  public generateSecurityReport(): {
    summary: Record<SecurityLog['level'], number>;
    recentEvents: SecurityLog[];
    criticalEvents: SecurityLog[];
    timeRange: { from: string; to: string };
  } {
    const summary = this.logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {} as Record<SecurityLog['level'], number>);
    
    return {
      summary,
      recentEvents: this.getRecentLogs(10),
      criticalEvents: this.getCriticalEvents(),
      timeRange: {
        from: this.logs[0]?.timestamp || new Date().toISOString(),
        to: this.logs[this.logs.length - 1]?.timestamp || new Date().toISOString()
      }
    };
  }
}

// Función de conveniencia para logging
export const LogsGonstr = LogsGonstrSecurity.getInstance();

// Eventos de seguridad predefinidos
export const SECURITY_EVENTS = {
  // Accesos
  NORMAL_ACCESS: 'NORMAL_ACCESS',
  SUSPICIOUS_ACCESS: 'SUSPICIOUS_ACCESS',
  BLOCKED_ACCESS: 'BLOCKED_ACCESS',
  
  // Errores
  CSP_VIOLATION: 'CSP_VIOLATION',
  XSS_ATTEMPT: 'XSS_ATTEMPT',
  SQL_INJECTION_ATTEMPT: 'SQL_INJECTION_ATTEMPT',
  
  // Sistema
  SYSTEM_START: 'SYSTEM_START',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  RATE_LIMIT_HIT: 'RATE_LIMIT_HIT',
  
  // Monitoreo
  HEALTH_CHECK: 'HEALTH_CHECK',
  PERFORMANCE_ALERT: 'PERFORMANCE_ALERT',
  SECURITY_SCAN: 'SECURITY_SCAN'
} as const;

// Declaraciones globales para TypeScript
declare global {
  const __VERSION__: string;
  const __BUILD_TIME__: string;
  const __SECURE__: boolean;
}