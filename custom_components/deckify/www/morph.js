/* Deckify — morph.js
 * Minimal DOM-morphing. Erstatter `innerHTML = html` slik at noder gjenbrukes:
 * bilder lastes ikke om, fokus i inputfelt beholdes, og CSS-animasjoner
 * starter ikke på nytt. Det var årsaken til flimringen på Media-fanen, der
 * progresjonslinja endrer seg hvert sekund og dro hele kortet med seg.
 */

const tpl = document.createElement("template");

export function morph(parent, html) {
  tpl.innerHTML = html;
  morphChildren(parent, tpl.content);
}

function morphChildren(a, b) {
  const an = Array.prototype.slice.call(a.childNodes);
  const bn = Array.prototype.slice.call(b.childNodes);
  const n = Math.max(an.length, bn.length);
  for (let i = 0; i < n; i++) {
    const x = an[i], y = bn[i];
    if (y === undefined) { if (x) x.remove(); continue; }
    if (x === undefined) { a.appendChild(y); continue; }
    morphNode(a, x, y);
  }
}

function morphNode(parent, x, y) {
  if (x.nodeType !== y.nodeType || (x.nodeType === 1 && x.tagName !== y.tagName)) {
    parent.replaceChild(y, x);
    return;
  }
  if (x.nodeType === 3 || x.nodeType === 8) {
    if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue;
    return;
  }
  if (x.nodeType !== 1) return;

  /* attributter: fjern de som er borte, sett de som er endret */
  const xa = x.attributes;
  for (let i = xa.length - 1; i >= 0; i--) {
    const name = xa[i].name;
    if (!y.hasAttribute(name)) x.removeAttribute(name);
  }
  const ya = y.attributes;
  for (let i = 0; i < ya.length; i++) {
    const { name, value } = ya[i];
    if (x.getAttribute(name) !== value) x.setAttribute(name, value);
  }

  /* ikke rør et felt brukeren skriver i */
  if (x.tagName === "INPUT" || x.tagName === "TEXTAREA") return;

  morphChildren(x, y);
}
