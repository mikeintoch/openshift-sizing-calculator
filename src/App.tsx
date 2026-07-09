// src/App.tsx
import React, { useState, useMemo } from 'react';
import { validarTopologia, type ComponenteSizing, type TipoComponente } from './sizingEngine';
import { CreateMLCEngine, type InitProgressReport } from "@mlc-ai/web-llm"; 

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
  }>({
    nombre: '',
    tipo: 'microservicio',
    stack: 'java',
    cpuRequest: 1,
    cpuLimit: 2,
    ramRequest: 4,
    ramLimit: 8,
    replicas: 2,
    tipoStorage: 'none'
  });

  const [contextoTexto, setContextoTexto] = useState('');
  const [analisisLLM, setAnalisisLLM] = useState('');
  const [progresoCarga, setProgresoCarga] = useState('');
  const [cargandoLLM, setCargandoLLM] = useState(false);

  const reporte = useMemo(() => {
    return validarTopologia({ ambiente, componentes });
  }, [ambiente, componentes]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumber = ['cpuRequest', 'cpuLimit', 'ramRequest', 'ramLimit', 'replicas'].includes(name);
    
    setNuevoComp(prev => {
      const actualizacion: any = {
        ...prev,
        [name]: isNumber ? parseFloat(value) || 0 : value
      };

      if (name === 'tipo') {
        if (value === 'microservicio') {
          actualizacion.stack = 'java';
          actualizacion.tipoStorage = 'none';
        } else if (value === 'database') {
          actualizacion.stack = 'postgresql';
          actualizacion.tipoStorage = 'rwo'; 
        } else if (value === 'cache') {
          actualizacion.stack = 'redis';
          actualizacion.tipoStorage = 'none';
        } else if (value === 'frontend') {
          actualizacion.stack = 'nginx';
          actualizacion.tipoStorage = 'none';
        }
      }
      return actualizacion;
    });
  };

  const agregarComponente = () => {
    if (!nuevoComp.nombre.trim()) return;
    const compConId: ComponenteSizing = {
      ...nuevoComp,
      id: crypto.randomUUID()
    };
    setComponentes(prev => [...prev, compConId]);
    setNuevoComp(prev => ({ ...prev, nombre: '' }));
  };

  const eliminarComponente = (id: string) => {
    setComponentes(prev => prev.filter(c => c.id !== id));
  };

  const ejecutarAnalisisIA = async () => {
    if (!contextoTexto.trim() || componentes.length === 0) return;
    setCargandoLLM(true);
    setAnalisisLLM('');
    
    try {
      const selectedModel = "Phi-3-mini-4k-instruct-q4f16_1-MLC"; 
      const engine = await CreateMLCEngine(selectedModel, {
        initProgressCallback: (report: InitProgressReport) => {
          setProgresoCarga(`Progreso: ${report.text}`);
        }
      });

      setProgresoCarga('Modelo cargado exitosamente en WebGPU.');

      const topologiaResumida = componentes.map(c => ({
        componente: c.nombre,
        tipo: c.tipo,
        stack: c.stack,
        recursos: `${c.cpuRequest} CPU, ${c.ramRequest} GiB RAM`,
        replicas: c.replicas,
        storage: c.tipoStorage
      }));

      const prompt = `<|system|>
Actúa como un Arquitecto de Infraestructura OpenShift Senior. Tu tarea es auditar si la topología propuesta tiene sentido técnico con la descripción de su negocio.
<|user|>
CONTEXTO DEL NEGOCIO: "${contextoTexto}"
AMBIENTE: ${ambiente.toUpperCase()}
TOPOLOGÍA DE COMPONENTES:
${JSON.stringify(topologiaResumida, null, 2)}

Analiza la coherencia total. Responde brevemente con un dictamen directo y 3 recomendaciones de infraestructura específicas.
<|assistant|>`;
      
      const respuesta = await engine.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 250
      });
      
      setAnalisisLLM(respuesta.choices[0].message.content || "Sin respuesta.");
    } catch (error) {
      console.error(error);
      setAnalisisLLM(`Error en WebGPU: ${error}`);
    } finally {
      setCargandoLLM(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
      <header className="max-w-6xl mx-auto mb-8 pb-4 border-b border-slate-800">
        <h1 className="text-3xl font-extrabold text-blue-400">OpenShift Sizing Calculator 🚀</h1>
        <p className="text-slate-400 mt-1">Plataforma de Diseño y Dimensionamiento de Topologías Corporativas</p>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* COLUMNA IZQUIERDA */}
        <div className="space-y-6">
          <section className="bg-slate-800 p-6 rounded-xl shadow-xl border border-slate-700">
            <h2 className="text-xl font-bold mb-4 text-white">1. Definir Ambiente Global</h2>
            <label className="block text-sm font-medium text-slate-300 mb-1">Ambiente de Despliegue</label>
            <select value={ambiente} onChange={(e) => setAmbiente(e.target.value as any)} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white">
              <option value="prod">Producción (Prod) - Reglas estrictas de HA</option>
              <option value="non-prod">Desarrollo / QA (Non-Prod)</option>
            </select>
          </section>

          <section className="bg-slate-800 p-6 rounded-xl shadow-xl border border-slate-700">
            <h2 className="text-xl font-bold mb-4 text-white">2. Agregar Componente a la App</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Nombre</label>
                  <input type="text" name="nombre" value={nuevoComp.nombre} onChange={handleFormChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none" placeholder="ej: postgres-db" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Tipo de Componente</label>
                  <select name="tipo" value={nuevoComp.tipo} onChange={handleFormChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white">
                    <option value="microservicio">Microservicio (API / Backend)</option>
                    <option value="database">Base de Datos (SQL / NoSQL)</option>
                    <option value="cache">Caché en Memoria (Redis / Memcached)</option>
                    <option value="frontend">Frontend Estático (Nginx / SPA)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Tecnología / Motor</label>
                  <select name="stack" value={nuevoComp.stack} onChange={handleFormChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white">
                    {nuevoComp.tipo === 'microservicio' && (
                      <>
                        <option value="java">Java Spring Boot</option>
                        <option value="quarkus">Quarkus (Native/JVM)</option>
                        <option value="node">Node.js (Express/Nest)</option>
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
                  <input type="number" name="replicas" value={nuevoComp.replicas} onChange={handleFormChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">CPU Request / Limit</label>
                  <div className="flex gap-2">
                    <input type="number" step="0.1" name="cpuRequest" value={nuevoComp.cpuRequest} onChange={handleFormChange} className="w-1/2 bg-slate-900 border border-slate-600 rounded px-2 py-2 text-white text-xs" placeholder="Req" />
                    <input type="number" step="0.1" name="cpuLimit" value={nuevoComp.cpuLimit} onChange={handleFormChange} className="w-1/2 bg-slate-900 border border-slate-600 rounded px-2 py-2 text-white text-xs" placeholder="Lim" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">RAM Request / Limit (GiB)</label>
                  <div className="flex gap-2">
                    <input type="number" step="0.5" name="ramRequest" value={nuevoComp.ramRequest} onChange={handleFormChange} className="w-1/2 bg-slate-900 border border-slate-600 rounded px-2 py-2 text-white text-xs" placeholder="Req" />
                    <input type="number" step="0.5" name="ramLimit" value={nuevoComp.ramLimit} onChange={handleFormChange} className="w-1/2 bg-slate-900 border border-slate-600 rounded px-2 py-2 text-white text-xs" placeholder="Lim" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Almacenamiento (Volume)</label>
                  <select name="tipoStorage" value={nuevoComp.tipoStorage} onChange={handleFormChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white">
                    <option value="none">Sin Estado (None)</option>
                    <option value="rwo">ReadWriteOnce (RWO)</option>
                    <option value="rwx">ReadWriteMany (RWX)</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button type="button" onClick={agregarComponente} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition-colors">
                    ➕ Añadir Componente
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-slate-800 p-6 rounded-xl shadow-xl border border-slate-700">
            <h2 className="text-xl font-bold mb-3 text-white">Componentes en la Arquitectura ({componentes.length})</h2>
            {componentes.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No has agregado componentes aún. Usa el formulario de arriba.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {componentes.map(c => (
                  <div key={c.id} className="flex justify-between items-center p-3 bg-slate-900/60 border border-slate-700 rounded-lg">
                    <div>
                      <span className="font-bold text-blue-400 text-sm">{c.nombre}</span>
                      <span className="text-xs bg-slate-800 px-2 py-0.5 rounded ml-2 border border-slate-600 capitalize text-slate-300">{c.stack}</span>
                      <div className="text-xs text-slate-400 mt-1">
                        Pods: {c.replicas} | CPU: {c.cpuRequest}vCPU | RAM: {c.ramRequest}GiB | Storage: {c.tipoStorage.toUpperCase()}
                      </div>
                    </div>
                    <button onClick={() => eliminarComponente(c.id)} className="text-rose-400 hover:text-rose-300 text-xs font-semibold px-2 py-1 bg-rose-500/10 rounded border border-rose-500/20">
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* COLUMNA DERECHA */}
        <div className="space-y-6">
          <div className={`p-4 rounded-xl border flex items-center justify-between ${reporte.estaAprobado ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400' : 'bg-rose-950/40 border-rose-500/50 text-rose-400'}`}>
            <div>
              <span className="text-xs uppercase font-bold tracking-wider opacity-75">Dictamen de Topología</span>
              <h3 className="text-2xl font-black">{reporte.estaAprobado ? 'TOPOLOGÍA VÁLIDA' : 'REQUIERE CORRECCIÓN'}</h3>
            </div>
            <div className={`text-3xl font-bold px-4 py-2 rounded-lg ${reporte.estaAprobado ? 'bg-emerald-500 text-slate-900' : 'bg-rose-500 text-slate-900'}`}>
              {reporte.estaAprobado ? 'PASS' : 'HOLD'}
            </div>
          </div>

          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-slate-900/50 rounded-lg">
              <span className="text-sm text-slate-400 block">Total CPU Acumulada</span>
              <span className="text-2xl font-extrabold text-blue-400">{reporte.totalesCluster.cpuTotalRequest.toFixed(2)} Cores</span>
            </div>
            <div className="text-center p-3 bg-slate-900/50 rounded-lg">
              <span className="text-sm text-slate-400 block">Total RAM Acumulada</span>
              <span className="text-2xl font-extrabold text-blue-400">{reporte.totalesCluster.ramTotalRequest.toFixed(2)} GiB</span>
            </div>
          </div>

          {/* RECOMENDACIÓN DE NODOS TRADUCIDA PARA EL ARQUITECTO */}
          {componentes.length > 0 && (
            <section className="bg-slate-800 p-5 rounded-xl border border-blue-500/20 shadow-xl">
              <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-3">🎛️ Infraestructura de Nodos Recomendada</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-lg border border-slate-700">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Perfil del Nodo</span>
                  <span className="text-base font-bold text-white">{reporte.nodosSugeridos.perfilNodoSugerido}</span>
                </div>
                <div className="md:border-l md:pl-4 border-slate-700">
                  <span className="text-xs text-slate-400 block font-medium">Nodos Workers Requeridos</span>
                  <span className="text-xl font-extrabold text-emerald-400">{reporte.nodosSugeridos.cantidadNodosRecomendados} Workers</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3 leading-relaxed bg-slate-900/30 p-2 rounded border border-slate-800 italic">{reporte.nodosSugeridos.explicacionHA}</p>
            </section>
          )}

          <section className="bg-slate-800 p-6 rounded-xl shadow-xl border border-slate-700">
            <h2 className="text-xl font-bold mb-2 text-white">3. Contexto de Negocio (IA)</h2>
            <textarea value={contextoTexto} onChange={(e) => setContextoTexto(e.target.value)} placeholder="Describe qué hará toda la aplicación para auditar la coherencia..." className="w-full bg-slate-900 border border-slate-600 rounded p-3 h-24 text-white text-sm focus:outline-none" />
            <button onClick={ejecutarAnalisisIA} disabled={cargandoLLM || !contextoTexto.trim() || componentes.length === 0} className="mt-3 w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-2 px-4 rounded text-sm">
              {cargandoLLM ? 'Procesando con WebGPU...' : 'Auditar Topología Completa con IA'}
            </button>
            {progresoCarga && <p className="text-xs text-slate-400 mt-2 italic text-center">{progresoCarga}</p>}
          </section>

          {analisisLLM && (
            <div className="bg-gradient-to-br from-indigo-950/50 to-slate-800 p-5 rounded-xl border border-indigo-500/30">
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-2">🤖 Dictamen de Arquitectura (IA WebGPU)</h3>
              <p className="text-sm text-slate-300 leading-relaxed italic bg-slate-900/40 p-3 rounded border border-slate-700/50">"{analisisLLM}"</p>
            </div>
          )}

          <div className="bg-slate-800 p-6 rounded-xl shadow-xl border border-slate-700">
            <h2 className="text-xl font-bold mb-4 text-white">Resultado de Batería de Reglas</h2>
            <div className="space-y-4">
              {reporte.pruebas.map((test, index) => {
                const badgeColors = {
                  VERDE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                  AMARILLO: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                  ROJO: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
                }[test.status];

                return (
                  <div key={index} className="p-3 rounded-lg border bg-slate-900/40 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-white">{test.nombreTest}</span>
                      <span className={`text-xs px-2 py-0.5 rounded border font-mono font-bold ${badgeColors}`}>{test.status}</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{test.mensaje}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}