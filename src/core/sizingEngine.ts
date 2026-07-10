// src/core/sizingEngine.ts

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
  conexiones: string[]; 
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

  req.componentes.forEach(comp => {
    cpuTotalRequest += comp.cpuRequest * comp.replicas;
    ramTotalRequest += comp.ramRequest * comp.replicas;
  });

  req.componentes.forEach(comp => {
    if (req.ambiente === 'prod' && comp.replicas < 2) {
      pruebas.push({ nombreTest: `HA - ${comp.nombre}`, status: 'ROJO', mensaje: `El componente [${comp.nombre}] (${comp.tipo}) en PROD debe tener al menos 2 réplicas para soportar fallos de nodos.` });
      tieneBloqueoCritico = true;
    }

    if (comp.replicas > 8) {
      pruebas.push({ nombreTest: `Escalado Horizontal - ${comp.nombre}`, status: 'AMARILLO', mensaje: `Demasiadas réplicas estáticas (${comp.replicas}). Considera usar un HorizontalPodAutoscaler (HPA).` });
    }

    if (comp.cpuLimit > comp.cpuRequest * 4) {
      pruebas.push({ nombreTest: `Overcommit CPU - ${comp.nombre}`, status: 'AMARILLO', mensaje: `Límite de CPU muy alto (4x request) en [${comp.nombre}]. Riesgo de estrangulamiento si el nodo se satura.` });
    }

    if (comp.tipo === 'database') {
      const ratio = comp.ramRequest / comp.cpuRequest;
      if (comp.tipoStorage === 'none') {
        pruebas.push({ nombreTest: `Persistencia CRÍTICA - ${comp.nombre}`, status: 'ROJO', mensaje: `Las Bases de Datos NO pueden usar almacenamiento 'None'. Requerirán volúmenes persistentes RWO o RWX.` });
        tieneBloqueoCritico = true;
      }
      if (ratio < 4) {
        pruebas.push({ nombreTest: `Perfil RAM Base Datos - ${comp.nombre}`, status: 'AMARILLO', mensaje: `Ratio RAM/CPU bajo (${ratio.toFixed(1)}). Las bases de datos requieren más memoria por Core (sugerido > 4:1) para optimizar cachés.` });
      }
    }

    if (comp.tipo === 'microservicio') {
      if (comp.stack === 'java' && comp.ramRequest < 2) {
        pruebas.push({ nombreTest: `RAM Java - ${comp.nombre}`, status: 'ROJO', mensaje: `Java Spring Boot requiere al menos 2GiB de RAM Request para arrancar la JVM correctamente y evitar OutOfMemoryKills.` });
        tieneBloqueoCritico = true;
      }
    }

    if (comp.tipo === 'cache') {
      if (comp.cpuRequest > 1) {
        pruebas.push({ nombreTest: `CPU Caché - ${comp.nombre}`, status: 'AMARILLO', mensaje: `Los cachés son de memoria intensiva, no de CPU. Podrías estar desperdiciando cores en [${comp.nombre}].` });
      }
    }

    if (comp.tipo === 'frontend') {
      if (comp.cpuRequest > 0.5 || comp.ramRequest > 1) {
        pruebas.push({ nombreTest: `Recursos Frontend - ${comp.nombre}`, status: 'AMARILLO', mensaje: `Sugerencia: Reduce los recursos de [${comp.nombre}] a 0.2 CPU y 512Mi RAM, ya que es un servidor estático ligero.` });
      }
    }

    comp.conexiones.forEach(destinoId => {
      const destino = req.componentes.find(c => c.id === destinoId);
      if (!destino) return;

      if (comp.tipo === 'frontend' && destino.tipo === 'database') {
        pruebas.push({ nombreTest: `Seguridad de Red - ${comp.nombre}`, status: 'ROJO', mensaje: `Violación de Topología: El frontend [${comp.nombre}] no puede conectarse directo a la DB [${destino.nombre}]. Debe pasar por un Microservicio.` });
        tieneBloqueoCritico = true;
      }

      if (comp.tipo === 'database' && destino.tipo === 'microservicio') {
        pruebas.push({ nombreTest: `Flujo Inverso - ${comp.nombre}`, status: 'AMARILLO', mensaje: `Flujo inusual: La base de datos [${comp.nombre}] está iniciando red hacia la API [${destino.nombre}]. Revisa la dirección.` });
      }

      if (destino.conexiones.includes(comp.id)) {
        pruebas.push({ nombreTest: `Acoplamiento Cíclico - ${comp.nombre}`, status: 'AMARILLO', mensaje: `Dependencia circular mutua detectada entre [${comp.nombre}] y [${destino.nombre}].` });
      }
    });
  });

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
    cantidadNodosRecomendados = cantidadNodosRecomendados < 2 ? 3 : cantidadNodosRecomendados + 1;
  } else {
    if (cantidadNodosRecomendados < 2) cantidadNodosRecomendados = 2;
  }

  return {
    estaAprobado: !tieneBloqueoCritico,
    totalesCluster: { cpuTotalRequest, ramTotalRequest },
    pruebas,
    nodosSugeridos: {
      perfilNodoSugerido,
      cpuPorNodo,
      ramPorNodo,
      cantidadNodosRecomendados,
      explicacionHA: req.ambiente === 'prod' 
        ? `Estrategia N+1 en PROD. Al usar ${cantidadNodosRecomendados} nodos, si uno falla catastróficamente, los ${cantidadNodosRecomendados - 1} restantes absorberán los ${cpuTotalRequest.toFixed(1)} Cores y ${ramTotalRequest.toFixed(1)} GiB globales sin cortes.`
        : `Ambiente No Productivo. Se sugieren ${cantidadNodosRecomendados} nodos mínimos para permitir distribución de Pods básicos sin redundancia extrema de infraestructura.`
    }
  };
}