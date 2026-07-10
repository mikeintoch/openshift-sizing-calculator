// src/components/ComponentForm.tsx
import React from 'react';
import { type ComponenteSizing, type TipoComponente } from '../core/sizingEngine';

interface ComponentFormProps {
  ambiente: 'prod' | 'non-prod';
  setAmbiente: (amb: 'prod' | 'non-prod') => void;
  componentes: ComponenteSizing[];
  nuevoComp: {
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
  };
  handleFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleToggleConexion: (idDestino: string) => void;
  agregarComponente: () => void;
}

export const ComponentForm: React.FC<ComponentFormProps> = ({
  ambiente,
  setAmbiente,
  componentes,
  nuevoComp,
  handleFormChange,
  handleToggleConexion,
  agregarComponente,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. Definir Ambiente Global */}
      <section className="bg-slate-800 p-6 rounded-xl shadow-xl border border-slate-700">
        <h2 className="text-xl font-bold mb-4 text-white">1. Definir Ambiente Global</h2>
        <label className="block text-sm font-medium text-slate-300 mb-1">Ambiente de Despliegue</label>
        <select 
          value={ambiente} 
          onChange={(e) => setAmbiente(e.target.value as any)} 
          className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
        >
          <option value="prod">Producción (Prod) - Reglas de HA</option>
          <option value="non-prod">Desarrollo / QA (Non-Prod)</option>
        </select>
      </section>

      {/* 2. Detalles del Componente */}
      <section className="bg-slate-800 p-6 rounded-xl shadow-xl border border-slate-700">
        <h2 className="text-xl font-bold mb-4 text-white">2. Detalles del Componente</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Nombre</label>
              <input 
                type="text" 
                name="nombre" 
                value={nuevoComp.nombre} 
                onChange={handleFormChange} 
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none" 
                placeholder="ej: api-orders" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Tipo Componente</label>
              <select 
                name="tipo" 
                value={nuevoComp.tipo} 
                onChange={handleFormChange} 
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
              >
                <option value="microservicio">Microservicio (API)</option>
                <option value="database">Base de Datos</option>
                <option value="cache">Caché en Memoria</option>
                <option value="frontend">Frontend Estático</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Tecnología / Motor</label>
              <select 
                name="stack" 
                value={nuevoComp.stack} 
                onChange={handleFormChange} 
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
              >
                {nuevoComp.tipo === 'microservicio' && (
                  <>
                    <option value="java">Java Spring Boot</option>
                    <option value="quarkus">Quarkus</option>
                    <option value="node">Node.js</option>
                    <option value="python">Python (FastAPI)</option>
                    <option value="go">Go Lang</option>
                  </>
                )}
                {nuevoComp.tipo === 'database' && (
                  <>
                    <optgroup label="Relacionales (SQL)">
                      <option value="postgresql">PostgreSQL</option>
                      <option value="mysql">MySQL Server</option>
                      <option value="oracle">Oracle Database</option>
                    </optgroup>
                    <optgroup label="No Relacionales (NoSQL)">
                      <option value="mongodb">MongoDB</option>
                      <option value="cassandra">Apache Cassandra</option>
                    </optgroup>
                  </>
                )}
                {nuevoComp.tipo === 'cache' && (
                  <>
                    <option value="redis">Redis Cache</option>
                    <option value="memcached">Memcached</option>
                  </>
                )}
                {nuevoComp.tipo === 'frontend' && (
                  <>
                    <option value="nginx">Nginx Server</option>
                    <option value="apache">Apache HTTPD</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Réplicas (Pods)</label>
              <input 
                type="number" 
                name="replicas" 
                value={nuevoComp.replicas} 
                onChange={handleFormChange} 
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">CPU Req / Lim</label>
              <div className="flex gap-2">
                <input type="number" step="0.1" name="cpuRequest" value={nuevoComp.cpuRequest} onChange={handleFormChange} className="w-1/2 bg-slate-900 border border-slate-600 rounded px-2 py-2 text-white text-xs" />
                <input type="number" step="0.1" name="cpuLimit" value={nuevoComp.cpuLimit} onChange={handleFormChange} className="w-1/2 bg-slate-900 border border-slate-600 rounded px-2 py-2 text-white text-xs" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">RAM Req / Lim (GiB)</label>
              <div className="flex gap-2">
                <input type="number" step="0.5" name="ramRequest" value={nuevoComp.ramRequest} onChange={handleFormChange} className="w-1/2 bg-slate-900 border border-slate-600 rounded px-2 py-2 text-white text-xs" />
                <input type="number" step="0.5" name="ramLimit" value={nuevoComp.ramLimit} onChange={handleFormChange} className="w-1/2 bg-slate-900 border border-slate-600 rounded px-2 py-2 text-white text-xs" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Almacenamiento</label>
              <select 
                name="tipoStorage" 
                value={nuevoComp.tipoStorage} 
                onChange={handleFormChange} 
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
              >
                <option value="none">Sin Estado (None)</option>
                <option value="rwo">ReadWriteOnce (RWO)</option>
                <option value="rwx">ReadWriteMany (RWX)</option>
              </select>
            </div>
          </div>

          {/* PANEL RELACIONAL DE CONEXIÓN */}
          {componentes.length > 0 && (
            <div className="bg-slate-900/50 p-3 rounded border border-slate-700 mt-2">
              <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
                🔗 Flujo de Conexión (Este componente envía tráfico a:)
              </label>
              <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                {componentes.map(c => (
                  <label key={c.id} className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/60 p-1.5 rounded border border-slate-800 cursor-pointer hover:border-slate-700">
                    <input 
                      type="checkbox" 
                      checked={nuevoComp.conexiones.includes(c.id)}
                      onChange={() => handleToggleConexion(c.id)}
                      className="rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-0"
                    />
                    <span>Enrutar a <strong className="text-blue-400">{c.nombre}</strong> <span className="text-[10px] opacity-60">({c.tipo})</span></span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2">
            <button 
              type="button" 
              onClick={agregarComponente} 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition-colors text-sm"
            >
              ➕ Añadir Componente
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};