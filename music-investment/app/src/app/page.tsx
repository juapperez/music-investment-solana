"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  AudioLines,
  ChartNoAxesCombined,
  Disc3,
  Layers3,
  ShieldCheck,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import ReturnCalculator from "@/components/ReturnCalculator";
import TokenIdentity from "@/components/TokenIdentity";
import MarketHistory from "@/components/MarketHistory";

export default function HomePage() {
  const { locale } = useLanguage();
  const c = (a: string, b: string) => (locale === "es" ? a : b);
  const [strategy, setStrategy] = useState<"index" | "artists">("index");
  return (
    <div className="fund-home">
      <section className="fund-hero">
        <div className="fund-container hero-grid">
          <div>
            <div className="eyebrow">
              <span className="status-dot" />
              {c("MÚSICA. CAPITAL. SOLANA.", "MUSIC. CAPITAL. SOLANA.")}
            </div>
            <h1>
              {c("La música mueve", "Music moves")}
              <br />
              {c("al mundo.", "the world.")}
              <br />
              <span>{c("Participa en ella.", "Be part of it.")}</span>
            </h1>
            <p className="fund-lead">
              {c(
                "Dos tokens propios. Dos formas de acercarte a la economía musical: empresas que la hacen crecer y proyectos de artistas que crean lo que viene.",
                "Two tokens of our own. Two approaches to the music economy: the companies that help it grow and the artist projects creating what comes next.",
              )}
            </p>
            <div className="fund-actions">
              <a className="fund-button" href="#tokens">
                {c("Explorar los tokens", "Explore the tokens")}
                <ArrowRight size={18} />
              </a>
              <a className="text-link" href="#methodology">
                {c("Cómo funciona", "How it works")}
                <ArrowUpRight size={17} />
              </a>
            </div>
            <p className="launch-note">
              <span />
              {c(
                "En preparación · Inversiones reales aún no disponibles",
                "In preparation · Real investments are not yet available",
              )}
            </p>
          </div>
          <div className="record-scene" aria-hidden="true">
            <div className="record-orbit orbit-one" />
            <div className="record-orbit orbit-two" />
            <div className="record">
              <div className="record-label">
                <AudioLines size={42} />
                <span>
                  MUSIC
                  <br />
                  SOLANA
                </span>
                <i />
              </div>
            </div>
            <div className="floating-label label-index">
              <ChartNoAxesCombined size={19} />
              <div>
                <strong>MSIX</strong>
                <span>Music Index</span>
              </div>
              <span className="mini-line">▂▃▂▅▄▆</span>
            </div>
            <div className="floating-label label-artist">
              <AudioLines size={22} />
              <div>
                <strong>MSAF</strong>
                <span>Artist Fund</span>
              </div>
              <span className="label-plus">+</span>
            </div>
            <span className="scene-caption">THE SOUND OF POSSIBILITY</span>
          </div>
        </div>
      </section>
      <div className="fund-strip">
        <div className="fund-container">
          <span>
            <Layers3 size={17} />
            {c("2 estrategias independientes", "2 independent strategies")}
          </span>
          <span>
            <Disc3 size={17} />
            {c("Una economía musical", "One music economy")}
          </span>
          <span>
            <ShieldCheck size={17} />
            {c("Costes y riesgos visibles", "Visible costs & risks")}
          </span>
        </div>
      </div>
      <section id="tokens" className="fund-section fund-container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              01 / {c("NUESTROS TOKENS", "OUR TOKENS")}
            </span>
            <h2>
              {c("Elige tu lado de la música.", "Find your side of music.")}
            </h2>
          </div>
          <p>
            {c(
              "Productos en preparación. La creación de un token no constituye por sí sola un fondo ni acredita activos de respaldo.",
              "Products in preparation. Creating a token does not by itself establish a fund or prove backing assets.",
            )}
          </p>
        </div>
        <div className="token-grid">
          <article className="token-card index-card">
            <div className="token-card-top">
              <span className="token-icon">
                <ChartNoAxesCombined />
              </span>
              <span className="token-symbol">MSIX</span>
              <span className="small-tag">
                {c("En preparación", "Pre-launch")}
              </span>
            </div>
            <span className="eyebrow">MUSIC SOLANA INDEX</span>
            <h3>
              {c(
                "Las empresas detrás\nde la música.",
                "The companies\nbehind the music.",
              )}
            </h3>
            <p>
              {c(
                "Una cesta propuesta de acciones tokenizadas de empresas relacionadas con música. Su valor dependerá de los activos adquiridos y de los costes de mantener el índice.",
                "A proposed basket of tokenized shares in music-related companies. Its value will depend on the assets acquired and the costs of maintaining the index.",
              )}
            </p>
            <div className="return-highlight">
              <strong>Variable</strong>
              <span>
                {c(
                  "Rendimiento anual neto · sin APY fijo",
                  "Net annual return · no fixed APY",
                )}
              </span>
            </div>
            <dl className="token-facts">
              <div>
                <dt>{c("Motor del rendimiento", "Return driver")}</dt>
                <dd>
                  {c(
                    "Precio + dividendos aplicables",
                    "Price + applicable dividends",
                  )}
                </dd>
              </div>
              <div>
                <dt>{c("Costes descontados", "Costs deducted")}</dt>
                <dd>
                  {c(
                    "Compra, red e indexación",
                    "Purchase, network & indexing",
                  )}
                </dd>
              </div>
              <div>
                <dt>{c("Respaldo / NAV actual", "Current backing / NAV")}</dt>
                <dd>{c("No establecido", "Not established")}</dd>
              </div>
            </dl>
            <a
              className="card-link"
              href="#simulator"
              onClick={() => setStrategy("index")}
            >
              {c("Simular el índice", "Model the index")}
              <ArrowUpRight size={19} />
            </a>
            <TokenIdentity symbol="MSIX" />
          </article>
          <article className="token-card artist-card">
            <div className="token-card-top">
              <span className="token-icon">
                <AudioLines />
              </span>
              <span className="token-symbol">MSAF</span>
              <span className="small-tag">
                {c("En preparación", "Pre-launch")}
              </span>
            </div>
            <span className="eyebrow">MUSIC SOLANA ARTIST FUND</span>
            <h3>
              {c(
                "El siguiente capítulo\nde un artista.",
                "An artist’s\nnext chapter.",
              )}
            </h3>
            <p>
              {c(
                "Estrategia de inversión privada en proyectos musicales. Los ingresos dependerán de contratos, recobro de costes y dinero efectivamente recibido de cada proyecto.",
                "A private investment strategy for music projects. Proceeds will depend on contracts, cost recoupment and the money actually received from each project.",
              )}
            </p>
            <div className="return-highlight">
              <strong>
                8%<small>{c(" / año", " / year")}</small>
              </strong>
              <span>
                {c(
                  "Escenario bruto ilustrativo · no es una previsión",
                  "Illustrative gross scenario · not a forecast",
                )}
              </span>
            </div>
            <dl className="token-facts">
              <div>
                <dt>{c("Motor del rendimiento", "Return driver")}</dt>
                <dd>
                  {c(
                    "Ingresos contractuales recibidos",
                    "Contractual proceeds received",
                  )}
                </dd>
              </div>
              <div>
                <dt>{c("Horizonte propuesto", "Proposed horizon")}</dt>
                <dd>
                  {c(
                    "3–5 años · liquidez limitada",
                    "3–5 years · limited liquidity",
                  )}
                </dd>
              </div>
              <div>
                <dt>{c("Historial del fondo", "Fund track record")}</dt>
                <dd>{c("Aún no disponible", "Not yet available")}</dd>
              </div>
            </dl>
            <a
              className="card-link"
              href="#simulator"
              onClick={() => setStrategy("artists")}
            >
              {c("Explorar escenarios", "Explore scenarios")}
              <ArrowUpRight size={19} />
            </a>
            <TokenIdentity symbol="MSAF" />
          </article>
        </div>
        <p className="risk-inline">
          {c(
            "Rendimientos pasados no garantizan rendimientos futuros. El 8 % es un supuesto editable, no una media histórica de artistas ni un rendimiento prometido. Ambas estrategias pueden perder el 100 % del capital.",
            "Past performance does not guarantee future results. The 8% is an editable assumption, not an average historical artist return or a promised yield. Both strategies can lose 100% of invested capital.",
          )}
        </p>
      </section>
      <section id="methodology" className="method-section">
        <div className="fund-container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                02 / {c("DE DÓNDE VIENE EL VALOR", "WHERE VALUE COMES FROM")}
              </span>
              <h2>
                {c(
                  "Activos primero.\nTokens después.",
                  "Assets first.\nTokens second.",
                )}
              </h2>
            </div>
            <p>
              {c(
                "La emisión debe seguir al respaldo verificado. No hay rentabilidad por el simple hecho de tener un token.",
                "Issuance must follow verified backing. Holding a token alone does not generate returns.",
              )}
            </p>
          </div>
          <div className="method-grid">
            <div>
              <span className="step-number">01</span>
              <h3>{c("Seleccionar y verificar", "Select & verify")}</h3>
              <p>
                {c(
                  "MSIX: instrumentos elegibles y custodia. MSAF: proyectos, contratos, derechos y presupuestos. Cada activo necesita evidencia antes de incorporarse.",
                  "MSIX: eligible instruments and custody. MSAF: projects, contracts, rights and budgets. Each asset needs evidence before inclusion.",
                )}
              </p>
            </div>
            <div>
              <span className="step-number">02</span>
              <h3>{c("Valorar y descontar", "Value & deduct")}</h3>
              <p>
                {c(
                  "Publicar el valor neto de activos, las comisiones de compra, la red y la gestión. Los costes reales se documentarán antes de aceptar capital.",
                  "Publish net asset value, purchase charges, network costs and management fees. Actual costs will be documented before accepting capital.",
                )}
              </p>
            </div>
            <div>
              <span className="step-number">03</span>
              <h3>{c("Informar y distribuir", "Report & distribute")}</h3>
              <p>
                {c(
                  "Actualizar las posiciones y distribuir solo ingresos recibidos, conforme a los contratos. Los retiros y el mercado secundario requieren reglas propias.",
                  "Update positions and distribute only received proceeds, under the contracts. Redemptions and secondary trading need their own terms.",
                )}
              </p>
            </div>
          </div>
          <div className="universe">
            <span className="eyebrow">
              {c(
                "UNIVERSO PROPUESTO PARA MSIX · NO SON POSICIONES ACTUALES",
                "PROPOSED MSIX UNIVERSE · NOT CURRENT HOLDINGS",
              )}
            </span>
            <div className="company-row">
              {[
                ["SPOT", "Spotify", "40%"],
                ["AAPL", "Apple Music", "20%"],
                ["AMZN", "Amazon Music", "20%"],
                ["GOOGL", "YouTube Music", "20%"],
              ].map(([ticker, name, weight]) => (
                <div key={ticker}>
                  <span>{ticker}</span>
                  <strong>{name}</strong>
                  <small>{weight}</small>
                </div>
              ))}
            </div>
            <p>
              {c(
                "Pesos de diseño, sujetos a disponibilidad del instrumento tokenizado, jurisdicción, custodia y liquidez. Apple, Amazon y Alphabet incluyen negocios ajenos a la música. No existe afiliación con estas empresas.",
                "Design weights, subject to tokenized instrument availability, jurisdiction, custody and liquidity. Apple, Amazon and Alphabet include businesses outside music. There is no affiliation with these companies.",
              )}
            </p>
          </div>
        </div>
      </section>
      <MarketHistory />
      <section id="simulator" className="fund-section fund-container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              03 / {c("HAZ LOS NÚMEROS", "RUN THE NUMBERS")}
            </span>
            <h2>
              {c(
                "El rendimiento,\ndespués de los costes.",
                "Returns,\nafter the costs.",
              )}
            </h2>
          </div>
          <p>
            {c(
              "Simulación de un año en USD. Ajusta los supuestos y observa cuánto queda. No es una cotización ni una oferta de inversión.",
              "A one-year USD simulation. Adjust the assumptions and see what remains. This is not a quote or an investment offer.",
            )}
          </p>
        </div>
        <ReturnCalculator strategy={strategy} setStrategy={setStrategy} />
      </section>
      <section className="reference-section">
        <div className="fund-container reference-grid">
          <div>
            <span className="eyebrow">
              {c("CONTEXTO, CON FECHA Y FUENTE", "DATED, SOURCED CONTEXT")}
            </span>
            <h2>
              {c("Sin promesas\nfuera de tono.", "No out-of-tune\npromises.")}
            </h2>
            <p>
              {c(
                "Las referencias externas ayudan a entender el sector. Ninguna es el historial ni la rentabilidad de nuestros tokens.",
                "External references help explain the sector. None is the track record or return of our tokens.",
              )}
            </p>
          </div>
          <div className="reference-cards">
            <article>
              <span>
                {c(
                  "ACCIONES MUSICALES · REFERENCIA EXTERNA",
                  "MUSIC EQUITIES · EXTERNAL REFERENCE",
                )}
              </span>
              <strong>−9.73%</strong>
              <p>
                {c(
                  "MUSQ ETF: retorno de su NAV a un año, al 31/07/2026. Su cartera es distinta de MSIX. Dato histórico, no precio en vivo.",
                  "MUSQ ETF: one-year NAV return as of 2026-07-31. Its portfolio differs from MSIX. Historical data, not a live price.",
                )}
              </p>
              <a
                href="https://www.musqetf.com/musq"
                target="_blank"
                rel="noopener noreferrer"
              >
                {c("Ver fuente oficial", "View official source")}
                <ArrowUpRight size={15} />
              </a>
            </article>
            <article>
              <span>
                {c(
                  "CATÁLOGOS · OBJETIVO HISTÓRICO EXTERNO",
                  "CATALOGUES · EXTERNAL HISTORICAL TARGET",
                )}
              </span>
              <strong>9–11%</strong>
              <p>
                {c(
                  "Objetivo anual neto a medio plazo de Round Hill publicado en su informe 2022, no resultado realizado. Los catálogos maduros no representan el riesgo de artistas nuevos ni validan nuestro supuesto del 8 %.",
                  "Round Hill’s medium-term net annual target in its 2022 report, not a realized result. Mature catalogues do not represent new-artist risk or validate our 8% assumption.",
                )}
              </p>
              <a
                href="https://www.rns-pdf.londonstockexchange.com/rns/3519X_1-2023-4-25.pdf#page=6"
                target="_blank"
                rel="noopener noreferrer"
              >
                {c("Informe 2022 · página 4", "2022 report · page 4")}
                <ArrowUpRight size={15} />
              </a>
            </article>
          </div>
        </div>
      </section>
      <section className="fund-section fund-container faq-section">
        <div>
          <span className="eyebrow">
            04 / {c("PREGUNTAS CLARAS", "CLEAR QUESTIONS")}
          </span>
          <h2>{c("Antes de participar.", "Before taking part.")}</h2>
          <Link className="text-link" href="/disclosures/">
            {c("Toda la información y riesgos", "Full disclosures & risks")}
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="faq-list">
          {[
            [
              c("¿Ya puedo comprar los tokens?", "Can I buy the tokens now?"),
              c(
                "Todavía no. La web está publicada, pero la inversión real no está habilitada. Publicaremos las direcciones mainnet verificadas, el respaldo, los contratos y las condiciones antes de abrir suscripciones. No envíes fondos a una dirección de prueba.",
                "Not yet. The website is published, but real investing is not enabled. Verified mainnet addresses, backing, contracts and terms must be published before subscriptions open. Do not send funds to a test address.",
              ),
            ],
            [
              c("¿Por qué no hay un APY fijo?", "Why is there no fixed APY?"),
              c(
                "Las acciones cambian de precio y los ingresos musicales no son constantes. El rendimiento anual neto descuenta los costes. APY implicaría una tasa y reinversión que estas estrategias no garantizan.",
                "Stock prices change and music proceeds are irregular. Net annual return deducts costs. APY implies a rate and compounding that these strategies do not guarantee.",
              ),
            ],
            [
              c(
                "¿El token me da derechos sobre canciones o acciones?",
                "Does a token give me rights to songs or shares?",
              ),
              c(
                "Por sí solo, no. Los derechos económicos, custodia, límites de transferencia y rescate deben estar definidos en contratos. Actualmente los tokens no acreditan activos ni derechos contractuales.",
                "Not by itself. Economic rights, custody, transfer limits and redemptions must be defined in contracts. Currently these tokens do not evidence assets or contractual rights.",
              ),
            ],
            [
              c("¿Puedo probar la tecnología?", "Can I try the technology?"),
              c(
                "Sí. El laboratorio devnet permite crear y respaldar proyectos con SOL de prueba. Es independiente de los dos tokens y no recoge regalías de plataformas. No uses dinero real.",
                "Yes. The devnet lab lets you create and back projects with test SOL. It is separate from the two tokens and does not collect platform royalties. Do not use real money.",
              ),
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <span>+</span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
