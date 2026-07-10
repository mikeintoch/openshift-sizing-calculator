// src/components/InfrastructureAI.tsx
import React from 'react';
import { type ComponenteSizing, type ReporteSizing } from '../core/sizingEngine';
import { type FilaAuditoria } from '../services/webGpuAIService';

interface InfrastructureAIProps {
  componentes: ComponenteSizing[];
  reporte: ReporteSizing;
  contextoTexto: string;
  setContextoTexto: (texto: string) => void;
  ejecutarAnalisisIA: () => void;
  cargandoLLM: boolean;
  progresoCarga: string;
  analisisTabla: FilaAuditoria[];
}

export const InfrastructureAI: React.FC<InfrastructureAIProps> = ({
  componentes,
  reporte,
  contextoTexto,
  setContextoTexto,
  ejecutarAnalisisIA,
  cargandoLLM,
  progresoCarga,
  analisisTabla,
}) => {
  return (
    <div className="space-y-6">
      {/* Capacidad del Clúster e Infraestructura Recomendada */}
      {componentes.length > 0 && (
        <section className="bg-slate-800 p-5 rounded-xl border border-blue-500/20 shadow-xl">
          <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-3">
            🎛️ Infraestructura de Nodos (Capacidad Clúster)
          </h3>
          <div className="grid grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-lg border border-slate-700 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Perfil del Nodo</span>
              <span className="font-bold text-white text-sm">{reporte.nodosSugeridos.perfilNodoSugerido}</span>
            </div>
            <div className="border-l pl-4 border-slate-700">
              <span className="text-slate-400 block font-medium">Workers (N+1)</span>
              <span className="text-lg font-extrabold text-emerald-400">
                {reporte.nodosSugeridos.cantidadNodosRecomendados} Workers
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed bg-slate-900/30 p-2 rounded border border-slate-800 italic">
            {reporte.nodosSugeridos.explicacionHA}
          </p>
        </section>
      )}

      {/* Entrada para Auditoría de Coherencia con la IA Local */}
      <section className="bg-slate-800 p-5 rounded-xl shadow-xl border border-slate-700">
        <h2 className="text-lg font-bold mb-2 text-white">3. Auditoría de Coherencia (IA Local)</h2>
        <textarea 
          value={contextoTexto} 
          onChange={(e) => setContextoTexto(e.target.value)} 
          placeholder="Ej: Es un sistema de e-commerce donde el frontend consume el microservicio de órdenes..." 
          className="w-full bg-slate-900 border border-slate-600 rounded p-3 h-24 text-white text-xs focus:outline-none resize-none" 
        />
        <button 
          onClick={ejecutarAnalisisIA} 
          disabled={cargandoLLM || !contextoTexto.trim() || componentes.length === 0} 
          className="mt-3 w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-2 px-4 rounded text-xs transition-colors"
        >
          {cargandoLLM ? 'Procesando con WebGPU Local...' : 'Auditar Topología con IA'}
        </button>
        {progresoCarga && <p className="text-[11px] text-slate-400 mt-2 italic text-center">{progresoCarga}</p>}
      </section>

      {/* Reporte Tabular de Prioridades desde JSON parseado */}
      {analisisTabla.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-950/40 to-slate-800 p-5 rounded-xl border border-indigo-500/30 shadow-2xl overflow-hidden">
          <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">
            🤖 Reporte Ejecutivo Estructurado (Componente React Nativo)
          </h3>
          <div className="overflow-x-auto rounded-lg border border-slate-700/60 bg-slate-900/60">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/80 text-indigo-300 font-bold">
                  <th className="p-3">Prioridad</th>
                  <th className="p-3">Componente</th>
                  <th className="p-3">Riesgo / Hallazgo</th>
                  <th className="p-3">Recomendación</th>
                </tr>
              </thead>
              <tbody>
                {analisisTabla.map((fila, index) => {
                  const badgeStyle = {
                    URGENTE: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
                    MEDIA: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                    BAJA: 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                  }[fila.prioridad] || 'bg-slate-500/10 text-slate-400';

                  return (
                    <tr key={index} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 whitespace-nowrap align-top">
                        <span className={`px-2 py-0.5 rounded border font-mono font-extrabold text-[10px] ${badgeStyle}`}>
                          {fila.prioridad}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-blue-400 align-top whitespace-nowrap">
                        {fila.componente}
                      </td>
                      <td className="p-3 text-slate-300 align-top leading-relaxed min-w-[150px]">
                        {fila.riesgo}
                      </td>
                      <td className="p-3 text-slate-400 align-top leading-relaxed min-w-[180px]">
                        {fila.recomendacion}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};