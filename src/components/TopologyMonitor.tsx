// src/components/TopologyMonitor.tsx
import React from 'react';
import { type ComponenteSizing, type ReporteSizing } from '../core/sizingEngine';

interface TopologyMonitorProps {
  reporte: ReporteSizing;
  componentes: ComponenteSizing[];
  eliminarComponente: (id: string) => void;
}

export const TopologyMonitor: React.FC<TopologyMonitorProps> = ({
  reporte,
  componentes,
  eliminarComponente,
}) => {
  return (
    <div className="space-y-6">
      {/* Estado del Dictamen Estático (PASS/HOLD) */}
      <div className={`p-4 rounded-xl border flex items-center justify-between ${reporte.estaAprobado ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400' : 'bg-rose-950/40 border-rose-500/50 text-rose-400'}`}>
        <div>
          <span className="text-xs uppercase font-bold tracking-wider opacity-75">Dictamen Estático</span>
          <h3 className="text-xl font-black">{reporte.estaAprobado ? 'TOPOLOGÍA VÁLIDA' : 'REQUIERE REVISIÓN'}</h3>
        </div>
        <div className={`text-2xl font-bold px-3 py-1 rounded-lg ${reporte.estaAprobado ? 'bg-emerald-500 text-slate-900' : 'bg-rose-500 text-slate-900'}`}>
          {reporte.estaAprobado ? 'PASS' : 'HOLD'}
        </div>
      </div>

      {/* Totales de Recursos Acumulados */}
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-slate-900/50 rounded-lg">
          <span className="text-xs text-slate-400 block">Total CPU Acumulada</span>
          <span className="text-xl font-extrabold text-blue-400">{reporte.totalesCluster.cpuTotalRequest.toFixed(2)} Cores</span>
        </div>
        <div className="text-center p-3 bg-slate-900/50 rounded-lg">
          <span className="text-xs text-slate-400 block">Total RAM Acumulada</span>
          <span className="text-xl font-extrabold text-blue-400">{reporte.totalesCluster.ramTotalRequest.toFixed(2)} GiB</span>
        </div>
      </div>

      {/* Listado de Componentes Creados */}
      <section className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-xl">
        <h2 className="text-lg font-bold mb-3 text-white">Componentes en la App ({componentes.length})</h2>
        {componentes.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No has agregado componentes aún.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {componentes.map(c => (
              <div key={c.id} className="p-3 bg-slate-900/60 border border-slate-700 rounded-lg text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-bold text-blue-400">{c.nombre}</span>
                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded ml-2 border border-slate-600 uppercase text-slate-300">{c.stack}</span>
                  </div>
                  <button onClick={() => eliminarComponente(c.id)} className="text-rose-400 hover:text-rose-300 text-[11px] px-2 py-0.5 bg-rose-500/10 rounded border border-rose-500/20">
                    Borrar
                  </button>
                </div>
                <div className="text-[11px] text-slate-400">
                  Pods: {c.replicas} | {c.cpuRequest}vCPU | {c.ramRequest}GiB | STG: {c.tipoStorage.toUpperCase()}
                </div>
                
                {/* Visualizador de Dependencias de Red */}
                {c.conexiones.length > 0 && (
                  <div className="text-[10px] text-slate-400 flex flex-wrap gap-1 items-center bg-slate-900/40 p-1 rounded border border-slate-800/60">
                    <span className="text-indigo-400 font-medium">➡️ Enruta a:</span>
                    {c.conexiones.map(idConn => {
                      const dest = componentes.find(comp => comp.id === idConn);
                      return dest ? (
                        <span key={idConn} className="bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded border border-slate-700 font-semibold">
                          {dest.nombre}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Resultados de las Pruebas de Reglas Estáticas */}
      <div className="bg-slate-800 p-5 rounded-xl shadow-xl border border-slate-700">
        <h2 className="text-lg font-bold mb-3 text-white">Resultado de Reglas Estáticas</h2>
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
          {reporte.pruebas.map((test, index) => {
            const badgeColors = {
              VERDE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
              AMARILLO: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
              ROJO: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
            }[test.status];

            return (
              <div key={index} className="p-2.5 rounded-lg border bg-slate-900/40 flex flex-col gap-0.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-white">{test.nombreTest}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono font-bold ${badgeColors}`}>{test.status}</span>
                </div>
                <p className="text-slate-400 mt-0.5 leading-relaxed">{test.mensaje}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};