// src/sizingEngine.ts

export type TipoComponente = 'microservicio' | 'database' | 'cache' | 'frontend';

export type StackTecnologico = 
  | 'java' | 'quarkus' | 'node' | 'python' | 'go'
  | 'postgresql' | 'mysql' | 'oracle'
  | 'mongodb' | 'cassandra'
  | 'redis' | 'memcached'
  | 'nginx' | 'apache';

export interface ComponenteSizing {
  id: string;
  nombre: string;
  tipo: TipoComponente;
  stack: StackTecnologico;
  cpuRequest: number;
  cpuLimit: number;
  ramRequest: number;
  ramLimit: number;
  replicas: number;
  tipoStorage: 'none' | 'rwo' | 'rwx';
}

export interface ReqSizingTopologia {
  ambiente: 'prod' | 'non-prod';
  componentes: ComponenteSizing[];
}

export interface ResultadoTest {
  nombreTest: string;
  status: 'VERDE' | 'AMARILLO' | 'ROJO';
  mensaje: string;
}

export interface RecomendacionNodos {
  perfilNodoSugerido: string;
  cpuPorNodo: number;
  ramPorNodo: number;
  cantidadNodosRecomendados: number;
  explicacionHA: string;
}

export interface ReporteSizing {
  estaAprobado: boolean;
  totalesCluster: {
    cpuTotalRequest: number;
    ramTotalRequest: number;
  };
  pruebas: ResultadoTest[];
  nodosSugeridos: RecomendacionNodos;
}

export function validarTopologia(req: ReqSizingTopologia): ReporteSizing {
  const pruebas: ResultadoTest[] = [];
  let cpuTotalRequest = 0;
  let ramTotalRequest = 0;
  let tieneBloqueoCritico = false;

  if (req.componentes.length === 0) {
    return {
      estaAprobado: false,
      totalesCluster: { cpuTotalRequest: 0, ramTotalRequest: 0 },
      pruebas: [{ nombreTest: "Topología de App", status: "AMARILLO", mensaje: "La arquitectura no tiene componentes todavía." }],
      nodosSugeridos: { perfilNodoSugerido: 'Ninguno', cpuPorNodo: 0, ramPorNodo: 0, cantidadNodosRecomendados: 0, explicacionHA: 'Añade componentes para calcular la infraestructura.' }
    };
  }

  // 1. Calcular totales globales acumulados
  req.componentes.forEach(comp => {
    cpuTotalRequest += comp.cpuRequest * comp.replicas;
    ramTotalRequest += comp.ramRequest * comp.replicas;
  });

  // 2. Batería de Pruebas Contextuales por Componente
  req.componentes.forEach(comp => {
    
    // Reglas de HA Generales
    if (req.ambiente === 'prod' && comp.replicas < 2) {
      pruebas.push({
        nombreTest: `HA - ${comp.nombre}`,
        status: 'ROJO',
        mensaje: `El componente [${comp.nombre}] (${comp.tipo}) en PROD debe tener al menos 2 réplicas para soportar fallos de nodos.`
      });
      tieneBloqueoCritico = true;
    }

    if (comp.replicas > 8) {
      pruebas.push({
        nombreTest: `Escalado Horizontal - ${comp.nombre}`,
        status: 'AMARILLO',
        mensaje: `Demasiadas réplicas estáticas (${comp.replicas}). Considera usar un HorizontalPodAutoscaler (HPA).`
      });
    }

    // Overcommit CPU
    if (comp.cpuLimit > comp.cpuRequest * 4) {
      pruebas.push({
        nombreTest: `Overcommit CPU - ${comp.nombre}`,
        status: 'AMARILLO',
        mensaje: `Límite de CPU muy alto (4x request) en [${comp.nombre}]. Riesgo de estrangulamiento si el nodo se satura.`
      });
    }

    // Reglas específicas: Bases de Datos
    if (comp.tipo === 'database') {
      const ratio = comp.ramRequest / comp.cpuRequest;

      if (comp.tipoStorage === 'none') {
        pruebas.push({
          nombreTest: `Persistencia CRÍTICA - ${comp.nombre}`,
          status: 'ROJO',
          mensaje: `Las Bases de Datos NO pueden usar almacenamiento 'None'. Requerirán volúmenes persistentes RWO o RWX.`
        });
        tieneBloqueoCritico = true;
      }

      if (ratio < 4) {
        pruebas.push({
          nombreTest: `Perfil RAM Base Datos - ${comp.nombre}`,
          status: 'AMARILLO',
          mensaje: `Ratio RAM/CPU bajo (${ratio.toFixed(1)}). Las bases de datos requieren más memoria por Core (sugerido > 4:1) para optimizar cachés.`
        });
      }
    }

    // Reglas específicas: Microservicios
    if (comp.tipo === 'microservicio') {
      if (comp.stack === 'java' && comp.ramRequest < 2) {
        pruebas.push({
          nombreTest: `RAM Java - ${comp.nombre}`,
          status: 'ROJO',
          mensaje: `Java Spring Boot requiere al menos 2GiB de RAM Request para arrancar la JVM correctamente y evitar OutOfMemoryKills.`
        });
        tieneBloqueoCritico = true;
      }
    }

    // Reglas específicas: Cachés
    if (comp.tipo === 'cache') {
      if (comp.cpuRequest > 1) {
        pruebas.push({
          nombreTest: `CPU Caché - ${comp.nombre}`,
          status: 'AMARILLO',
          mensaje: `Los cachés son de memoria intensiva, no de CPU. Podrías estar desperdiciando cores en [${comp.nombre}].`
        });
      }
    }

    // Reglas específicas: Frontends
    if (comp.tipo === 'frontend') {
      if (comp.cpuRequest > 0.5 || comp.ramRequest > 1) {
        pruebas.push({
          nombreTest: `Recursos Frontend - ${comp.nombre}`,
          status: 'AMARILLO',
          mensaje: `Sugerencia: Reduce los recursos de [${comp.nombre}] a 0.2 CPU y 512Mi RAM, ya que es un servidor estático ligero.`
        });
      }
    }
  });

  // 3. Lógica de Dimensionamiento de Nodos Worker
  const overheadCPU = 0.5;
  const overheadRAM = 1.5;

  let cpuPorNodo = 4;
  let ramPorNodo = 16;
  let perfilNodoSugerido = "Standard (4 Cores / 16 GiB RAM)";

  if (cpuTotalRequest > 12 || ramTotalRequest > 48) {
    cpuPorNodo = 16;
    ramPorNodo = 64;
    perfilNodoSugerido = "Compute Intensive XL (16 Cores / 64 GiB RAM)";
  } else if (cpuTotalRequest > 4 || ramTotalRequest > 16) {
    cpuPorNodo = 8;
    ramPorNodo = 32;
    perfilNodoSugerido = "Medium Production (8 Cores / 32 GiB RAM)";
  }

  const cpuUtilizablePorNodo = cpuPorNodo - overheadCPU;
  const ramUtilizablePorNodo = ramPorNodo - overheadRAM;

  const nodosPorCPU = Math.ceil(cpuTotalRequest / cpuUtilizablePorNodo);
  const nodosPorRAM = Math.ceil(ramTotalRequest / ramUtilizablePorNodo);
  
  let cantidadNodosRecomendados = Math.max(nodosPorCPU, nodosPorRAM);

  if (req.ambiente === 'prod') {
    if (cantidadNodosRecomendados < 2) {
      cantidadNodosRecomendados = 3; 
    } else {
      cantidadNodosRecomendados += 1; 
    }
  } else {
    if (cantidadNodosRecomendados < 2) cantidadNodosRecomendados = 2;
  }

  const explicacionHA = req.ambiente === 'prod' 
    ? `Estrategia N+1 en PROD. Al usar ${cantidadNodosRecomendados} nodos, si uno falla catastróficamente, los ${cantidadNodosRecomendados - 1} restantes absorberán los ${cpuTotalRequest.toFixed(1)} Cores y ${ramTotalRequest.toFixed(1)} GiB globales de la aplicación sin cortes.`
    : `Ambiente No Productivo. Se sugieren ${cantidadNodosRecomendados} nodos mínimos para permitir distribución de Pods básicos sin redundancia extrema de infraestructura.`;

  return {
    estaAprobado: !tieneBloqueoCritico,
    totalesCluster: { cpuTotalRequest, ramTotalRequest },
    pruebas,
    nodosSugeridos: {
      perfilNodoSugerido,
      cpuPorNodo,
      ramPorNodo,
      cantidadNodosRecomendados,
      explicacionHA
    }
  };
}