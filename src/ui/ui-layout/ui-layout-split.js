import {Io} from "../../io/io.js"
import {html} from "../../io/ioutil.js"
import {UiTabs} from "../ui-tabs/ui-tabs.js"
import "./ui-layout-divider.js"

export class UiLayoutSplit extends Io {
  static get style() {
    return html`
      <style>
        :host  {
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }
        :host[orientation=horizontal] {
          flex-direction: row;
        }
        :host[orientation=vertical] {
          flex-direction: column;
        }
        :host[orientation=horizontal] > ui-layout-divider {
          width: 10px;
        }
        :host[orientation=vertical] > ui-layout-divider {
          height: 10px;
        }
      </style>
    `;
  }
  static get properties() {
    return {
      splits: {
        type: Object,
        observer: 'update'
      },
      elements: {
        type: Object
      },
      orientation: {
        value: 'horizontal',
        type: String,
        reflectToAttribute: true
      },
      listeners: {
        'ui-layout-divider-move': '_dividerMoveHandler',
        'ui-tab-added': '_tabChangedHandler',
        'ui-tab-removed': '_tabRemovedHandler',
        'ui-tab-selected': '_tabChangedHandler'
      }
    }
  }
  _dividerMoveHandler(event) {
    event.stopPropagation();
    let movement = event.detail.movement;

    let i = event.detail.index;
    let d = this.orientation === 'horizontal' ? 'width' : 'height';
    let splits = this.splits.splits;

    var $blocks = [].slice.call(this.children).filter(element => element.className === 'ui-tabs');
    let prev = splits[i];
    let next = splits[i+1];

    if (!next[d] && !prev[d]) {
      next[d] = $blocks[i+1].getBoundingClientRect()[d];
    }

    prev = splits[i];
    next = splits[i+1];

    if (prev[d]) prev[d] = Math.max(0, Math.min(Infinity, prev[d] + movement));
    if (next[d]) next[d] = Math.max(0, Math.min(Infinity, next[d] - movement));

    this.fire('layout-changed', this.splits);
    this.update();
  }
  _tabRemovedHandler(event) {
    event.stopPropagation();
    if (event.detail.tabs.length === 0) {
      this.removeSplit(event.detail);
    }
  }
  _tabChangedHandler(event) {
    event.stopPropagation();
    this.fire('layout-changed', this.splits);
  }
  addSplit(split, index, orientation) {
    // insert if orientation match
    // Add new split if orientation different.
  }
  removeSplit(split) {
    // TODO: Normalize tabs and splits
    // let splits = this.splits.splits;
    // let index = splits.indexOf(split);
    // console.log(index)
    // splits.splice(index);
    // this.update();
  }
  update() {
    this.orientation = this.splits.orientation;
    let d = this.splits.orientation === 'horizontal' ? 'width' : 'height';
    let splits = this.splits.splits;
    let elements = [];
    // TODO: make sure at least one is flex (no size).
    // TODO: make sure it runs on split add/remove
    for (var i = 0; i < splits.length; i++) {
      let size = splits[i][d];
      let style = {
        'flex-basis': 'auto',
        'flex-shrink': '10000',
        'flex-grow': '1'
      };
      if (size) style = {
        'flex-basis': size + 'px',
        'flex-shrink': '1',
        'flex-grow': '0'
      };
      if (splits[i].tabs) {
        elements.push(['ui-tabs', {
            class: 'ui-tabs',
            style: style,
            elements: this.elements,
            tabs: splits[i].tabs //TODO: normalize with split
          }]);
      } else {
        elements.push(['ui-layout-split', {
            class: 'ui-tabs',
            style: style,
            elements: this.elements,
            splits: splits[i]
          }]);
      }
      if (i < splits.length - 1) {
        elements.push(['ui-layout-divider', {orientation: this.orientation, index: i}]);
      }
    }
    this.render(elements);
  }
}


window.customElements.define('ui-layout-split', UiLayoutSplit);
