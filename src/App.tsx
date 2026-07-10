// src/App.tsx
import React, { useState, useMemo } from 'react';
import { validarTopologia, type ComponenteSizing, type TipoComponente } from './core/sizingEngine';
import { aiService, type FilaAuditoria } from './services/webGpuAIService';

// Importación de los nuevos bloques modulares
import { ComponentForm } from './components/ComponentForm';
import { TopologyMonitor } from './components/TopologyMonitor';
import { InfrastructureAI } from './components/InfrastructureAI';

export default function App() {
  const [ambiente, setAmbiente] = useState<'prod' | 'non-prod'>('prod');
  const [componentes, setComponentes] = useState<ComponenteSizing[]>([]);

  const [nuevoComp, setNuevoComp] = useState<{
    nombre: string;
    tipo: TipoComponente;
    stack: any;
    cpuRequest: number;
    cpuLimit: number;
    ramRequest: number;
    ramLimit: number;
    replicas: number;
    tipoStorage: 'none' | 'rwo' | 'rwx';
    conexiones: string[];
  }>({
    nombre: '', tipo: 'microservicio', stack: 'java', cpuRequest: 1, cpuLimit: 2, ramRequest: 4, ramLimit: 8, replicas: 2, tipoStorage: 'none', conexiones: []
  });

  const [contextoTexto, setContextoTexto] = useState('');
  const [analisisTabla, setAnalisisTabla] = useState<FilaAuditoria[]>([]);
  const [progresoCarga, setProgresoCarga] = useState('');
  const [cargandoLLM, setCargandoLLM] = useState(false);

  const reporte = useMemo(() => {
    return validarTopologia({ ambiente, componentes });
  }, [ambiente, componentes]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumber = ['cpuRequest', 'cpuLimit', 'ramRequest', 'ramLimit', 'replicas'].includes(name);
    
    setNuevoComp(prev => {
      const actualizacion: any = { ...prev, [name]: isNumber ? parseFloat(value) || 0 : value };
      if (name === 'tipo') {
        if (value === 'microservicio') { actualizacion.stack = 'java'; actualizacion.tipoStorage = 'none'; }
        else if (value === 'database') { actualizacion.stack = 'postgresql'; actualizacion.tipoStorage = 'rwo'; }
        else if (value === 'cache') { actualizacion.stack = 'redis'; actualizacion.tipoStorage = 'none'; }
        else if (value === 'frontend') { actualizacion.stack = 'nginx'; actualizacion.tipoStorage = 'none'; }
      }
      return actualizacion;
    });
  };

  const handleToggleConexion = (idDestino: string) => {
    setNuevoComp(prev => {
      const existe = prev.conexiones.includes(idDestino);
      return { ...prev, conexiones: existe ? prev.conexiones.filter(id => id !== idDestino) : [...prev.conexiones, idDestino] };
    });
  };

  const agregarComponente = () => {
    if (!nuevoComp.nombre.trim()) return;
    setComponentes(prev => [...prev, { ...nuevoComp, id: crypto.randomUUID() }]);
    setNuevoComp(prev => ({ ...prev, nombre: '', conexiones: [] }));
  };

  const eliminarComponente = (id: string) => {
    setComponentes(prev => {
      const filtrados = prev.filter(c => c.id !== id);
      return filtrados.map(c => ({ ...c, conexiones: c.conexiones.filter(connId => connId !== id) }));
    });
  };

  const ejecutarAnalisisIA = async () => {
    if (!contextoTexto.trim() || componentes.length === 0) return;
    setCargandoLLM(true);
    setAnalisisTabla([]);
    try {
      await aiService.inicializarMotor((msg) => setProgresoCarga(msg));
      const resultadoJSON = await aiService.auditarTopologia(contextoTexto, ambiente, componentes);
      setAnalisisTabla(resultadoJSON);
      setProgresoCarga('Auditoría completada con éxito.');
    } catch (error) {
      console.error(error);
      setAnalisisTabla([{ prioridad: 'URGENTE', componente: 'Modular Pipeline', riesgo: `Error: ${error}`, recomendacion: 'Reintenta.' }]);
      setProgresoCarga('');
    } finally { setCargandoLLM(false); }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
      <header className="max-w-[1800px] mx-auto mb-8 pb-4 border-b border-slate-800">
        <h1 className="text-3xl font-extrabold text-blue-400">OpenShift Sizing Calculator 🚀</h1>
        <p className="text-slate-400 mt-1">Plataforma de Diseño y Dimensionamiento de Topologías Corporativas</p>
      </header>

      {/* Grilla principal con llamadas limpias a los componentes modulares */}
      <main className="max-w-[1800px] mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
        <ComponentForm 
          ambiente={ambiente} setAmbiente={setAmbiente} componentes={componentes}
          nuevoComp={nuevoComp} handleFormChange={handleFormChange}
          handleToggleConexion={handleToggleConexion} agregarComponente={agregarComponente}
        />
        
        <TopologyMonitor 
          reporte={reporte} componentes={componentes} eliminarComponente={eliminarComponente}
        />
        
        <InfrastructureAI 
          componentes={componentes} reporte={reporte} contextoTexto={contextoTexto}
          setContextoTexto={setContextoTexto} ejecutarAnalisisIA={ejecutarAnalisisIA}
          cargandoLLM={cargandoLLM} progresoCarga={progresoCarga} analisisTabla={analisisTabla}
        />
      </main>
    </div>
  );
}