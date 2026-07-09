// src/sizingEngine.ts

// 1. Definimos la estructura de datos que enviará el formulario
export interface ReqSizing {
  sistemaNombre: string;
  stack: 'java' | 'node' | 'python' | 'go' | 'quarkus';
  ambiente: 'prod' | 'non-prod';
  cpuRequest: number;  // En Cores (ej. 0.5 para 500m)
  cpuLimit: number;    // En Cores (ej. 1)
  ramRequest: number;  // En GiB (ej. 2)
  ramLimit: number;    // En GiB (ej. 4)
  replicas: number;
  tipoStorage: 'none' | 'rwo' | 'rwx';
}

// 2. Estructura del resultado de cada prueba individual
export interface ResultadoTest {
  nombreTest: string;
  status: 'VERDE' | 'AMARILLO' | 'ROJO';
  mensaje: string;
}

// 3. Estructura del reporte final consolidado
export interface ReporteValidacion {
  estaAprobado: boolean;
  pruebas: ResultadoTest[];
  totalesCluster: {
    cpuTotalRequest: number;
    ramTotalRequest: number;
  };
}

// 4. Función Principal del Motor de Reglas
export function validarSizing(data: ReqSizing): ReporteValidacion {
  const pruebas: ResultadoTest[] = [];

  // --- TEST 1: Proporción CPU / RAM (Requests) ---
  const ratioRamCpu = data.ramRequest / data.cpuRequest; // GiB por cada Core
  if (ratioRamCpu < 1) {
    pruebas.push({
      nombreTest: "Proporción CPU/RAM",
      status: "ROJO",
      mensaje: `Desbalance crítico: Estás asignando mucha CPU para muy poca RAM (${ratioRamCpu.toFixed(1)} GiB/Core). Riesgo alto de caídas por falta de memoria.`
    });
  } else if (ratioRamCpu > 8) {
    pruebas.push({
      nombreTest: "Proporción CPU/RAM",
      status: "AMARILLO",
      mensaje: `Sobredimensionado: Asignas mucha memoria por cada Core (${ratioRamCpu.toFixed(1)} GiB/Core). Asegúrate de que el stack realmente use caché intensiva.`
    });
  } else {
    pruebas.push({
      nombreTest: "Proporción CPU/RAM",
      status: "VERDE",
      mensaje: "Relación CPU/RAM balanceada y óptima para OpenShift."
    });
  }

  // --- TEST 2: Alta Disponibilidad (HA) según el Ambiente ---
  if (data.ambiente === 'prod' && data.replicas < 2) {
    pruebas.push({
      nombreTest: "Alta Disponibilidad (HA)",
      status: "ROJO",
      mensaje: "Error de Arquitectura: Los ambientes de Producción deben tener mínimo 2 réplicas para soportar actualizaciones sin caída de servicio (Rolling Updates)."
    });
  } else if (data.ambiente === 'non-prod' && data.replicas > 3) {
    pruebas.push({
      nombreTest: "Alta Disponibilidad (HA)",
      status: "AMARILLO",
      mensaje: "Sugerencia de Optimización: Para ambientes de desarrollo/testing, 1 o 2 réplicas suelen ser suficientes. Considera reducir costos."
    });
  } else {
    pruebas.push({
      nombreTest: "Alta Disponibilidad (HA)",
      status: "VERDE",
      mensaje: "Estrategia de réplicas adecuada para el tipo de ambiente."
    });
  }

  // --- TEST 3: Relación Requests vs Limits (Overcommit) ---
  const ratioCpuLimit = data.cpuLimit / data.cpuRequest;
  const ratioRamLimit = data.ramLimit / data.ramRequest;

  if (ratioCpuLimit > 4 || ratioRamLimit > 2) {
    pruebas.push({
      nombreTest: "Límites de Sobrecarga (Overcommit)",
      status: "AMARILLO",
      mensaje: "Alerta: El límite (Limit) es demasiado alto comparado con lo garantizado (Request). Puede causar inestabilidad si el nodo físico se satura."
    });
  } else if (data.cpuRequest >= data.cpuLimit && data.ramRequest >= data.ramLimit) {
    pruebas.push({
      nombreTest: "Límites de Sobrecarga (Overcommit)",
      status: "VERDE",
      mensaje: "Garantía de Recursos (Guaranteed QoS): Los Requests y Limits son iguales. Comportamiento predecible y seguro."
    });
  } else {
    pruebas.push({
      nombreTest: "Límites de Sobrecarga (Overcommit)",
      status: "VERDE",
      mensaje: "Límites configurados dentro de rangos tolerables (Burstable QoS)."
    });
  }

  // --- TEST 4: Tipo de Almacenamiento vs Réplicas ---
  if (data.replicas > 1 && data.tipoStorage === 'rwo') {
    pruebas.push({
      nombreTest: "Compatibilidad de Almacenamiento",
      status: "ROJO",
      mensaje: "Conflicto de Storage: Estás usando ReadWriteOnce (RWO) con múltiples réplicas. Si los Pods caen en nodos diferentes, no podrán iniciar. Cambia a ReadWriteMany (RWX) o usa almacenamiento sin estado."
    });
  } else {
    pruebas.push({
      nombreTest: "Compatibilidad de Almacenamiento",
      status: "VERDE",
      mensaje: "Configuración de almacenamiento compatible con el número de réplicas."
    });
  }

  // --- CÁLCULO DE TOTALES ---
  const cpuTotalRequest = data.cpuRequest * data.replicas;
  const ramTotalRequest = data.ramRequest * data.replicas;

  // Determinar si el pedimento pasa directo o se bloquea
  const tieneBloqueos = pruebas.some(p => p.status === 'ROJO');

  return {
    estaAprobado: !tieneBloqueos,
    pruebas,
    totalesCluster: {
      cpuTotalRequest,
      ramTotalRequest
    }
  };
}