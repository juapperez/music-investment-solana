"use client";
import operator from "../../public/legal/operator.json";
import { useLanguage } from "@/context/LanguageContext";
export default function OperatorIdentity() {
  const { locale } = useLanguage();
  const es = locale === "es";
  return (
    <section className="operator-identity" aria-labelledby="operator-heading">
      <span className="eyebrow">
        {es ? "ENTIDAD OPERADORA" : "PROJECT OPERATOR"}
      </span>
      <h2 id="operator-heading">{operator.legalName}</h2>
      <p>
        {es
          ? "Music Solana es un proyecto de PDEVELOP LLC, sociedad de responsabilidad limitada constituida en Nuevo México, Estados Unidos, el 21 de agosto de 2026."
          : "Music Solana is a project of PDEVELOP LLC, a domestic limited liability company formed in New Mexico, United States, on August 21, 2026."}
      </p>
      <dl>
        <div>
          <dt>{es ? "Registro de la entidad" : "Entity registration"}</dt>
          <dd>{operator.registrationNumber}</dd>
        </div>
        <div>
          <dt>{es ? "Jurisdicción" : "Jurisdiction"}</dt>
          <dd>New Mexico, United States</dd>
        </div>
        <div>
          <dt>{es ? "Contacto" : "Contact"}</dt>
          <dd>
            <a href={`mailto:${operator.contactEmail}`}>
              {operator.contactEmail}
            </a>
          </dd>
        </div>
      </dl>
      <p>
        {es
          ? "Identidad documentada mediante el Certificate of Organization y los Articles of Organization. Esta identificación societaria no acredita activos de respaldo ni una autorización para ofrecer productos de inversión."
          : "Identity documented by the Certificate of Organization and Articles of Organization. This corporate identification does not evidence backing assets or authorization to offer investment products."}
      </p>
      <a href="/legal/operator.json" target="_blank" rel="noopener noreferrer">
        {es
          ? "Datos corporativos y huellas de documentos"
          : "Corporate details and document digests"}{" "}
        ↗
      </a>
    </section>
  );
}
