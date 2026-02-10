import React from "react";
import TopBar from "../components/TopBar";
import { Helmet } from "react-helmet-async";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>Política de privacidad | ImGo</title>
      </Helmet>
      <TopBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">Política de privacidad y tratamiento de datos</h1>
        <p className="mt-2 text-slate-700">
          ImGo es un comparador de instituciones y programas. <span className="font-semibold">ImGo no es una institución educativa</span>
          . Cuando envías un formulario de contacto (lead), autorizas el tratamiento de tus datos para que la institución pueda
          responder.
        </p>

        <section className="mt-6 space-y-3">
          <h2 className="text-lg font-semibold">1. Datos que recolectamos</h2>
          <ul className="list-disc pl-6 text-slate-700 space-y-1">
            <li>Datos de contacto: email (obligatorio), nombre y teléfono (opcionales).</li>
            <li>Preferencias: institución y/o programa consultado, y el mensaje que escribas.</li>
            <li>Analítica de uso (demo): páginas visitadas y eventos básicos para medir tracción y embudo.</li>
          </ul>

          <h2 className="text-lg font-semibold">2. Finalidad</h2>
          <ul className="list-disc pl-6 text-slate-700 space-y-1">
            <li>Conectarte con la institución para brindarte información, costos y requisitos.</li>
            <li>Medir tracción, retención y conversión del producto (analítica agregada).</li>
            <li>Mejorar filtros, comparaciones y relevancia del contenido.</li>
          </ul>

          <h2 className="text-lg font-semibold">3. Base legal y autorización</h2>
          <p className="text-slate-700">
            El tratamiento se realiza con tu autorización expresa al marcar la casilla de consentimiento en el formulario.
          </p>

          <h2 className="text-lg font-semibold">4. Compartición</h2>
          <p className="text-slate-700">
            El lead se comparte con la institución seleccionada únicamente para fines de contacto. No vendemos tus datos.
          </p>

          <h2 className="text-lg font-semibold">5. Derechos del titular</h2>
          <p className="text-slate-700">
            Puedes solicitar actualización, corrección o eliminación escribiendo a través de la página de contacto.
          </p>

          <h2 className="text-lg font-semibold">6. Retención</h2>
          <p className="text-slate-700">
            En esta versión demo, los datos se guardan localmente (archivo JSON). En producción se definirán periodos de retención
            y medidas de seguridad.
          </p>
        

          <h2 className="text-lg font-semibold">7. Cookies y analítica (Google Analytics 4)</h2>
          <p className="text-slate-700">
            ImGo puede usar Google Analytics 4 (&quot;GA4&quot;) para medir tráfico y comportamiento de uso (por ejemplo: páginas visitadas,
            búsquedas, aperturas de programas e instituciones y envío de formularios como <span className="font-semibold">eventos</span>).
            GA4 puede utilizar cookies o identificadores similares para reconocer sesiones y generar métricas agregadas.
          </p>
          <ul className="list-disc pl-6 text-slate-700 space-y-1">
            <li>Finalidad: medir tracción, embudo y conversión de leads para mejorar el producto.</li>
            <li>Datos: información técnica y de navegación (p. ej. dispositivo, navegador, páginas vistas y eventos).</li>
            <li>Control: puedes restringir o eliminar cookies desde la configuración de tu navegador.</li>
          </ul>
          <p className="text-slate-700">
            Si en tu despliegue no se configura un ID de medición, GA4 no se carga (modo demo/local).
          </p>

          <h2 className="text-lg font-semibold">8. Responsable y canales de atención</h2>
          <p className="text-slate-700">
            El responsable del tratamiento es el operador de la plataforma ImGo. Para ejercer tus derechos (consulta, actualización,
            rectificación o supresión) utiliza el canal de contacto publicado en el sitio o el correo de privacidad que el responsable
            disponga en el despliegue.
          </p>

          <h2 className="text-lg font-semibold">9. Normatividad aplicable (Colombia)</h2>
          <p className="text-slate-700">
            ImGo adopta buenas prácticas alineadas con el régimen de protección de datos personales en Colombia (Ley 1581 de 2012 y
            normas complementarias), incluyendo principios de finalidad, libertad, veracidad, transparencia, acceso y circulación
            restringida, seguridad y confidencialidad.
          </p>

          <h2 className="text-lg font-semibold">10. Seguridad</h2>
          <p className="text-slate-700">
            Implementamos medidas razonables para proteger la información. En la versión demo/local, algunos datos pueden almacenarse
            en archivos locales; en producción se recomiendan controles adicionales (cifrado, control de acceso, retención definida y
            auditoría).
          </p>

        </section>
      </main>
    </div>
  );
}
