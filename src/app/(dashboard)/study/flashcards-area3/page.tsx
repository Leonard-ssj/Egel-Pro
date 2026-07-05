'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, RotateCcw, Eye } from 'lucide-react'
import { GlassCard } from '@/components/ui/glass-card'

type Card = { prompt: string; answer: string }

const CARDS: Card[] = [
  { prompt: 'Tipado estatico vs dinamico: ¿cual detecta errores de tipo en compilacion y cual en ejecucion?', answer: 'Estatico (Java, TypeScript, C#) verifica en COMPILACION. Dinamico (Python, JavaScript, Ruby) resuelve el tipo en EJECUCION. Es independiente de fuerte/debil.' },
  { prompt: 'Tipado fuerte vs debil: ¿que hace \'5\' + 3 en JavaScript y por que?', answer: 'Da "53" (concatenacion), porque JavaScript es de tipado DEBIL: hace coerciones implicitas entre tipos sin lanzar error. Python (fuerte) lanzaria TypeError.' },
  { prompt: '¿Que lenguaje usar para firmware de un microcontrolador de 2KB de RAM sin sistema operativo?', answer: 'C: compila a binario compacto, sin runtime ni recolector de basura, con control directo de memoria y registros de hardware.' },
  { prompt: '¿Que lenguaje esta disenado para programacion logica basada en hechos y reglas (sistemas expertos)?', answer: 'Prolog: se declaran hechos y reglas, y el motor deduce conclusiones por unificacion y backtracking, sin programar el flujo paso a paso.' },
  { prompt: '¿Cuales son los cuatro pilares de la Programacion Orientada a Objetos?', answer: 'Encapsulamiento (ocultar estado interno), Herencia (reutilizar de una clase padre), Polimorfismo (una llamada, distintos comportamientos), Abstraccion (exponer lo esencial, ocultar complejidad).' },
  { prompt: '¿Que diferencia a la programacion funcional de simplemente "usar funciones"?', answer: 'Funcional exige pureza (misma entrada = misma salida, sin efectos secundarios), inmutabilidad (no mutar datos externos) y funciones de orden superior (map/filter/reduce). Usar funciones no basta por si solo.' },
  { prompt: 'Convierte a notacion polaca inversa (RPN): (3 + 4) * (5 - 2)', answer: '3 4 + 5 2 - *  →  el operador va DESPUES de sus dos operandos, respetando la jerarquia de los parentesis.' },
  { prompt: 'Pila (stack) vs Cola (queue): ¿cual usarias para la funcion "deshacer" (Ctrl+Z) y cual para una fila de atencion al cliente?', answer: 'Deshacer = PILA (LIFO): la ultima accion es la primera en revertirse. Fila de atencion = COLA (FIFO): el primero en llegar es el primero en atenderse.' },
  { prompt: 'Recursividad: ¿que pasa si una funcion recursiva no tiene caso base?', answer: 'Se agota la pila de llamadas (stack overflow): cada llamada recursiva consume un marco de pila y nunca se detiene sin una condicion de paro explicita.' },
  { prompt: '¿Arbol o grafo? Sistema de carpetas (una carpeta padre, varias subcarpetas, sin ciclos)', answer: 'ARBOL: jerarquia estricta con un padre y multiples hijos, sin ciclos. Un GRAFO (como una red social) no tiene jerarquia fija y puede tener ciclos.' },
  { prompt: '¿Que algoritmo de busqueda requiere que el arreglo este ordenado y por que es mas rapido que la busqueda lineal?', answer: 'Busqueda binaria: descarta la mitad del espacio de busqueda en cada paso (O(log n)) comparando contra el elemento central, en vez de revisar uno por uno (O(n)).' },
  { prompt: '¿Cual IDE es el oficial de Google para Android y cual el de Apple para iOS?', answer: 'Android Studio (Android, Kotlin/Java, con emuladores y Gradle). Xcode (iOS/macOS, Swift/Objective-C) — Xcode solo corre en macOS.' },
  { prompt: 'Git: ¿que comando aplica UN commit especifico de otra rama sin traer el resto de su historial?', answer: 'git cherry-pick <hash> — a diferencia de merge/rebase que traen todo el historial desde el punto de divergencia.' },
  { prompt: 'Git: ¿cual es la diferencia entre git fetch y git pull?', answer: 'git fetch descarga los cambios remotos SIN fusionarlos (para revisarlos antes). git pull = fetch + merge automatico en un solo paso.' },
  { prompt: 'Pruebas: ¿que diferencia a la caja blanca de la caja negra?', answer: 'Caja BLANCA: se disena con conocimiento del codigo interno (cubrir ramas y rutas). Caja NEGRA: se disena solo con la especificacion (entradas/salidas esperadas), sin ver el codigo.' },
  { prompt: '¿Que herramienta usarias para probar carga/estres de un servidor con miles de usuarios concurrentes?', answer: 'JMeter — simula trafico masivo y mide tiempos de respuesta bajo estres, distinto de JUnit (pruebas unitarias de codigo aislado).' },
  { prompt: 'SQL: ¿cual es la diferencia entre DDL y DML?', answer: 'DDL (CREATE, ALTER, DROP) define la ESTRUCTURA de la base de datos. DML (INSERT, UPDATE, DELETE, SELECT) manipula los DATOS de tablas ya existentes.' },
  { prompt: 'SQL: ¿por que WHERE no puede filtrar sobre COUNT(*) y que clausula si puede?', answer: 'WHERE filtra FILAS antes de agrupar, no puede usar funciones de agregacion. HAVING filtra DESPUES del GROUP BY, sobre los resultados ya agregados.' },
  { prompt: 'NoSQL: ¿que tipo usarias para un carrito de compras que solo se accede por id de sesion, con latencia minima?', answer: 'Clave-valor (Redis) — acceso directo por llave, sin relaciones ni consultas complejas, ideal para cache y sesiones.' },
  { prompt: 'NoSQL: ¿que tipo usarias para recomendaciones que navegan "amigos de mis amigos" con varios niveles de profundidad?', answer: 'Grafos (Neo4j) — modela nodos y relaciones nativamente, recorre conexiones de profundidad variable sin JOINs costosos que se degradan con cada nivel.' },
  { prompt: 'Fragmentacion horizontal vs vertical: ¿cual divide por FILAS y cual por COLUMNAS?', answer: 'Horizontal = divide por FILAS (ej. por rango de fecha), cada fragmento conserva todas las columnas. Vertical = divide por COLUMNAS relacionadas, unidas por la misma llave.' },
  { prompt: '¿Que diferencia a OLTP de OLAP?', answer: 'OLTP: muchas transacciones pequenas y rapidas (depositos, ventas). OLAP: pocas consultas grandes y complejas sobre datos historicos (reportes gerenciales).' },
  { prompt: '¿Que diferencia a PaaS de SaaS de IaaS?', answer: 'IaaS: administras SO y arriba (solo infraestructura virtualizada). PaaS: solo subes tu codigo, el proveedor administra SO/runtime. SaaS: consumes una app completa lista para usar, sin administrar nada.' },
  { prompt: '¿Que framework movil elegirias si tu equipo ya domina C#/.NET y quiere reutilizar ese conocimiento?', answer: 'Xamarin (o .NET MAUI) — permite apps moviles multiplataforma en C#, aprovechando el ecosistema .NET existente del equipo.' },
  { prompt: '¿Cual es la diferencia clave entre REST y SOAP?', answer: 'REST: estilo ligero sobre HTTP, usa JSON, sin contrato formal obligatorio. SOAP: protocolo con contrato formal WSDL, mensajes XML estrictos, estandares maduros para transacciones distribuidas complejas.' },
  { prompt: 'Nube publica, privada e hibrida: ¿cual usarias para datos regulados que exigen hardware exclusivo?', answer: 'Nube PRIVADA (infraestructura dedicada, sin compartir hardware). La HIBRIDA combina privada para lo sensible + publica para lo que no lo es.' },
  { prompt: 'Escalabilidad horizontal vs vertical: ¿cual es mejor para picos de trafico impredecibles en la nube?', answer: 'Horizontal (agregar/quitar instancias con autoescalado) — se paga solo por lo que se usa. Vertical (mas CPU/memoria a un solo servidor) tiene limite fisico y suele requerir downtime.' },
]

export default function FlashcardsArea3Page() {
  const [i, setI] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const card = CARDS[i]!

  function go(delta: number) {
    setRevealed(false)
    setI((prev) => (prev + delta + CARDS.length) % CARDS.length)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/study" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-aurora-2">
        <ChevronLeft className="h-3 w-3" /> Material de estudio
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">Flashcards — Area 3: Desarrollo de Sistemas de Software</h1>
        <p className="text-sm text-muted-foreground">
          Lenguajes, paradigmas y estructuras de datos, entornos/Git/pruebas, gestion de datos y plataformas. Lee la pregunta, respondete mentalmente y revela.
        </p>
      </header>

      <GlassCard variant="elevated" padding="lg" className="space-y-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Tarjeta {i + 1} de {CARDS.length}</span>
        </div>

        <p className="text-base font-semibold">{card.prompt}</p>

        {revealed ? (
          <div className="rounded-xl border border-success/40 bg-success/10 p-4 text-sm leading-relaxed">
            {card.answer}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-aurora-2/50 bg-aurora-2/15 px-4 py-2 text-sm font-semibold text-aurora-2 transition-colors hover:bg-aurora-2/25"
          >
            <Eye className="h-4 w-4" /> Mostrar respuesta
          </button>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => go(-1)}
            className="inline-flex items-center gap-1 rounded-xl border border-glass-border/40 bg-glass-bg/40 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </button>
          <button
            type="button"
            onClick={() => { setI(0); setRevealed(false) }}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="inline-flex items-center gap-1 rounded-xl border border-aurora-2/50 bg-aurora-2/15 px-4 py-2 text-sm font-semibold text-aurora-2 transition-colors hover:bg-aurora-2/25"
          >
            Siguiente <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </GlassCard>
    </div>
  )
}
