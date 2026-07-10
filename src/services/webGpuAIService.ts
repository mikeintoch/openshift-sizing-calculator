// src/services/webGpuAIService.ts
import { CreateMLCEngine, type InitProgressReport } from "@mlc-ai/web-llm";
import { type ComponenteSizing } from "../core/sizingEngine"; // Ajustamos la ruta asumiendo que sizingEngine irá a core/

// Definimos la interfaz del tipado de salida para mantener el contrato de datos
export interface FilaAuditoria {
  prioridad: 'URGENTE' | 'MEDIA' | 'BAJA';
  componente: string;
  riesgo: string;
  recomendacion: string;
}

// Clase Singleton para asegurar que la GPU mantenga una única instancia en caché caliente
class WebGpuAIService {
  private engine: any = null;
  private readonly modelName = "Phi-3-mini-4k-instruct-q4f16_1-MLC";

  /**
   * Inicializa el motor de WebGPU si no ha sido creado previamente.
   */
  async inicializarMotor(onProgress: (progressText: string) => void): Promise<void> {
    if (this.engine) {
      onProgress('Reutilizando instancia de IA caliente en WebGPU (Análisis inmediato)...');
      return;
    }

    onProgress('Inicializando WebGPU y montando modelo por primera vez...');
    this.engine = await CreateMLCEngine(this.modelName, {
      initProgressCallback: (report: InitProgressReport) => {
        onProgress(`Progreso de Carga: ${report.text}`);
      }
    });
    onProgress('Modelo cargado exitosamente en WebGPU y guardado en caché.');
  }

  /**
   * Ejecuta la auditoría enviando la topología al modelo y retorna el JSON sanitizado.
   */
  async auditarTopologia(contextoTexto: string, ambiente: string, componentes: ComponenteSizing[]): Promise<FilaAuditoria[]> {
    if (!this.engine) {
      throw new Error("El motor de IA no ha sido inicializado. Llama primero a inicializarMotor().");
    }

    // Mapeo limpio de la topología estructurada para el prompt
    const topologiaResumida = componentes.map(c => ({
      componente: c.nombre,
      tipo: c.tipo,
      stack: c.stack,
      recursos: `${c.cpuRequest} CPU, ${c.ramRequest} GiB RAM`,
      replicas: c.replicas,
      storage: c.tipoStorage,
      seConectaCon: c.conexiones.map(id => componentes.find(x => x.id === id)?.nombre || "Desconocido")
    }));

    const prompt = `<|system|>
Actúa como un Líder de Arquitectura de Infraestructura OpenShift Senior.
REGLA DE FORMATO INNEGOCIABLE: Debes responder EXCLUSIVAMENTE con un arreglo de objetos JSON válido. No incluyas explicaciones, marcas de markdown (\`\`\`json), saludos ni conclusiones. Tu respuesta debe ser directamente parseable por un programa.

Estructura requerida del JSON:
[
  {
    "prioridad": "URGENTE", // Solo usar: "URGENTE", "MEDIA" o "BAJA"
    "componente": "nombre_del_componente",
    "riesgo": "descripción concisa del hallazgo técnico encontrado en las conexiones o recursos",
    "recomendacion": "la acción técnica exacta a tomar en OpenShift"
  }
]

Ordena el arreglo poniendo primero los elementos "URGENTE", luego "MEDIA" y finalmente "BAJA".
<|user|>
CONTEXTO DEL NEGOCIO: "${contextoTexto}"
AMBIENTE de DESPLIEGUE: ${ambiente.toUpperCase()}
TOPOLOGÍA CON RELACIONES DE RED:
${JSON.stringify(topologiaResumida, null, 2)}

Genera el JSON de auditoría estructurado.
<|assistant|>`;

    const respuesta = await this.engine.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 500
    });

    const rawText = respuesta.choices[0].message.content || "[]";
    console.log("Salida cruda de la GPU (Service):", rawText);

    // Pipeline de autoreparación de sintaxis integrado en el servicio
    const inicioArreglo = rawText.indexOf('[');
    const finArreglo = rawText.lastIndexOf(']');
    let jsonLimpio = "[]";

    if (inicioArreglo !== -1 && finArreglo !== -1) {
      jsonLimpio = rawText.substring(inicioArreglo, finArreglo + 1);
    } else {
      jsonLimpio = rawText.replace(/```json|```/g, "").trim();
    }

    jsonLimpio = jsonLimpio.replace(/,\s*}/g, "}").replace(/,\s*\]/g, "]");
    
    return JSON.parse(jsonLimpio) as FilaAuditoria[];
  }
}

// Exportamos una única instancia de la clase (Patrón Singleton puro)
export const aiService = new WebGpuAIService();