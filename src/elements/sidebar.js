import {html, IoElement} from "../core/element.js";

export class IoSidebar extends IoElement {
  static get style() {
    return html`<style>
      :host {
        flex-wrap: nowrap;
        overflow: visible;
        flex: 0 1 auto;
        line-height: 1.5em;
      }
      :host[overflow] {
        line-height: 1em;
      }
      :host:not([overflow]) {
        display: flex;
        flex-direction: column;
        min-width: 8em;
      }
      :host io-collapsable,
      :host io-boolean,
      :host .io-content,
      :host io-button {
        flex: 0 0 auto;
        margin: 0;
        padding: 0;
        border: none;
        background: none;
      }
      :host io-button {
        padding-left: 1em;
        padding-right: 1em;
      }
      :host .io-content {
        display: flex;
        flex-direction: column;
        padding-left: 1em;
      }
      :host io-button.io-selected-tab {
        color: var(--io-link-color);
        text-decoration: underline;
      }
      :host > span {
        color: var(--io-color);
        display: inline-block;
        cursor: default;
        white-space: nowrap;
        -webkit-tap-highlight-color: transparent;
        overflow: hidden;
        text-overflow: ellipsis;
        padding: var(--io-padding);
        padding-left: calc(3 * var(--io-padding));
        padding-right: calc(3 * var(--io-padding));
      }
      :host > io-option {
        background: none !important;
        border: none;
        padding-left: var(--io-padding);
        padding-right: var(--io-padding);
      }
    </style>`;
  }
  static get properties() {
    return {
      elements: Array,
      selected: String,
      options: Array,
      overflow: {
        type: Boolean,
        reflect: true,
      },
      role: 'navigation',
    };
  }
  _onSelect(id) {
    this.set('selected', id);
  }
  _onValueSet(event) {
    this.set('selected', event.detail.value);
  }
  _addOptions(options) {
    const elements = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].options) {
        elements.push(['io-collapsable', {
          label: options[i].label,
          expanded: true,
          elements: [...this._addOptions(options[i].options)]
        }]);
      } else {
        const option = options[i].label || options[i].value || options[i];
        const selected = this.selected === option;
        elements.push(['io-button', {
          label: option,
          value: option,
          action: this._onSelect,
          className: (selected ? 'io-selected-tab' : '') + ' io-tab',
        }]);
      }
    }
    return elements;
  }
  changed() {
    const options = this.options.length ? this.options : this.elements.map(element => { return element[1].name; });
    if (this.overflow) {
      this.template([['io-option', {
        label: '☰',
        title: 'select tab',
        value: this.selected,
        options: options,
        'on-value-set': this._onValueSet,
      }], ['span', this.selected]]);
    } else {
      this.template([...this._addOptions(options)]);
    }
  }
}

IoSidebar.Register();
