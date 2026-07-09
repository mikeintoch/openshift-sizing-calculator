// src/App.tsx
import React, { useState, useMemo } from 'react';
import { validarSizing, type ReqSizing } from './sizingEngine';
// src/App.tsx (IMPORTACIÓN ACTUALIZADA)
import { CreateMLCEngine, type InitProgressReport } from "@mlc-ai/web-llm";

export default function App() {
  const [formData, setFormData] = useState<ReqSizing>({
    sistemaNombre: 'Microservicio Transaccional',
    stack: 'java',
    ambiente: 'prod',
    cpuRequest: 1,
    cpuLimit: 2,
    ramRequest: 4,
    ramLimit: 8,
    replicas: 2,
    tipoStorage: 'none'
  });

  // --- ESTADOS PARA EL LLM (WebLLM/WebGPU) ---
  const [contextoTexto, setContextoTexto] = useState('');
  const [analisisLLM, setAnalisisLLM] = useState('');
  const [progresoCarga, setProgresoCarga] = useState(''); // Estado para el porcentaje de descarga
  const [cargandoLLM, setCargandoLLM] = useState(false);

  const reporte = useMemo(() => {
    return validarSizing(formData);
  }, [formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const isNumber = ['cpuRequest', 'cpuLimit', 'ramRequest', 'ramLimit', 'replicas'].includes(name);
    
    setFormData(prev => ({
      ...prev,
      [name]: isNumber ? parseFloat(value) || 0 : value
    }));
  };

// --- FUNCIÓN PRINCIPAL DEL LLM LOCAL (COMPATIBLE CON VITE) ---
  const ejecutarAnalisisIA = async () => {
    if (!contextoTexto.trim()) return;
    setCargandoLLM(true);
    setAnalisisLLM('');
    
    try {
      // 1. Seleccionar el modelo optimizado para WebGPU
      const selectedModel = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
      
      console.log("Inicializando motor MLCEngine nativo...");

      // 2. Crear el motor sin instanciar el Worker manualmente.
      // La función CreateMLCEngine se encarga del empaquetado compatible con Vite por sí sola.
      const engine = await CreateMLCEngine(
        selectedModel,
        {
          initProgressCallback: (report: InitProgressReport) => {
            setProgresoCarga(`Progreso: ${report.text}`);
          }
        }
      );

      setProgresoCarga('Modelo cargado exitosamente en WebGPU.');

      // 3. Generar la Auditoría
      console.log("Ejecutando prompt en WebGPU...");
      const prompt = `Actúa como arquitecto de infraestructura OpenShift experto. El desarrollador dice: "${contextoTexto}". Su configuración pide: Stack ${formData.stack}, CPU ${formData.cpuRequest} Cores y RAM ${formData.ramRequest} GiB. ¿Es adecuada esta configuración? Responde brevemente con recomendaciones técnicas puntuales y riesgos de infraestructura.`;
      
      const respuesta = await engine.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      });
      
      const textoFinal = respuesta.choices[0].message.content || "No se generó respuesta.";
      
      setAnalisisLLM(textoFinal);
      console.log("Análisis de IA WebGPU completado.");

    } catch (error) {
      console.error("Error crítico en LLM local (WebGPU):", error);
      setAnalisisLLM(`Error al ejecutar el modelo local vía WebGPU. Asegúrate de usar Chrome/Edge actualizados y compatibles. Detalles: ${error}`);
      setProgresoCarga('');
    } finally {
      setCargandoLLM(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
      <header className="max-w-6xl mx-auto mb-8 pb-4 border-b border-slate-800">
        <h1 className="text-3xl font-extrabold text-blue-400">OpenShift Sizing Validator 🚀</h1>
        <p className="text-slate-400 mt-1">Validador inteligente con IA integrada 100% en el cliente vía WebGPU</p>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* COLUMNA IZQUIERDA: Formulario */}
        <div className="space-y-6">
          <section className="bg-slate-800 p-6 rounded-xl shadow-xl border border-slate-700">
            <h2 className="text-xl font-bold mb-4 text-white">Pedimento de Infraestructura (Dev)</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nombre del Sistema</label>
                <input type="text" name="sistemaNombre" value={formData.sistemaNombre} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Tecnología Stack</label>
                  <select name="stack" value={formData.stack} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500">
                    <option value="java">Java Spring Boot</option>
                    <option value="quarkus">Quarkus</option>
                    <option value="node">Node.js</option>
                    <option value="python">Python FastAPI</option>
                    <option value="go">Go Lang</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Ambiente</label>
                  <select name="ambiente" value={formData.ambiente} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500">
                    <option value="prod">Producción (Prod)</option>
                    <option value="non-prod">Desarrollo / QA (Non-Prod)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">CPU Request (Cores)</label>
                  <input type="number" step="0.1" name="cpuRequest" value={formData.cpuRequest} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">CPU Limit (Cores)</label>
                  <input type="number" step="0.1" name="cpuLimit" value={formData.cpuLimit} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">RAM Request (GiB)</label>
                  <input type="number" step="0.5" name="ramRequest" value={formData.ramRequest} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">RAM Limit (GiB)</label>
                  <input type="number" step="0.5" name="ramLimit" value={formData.ramLimit} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Réplicas (Pods)</label>
                  <input type="number" name="replicas" value={formData.replicas} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Tipo Volúmen (Storage)</label>
                  <select name="tipoStorage" value={formData.tipoStorage} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500">
                    <option value="none">Sin Estado (Epímero/None)</option>
                    <option value="rwo">ReadWriteOnce (RWO)</option>
                    <option value="rwx">ReadWriteMany (RWX)</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Contexto de la Aplicación (IA) */}
          <section className="bg-slate-800 p-6 rounded-xl shadow-xl border border-slate-700">
            <h2 className="text-xl font-bold mb-2 text-white">Contexto de la Aplicación (IA)</h2>
            <p className="text-xs text-slate-400 mb-3">Describe qué hará el sistema para que el LLM local valide la coherencia de los recursos.</p>
            <textarea
              value={contextoTexto}
              onChange={(e) => setContextoTexto(e.target.value)}
              placeholder="Ej: Es un servicio crítico que procesará archivos pesados e imágenes de usuarios. Estimamos un tráfico de 100 usuarios concurrentes..."
              className="w-full bg-slate-900 border border-slate-600 rounded p-3 h-28 text-white focus:outline-none focus:border-blue-500 text-sm"
            />
            <button
              onClick={ejecutarAnalisisIA}
              disabled={cargandoLLM || !contextoTexto.trim()}
              className="mt-3 w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-2 px-4 rounded transition-colors text-sm"
            >
              {cargandoLLM ? 'Procesando con LLM Local WebGPU...' : 'Ejecutar Auditoría con IA'}
            </button>
            {progresoCarga && (
              <p className="text-xs text-slate-400 mt-2 italic text-center">{progresoCarga}</p>
            )}
          </section>
        </div>

        {/* COLUMNA DERECHA: Reporte */}
        <div className="space-y-6">
          <div className={`p-4 rounded-xl border flex items-center justify-between ${reporte.estaAprobado ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400' : 'bg-rose-950/40 border-rose-500/50 text-rose-400'}`}>
            <div>
              <span className="text-xs uppercase font-bold tracking-wider opacity-75">Dictamen de Infraestructura</span>
              <h3 className="text-2xl font-black">{reporte.estaAprobado ? 'PEDIMENTO VALIDADO' : 'REQUIERE REVISIÓN'}</h3>
            </div>
            <div className={`text-3xl font-bold px-4 py-2 rounded-lg ${reporte.estaAprobado ? 'bg-emerald-500 text-slate-900' : 'bg-rose-500 text-slate-900'}`}>
              {reporte.estaAprobado ? 'PASS' : 'HOLD'}
            </div>
          </div>

          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-slate-900/50 rounded-lg">
              <span className="text-sm text-slate-400 block">Total CPU Solicitada</span>
              <span className="text-2xl font-extrabold text-blue-400">{reporte.totalesCluster.cpuTotalRequest.toFixed(2)} Cores</span>
            </div>
            <div className="text-center p-3 bg-slate-900/50 rounded-lg">
              <span className="text-sm text-slate-400 block">Total RAM Solicitada</span>
              <span className="text-2xl font-extrabold text-blue-400">{reporte.totalesCluster.ramTotalRequest.toFixed(2)} GiB</span>
            </div>
          </div>

          {/* Caja de Dictamen del LLM (WebGPU) */}
          {analisisLLM && (
            <div className="bg-gradient-to-br from-indigo-950/50 to-slate-800 p-5 rounded-xl border border-indigo-500/30">
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-2">🤖 Dictamen Técnico de la IA (WebGPU)</h3>
              <p className="text-sm text-slate-300 leading-relaxed italic bg-slate-900/40 p-3 rounded border border-slate-700/50">
                "{analisisLLM}"
              </p>
            </div>
          )}

          <div className="bg-slate-800 p-6 rounded-xl shadow-xl border border-slate-700">
            <h2 className="text-xl font-bold mb-4 text-white">Resultado de Batería Estática</h2>
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
                      <span className={`text-xs px-2 py-0.5 rounded border font-mono font-bold ${badgeColors}`}>
                        {test.status}
                      </span>
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