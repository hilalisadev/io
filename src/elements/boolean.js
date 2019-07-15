import {html} from "../io.js";
import {IoButton} from "./button.js";

export class IoBoolean extends IoButton {
  static get Style() {
    return html`<style>
      :host {
        border: var(--io-outset-border);
        border-color: var(--io-outset-border-color);
        color: var(--io-color-field);
      }
      :host:not([value]) {
        opacity: 0.75;
      }
      :host[aria-invalid] {
        color: var(--io-color-error);
      }
    </style>`;
  }
  static get Properties() {
    return {
      value: {
        type: Boolean,
        reflect: 1,
      },
      true: 'true',
      false: 'false',
      role: 'switch',
    };
  }
  constructor(props) {
    super(props);
    this.__properties.action.value = this.toggle;
  }
  toggle() {
    this.set('value', !this.value);
  }
  changed() {
    this.setAttribute('aria-checked', String(!!this.value));
    this.setAttribute('aria-invalid', typeof this.value !== 'boolean' ? 'true' : false);
    this.textNode = this.value ? this.true : this.false;
  }
}

IoBoolean.Register();
