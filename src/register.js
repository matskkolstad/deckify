/* Deckify — register.js
 *
 * Denne lille modulen lastes på alle Home Assistant-sider i stedet for hele
 * dashbordet. Den registrerer en tynn `deckify-card`-proxy, og henter først
 * den tunge modulen når noen faktisk legger inn kortet i et dashbord.
 *
 * Panelet bruker fortsatt deckify.js direkte via module_url; denne filen
 * finnes bare for å gjøre `custom:deckify-card` tilgjengelig uten å sende
 * 600 kB til hver HA-side for alle brukere.
 */

class DeckifyCardProxy extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML =
      "<style>:host{display:block;min-height:100%}deckify-card,deckify-card-inner{display:block;min-height:100%}</style>";
    this._inner = null;
    this._config = null;
    this._hass = null;
    this._loading = null;
  }

  setConfig(config) {
    this._config = config || {};
    if (this._inner) this._inner.setConfig(this._config);
    else this._ensure();
  }

  getCardSize() {
    return this._inner?.getCardSize?.() || 20;
  }

  static getStubConfig() { return {}; }

  set hass(hass) {
    this._hass = hass;
    if (this._inner) this._inner.hass = hass;
    else this._ensure();
  }
  get hass() { return this._hass; }

  _ensure() {
    if (this._inner || this._loading) return;
    this._loading = import("./deckify.js?v=2.4.2").then(() => {
      if (!customElements.get("deckify-card-inner"))
        throw new Error("deckify-card-inner mangler");
      const el = document.createElement("deckify-card-inner");
      el.setConfig(this._config || {});
      this.shadowRoot.appendChild(el);
      this._inner = el;
      if (this._hass) el.hass = this._hass;
    }).catch((e) => {
      this._loading = null;
      console.warn("[Deckify] kunne ikke laste kortet:", e);
      this.shadowRoot.innerHTML =
        '<div style="padding:16px;color:inherit">Deckify kunne ikke lastes.</div>';
    });
  }
}

if (!customElements.get("deckify-card")) {
  customElements.define("deckify-card", DeckifyCardProxy);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "deckify-card")) {
  window.customCards.push({
    type: "deckify-card",
    name: "Deckify",
    description: "Helskjerms hjemdashbord: rom, scener, media, sikkerhet, kalender og vær.",
  });
}
