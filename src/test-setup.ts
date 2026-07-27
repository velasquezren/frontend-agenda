/**
 * jsdom todavía no implementa `<dialog>`: no trae `showModal()` ni `close()`.
 * Los stubeamos con lo mínimo que necesitan los tests (el atributo `open`),
 * para no tener que ensuciar el componente con un fallback que en un navegador
 * de verdad nunca se ejecutaría.
 */
const proto = HTMLDialogElement.prototype as HTMLDialogElement & {
  showModal?: () => void;
  close?: () => void;
};

if (typeof proto.showModal !== 'function') {
  proto.showModal = function (this: HTMLDialogElement) {
    this.open = true;
  };
  proto.show = function (this: HTMLDialogElement) {
    this.open = true;
  };
  proto.close = function (this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}
