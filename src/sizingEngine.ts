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

// NUEVA INTERFAZ: Recomendación de Nodos para el Arquitecto
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
  nodosSugeridos: RecomendacionNodos; // <--- Inyección de infraestructura
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
      nodosSugeridos: { perfilNodoSugerido: 'Ninguno', cpuPorNodo: 0, ramPorNodo: 0, cantidadNodosRecomendados: 0, explicacionHA: 'Añade componentes.' }
    };
  }

  req.componentes.forEach(comp => {
    cpuTotalRequest += comp.cpuRequest * comp.replicas;
    ramTotalRequest += comp.ramRequest * comp.replicas;
  });

  // [Aquí se mantienen todas las baterías de pruebas estáticas previas (A, B, C, D, E)...]
  // (Para mantener el código limpio en la explicación, asumimos que se ejecutan internamente y modifican 'tieneBloqueoCritico')

  // ========================================================
  // LÓGICA DE DIMENSIONAMIENTO DE NODOS WORKER (REQUERIMIENTO NUEVO)
  // ========================================================

  // Margen reservado para el Sistema Operativo + Kubelet + OpenShift Daemons (generalmente ~0.5 vCPU y 1.5Gi RAM por nodo)
  const overheadCPU = 0.5;
  const overheadRAM = 1.5;

  let cpuPorNodo = 4;
  let ramPorNodo = 16;
  let perfilNodoSugerido = "Standard (4 Cores / 16 GiB RAM)";

  // Escalado dinámico del tamaño del nodo basado en la densidad de la carga agregada
  if (cpuTotalRequest > 12 || ramTotalRequest > 48) {
    cpuPorNodo = 16;
    ramPorNodo = 64;
    perfilNodoSugerido = "Compute Intensive XL (16 Cores / 64 GiB RAM)";
  } else if (cpuTotalRequest > 4 || ramTotalRequest > 16) {
    cpuPorNodo = 8;
    ramPorNodo = 32;
    perfilNodoSugerido = "Medium Production (8 Cores / 32 GiB RAM)";
  }

  // Capacidad utilizable real por nodo restando el overhead básico de OpenShift
  const cpuUtilizablePorNodo = cpuPorNodo - overheadCPU;
  const ramUtilizablePorNodo = ramPorNodo - overheadRAM;

  // Cálculo de nodos bajo el principio de resiliencia N+1 (Mínimo 2 en Non-Prod, Mínimo 3 en Prod para quorum)
  const nodosPorCPU = Math.ceil(cpuTotalRequest / cpuUtilizablePorNodo);
  const nodosPorRAM = Math.ceil(ramTotalRequest / ramUtilizablePorNodo);

  let cantidadNodosRecomendados = Math.max(nodosPorCPU, nodosPorRAM);

  // Forzar políticas de HA a nivel Clúster
  if (req.ambiente === 'prod') {
    // En producción garantizamos un clúster mínimo de 3 nodos para tolerar la pérdida de 1 Worker entero (N+1)
    if (cantidadNodosRecomendados < 2) {
      cantidadNodosRecomendados = 3;
    } else {
      cantidadNodosRecomendados += 1; // Añadimos el nodo extra de tolerancia (+1)
    }
  } else {
    // En desarrollo/QA, con 2 nodos es suficiente para probar scheduling y afinidades
    if (cantidadNodosRecomendados < 2) cantidadNodosRecomendados = 2;
  }

  const explicacionHA = req.ambiente === 'prod'
    ? `Configuración resiliente (Estrategia N+1). Al usar ${cantidadNodosRecomendados} nodos, si uno falla catastróficamente, los ${cantidadNodosRecomendados - 1} restantes absorberán los ${cpuTotalRequest.toFixed(1)} Cores y ${ramTotalRequest.toFixed(1)} GiB de la app sin generar cortes de servicio.`
    : `Configuración para ambiente No Productivo. Se sugieren ${cantidadNodosRecomendados} nodos mínimos para permitir la distribución de Pods, sin redundancia estricta ante fallos de hardware.`;

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