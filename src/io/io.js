import {Binding, IoBindingMixin} from "./iobinding.js"

export function html() { return arguments[0][0]; }

export class Io extends IoBindingMixin(HTMLElement) {
  static get style() { return ``; }
  static get definedProperties() {
    let config = {
      properties: {},
      attributes: {},
      listeners: {},
    }
    let proto = this;
    while (proto) {
      let prop = proto.properties;
      for (let key in prop) {
        if (key === 'listeners') {
          for (let listener in prop[key]) {
            config.listeners[listener] = config.listeners[listener] || [];
            config.listeners[listener].push(prop[key][listener]);
          }
        } else if (key === 'attributes') {
          for (let att in prop[key]) config.attributes[att] = prop[key][att];
        } else {
          if (prop[key].value === undefined) {
            if (prop[key].type === Boolean) prop[key].value = false;
            if (prop[key].type === Number) prop[key].value = 0;
            if (prop[key].type === String) prop[key].value = '';
          }
          config.properties[key] = Object.assign(prop[key], config.properties[key] || {});
        }
      }
      proto = proto.__proto__;
    }
    return config;
  }
  static get definedHandlers() {
    let handlers = [];
    let proto = this.prototype;
    while (proto) {
      let names = Object.getOwnPropertyNames(proto);
      for (let i = 0; i < names.length; i++) {
        if (names[i].substring(names[i].length-7, names[i].length) === 'Handler') {
          handlers.push(names[i]);
        }
      }
      proto = proto.__proto__;
    }
    return handlers;
  }
  constructor(props = {}) {
    super();
    let definedProperties = this.__proto__.constructor.definedProperties;
    Object.defineProperty(this, '__properties', { value: definedProperties.properties });
    Object.defineProperty(this, '__attributes', { value: definedProperties.attributes });
    Object.defineProperty(this, '__listeners', { value: definedProperties.listeners });
    Object.defineProperty(this, '__handlers', { value: this.__proto__.constructor.definedHandlers });
    Object.defineProperty(this, '__bindings', { value: {} });

    for (let key in this.__properties) {
      if (props[key] instanceof Binding) {
        // TODO: make bindings work without cloning
        let binding = props[key].clone();
        this.__properties[key].value = binding.source[binding.sourceProp];
        binding.target = this;
        binding.targetProp = key;
        // TODO: test and unbind
        binding.bind();
      } else if (props[key] !== undefined) {
        this.__properties[key].value = props[key];
      }
      this.defineProperty(key, this.__properties[key]);
      this.reflectAttribute(key, this.__properties[key]);
    }

    for (let att in this.__attributes) {
      this.setAttribute(att, this.__attributes[att]);
    }

    for (let i = 0; i < this.__handlers.length; i++) {
      this[this.__handlers[i]] = this[this.__handlers[i]].bind(this);
    }

    initStyle(this.localName, this.__proto__.constructor.style);
  }
  defineProperty(key, config) {
    Object.defineProperty(this, key, {
      get: function() {
        return config.value;
      },
      set: function(value) {
        if (config.value === value) return;
        let oldValue = config.value;
        config.value = value;
        this.reflectAttribute(key, config);
        if (config.observer) {
          this[config.observer](value, oldValue, key);
        }
        if (config.notify) {
          this.fire(key + '-changed', {value: value, oldValue: oldValue}, config.bubbles);
        }
      },
      enumerable: true,
      configurable: true
    });
  }
  reflectAttribute(key, config) {
    if (config.reflectToAttribute) {
      if (config.value === true) {
        this.setAttribute(key, '');
      } else if (config.value === false || config.value === '') {
        this.removeAttribute(key);
      } else if (typeof config.value == 'string' || typeof config.value == 'number') {
        this.setAttribute(key, config.value);
      }
    }
  }
  connectedCallback() {
    for (let e in this.__listeners) {
      for (let l = 0; l < this.__listeners[e].length; l++) {
        if (typeof this.__listeners[e][l] === 'string')
        this.__listeners[e][l] = this[this.__listeners[e][l]];
        this.addEventListener(e, this.__listeners[e][l]);
      }
    }
    // TODO: occasional redundant update?
    if (typeof this.update == 'function') this.update();
  }
  disconnectedCallback() {
    for (let e in this.__listeners) {
      for (let l = 0; l < this.__listeners[e].length; l++) {
        this.removeEventListener(e, this.__listeners[e][l]);
      }
    }
  }
  render(children, host) {
    let vDOM = buildVDOM()(['root', children]).children;
    this.traverse(vDOM, host || this);
  }
  traverse(vChildren, host) {
    let children = host.children;

    for (let i = 0; i < vChildren.length; i++) {

      let element;
      let oldElement;
      let observers = [];
      let reflections = [];

      if (children[i] && children[i].localName === vChildren[i].name) {

        element = children[i];
        observers.length = 0;

        for (let prop in vChildren[i].props) {

          if (vChildren[i].props[prop] !== element[prop]) {

            if (prop === 'style' || prop === 'listeners' || prop === 'class') continue;

            let value = vChildren[i].props[prop];

            if (value instanceof Binding) {
              let binding = value.clone(); // TODO: try making without clone
              value = binding.source[binding.sourceProp];
              binding.target = element;
              binding.targetProp = prop;
              binding.bind();
            }

            // avoid triggering observers prematurely when re-rendering elements with different props.
            if (element.__properties && element.__properties.hasOwnProperty(prop)) {
              let oldValue = element.__properties[prop].value;
              element.__properties[prop].value = value;
              // TODO: make less ugly
              if (element.__properties[prop].reflectToAttribute && reflections.indexOf(prop) === -1) {
                reflections.push(prop);
              }
              if (element.__properties[prop].observer && observers.indexOf(element.__properties[prop].observer) === -1) {
                if (value !== oldValue) {
                  observers.push(element.__properties[prop].observer);
                }
              }
            } else {
              element[prop] = value;
            }
          }
        }

        // triggering observers
        for (var j = 0; j < observers.length; j++) {
          element[observers[j]]();
        }
        // triggering reflections
        for (var j = 0; j < reflections.length; j++) {
          element.reflectAttribute(reflections[j], element.__properties[reflections[j]]);
        }

      } else if (children[i] && children[i].localName !== vChildren[i].name) {
        oldElement = children[i];
        element = renderElement(vChildren[i]);
        host.insertBefore(element, oldElement);
        host.removeChild(oldElement);
      } else {
        element = renderElement(vChildren[i]);
        host.appendChild(element);
      }

      for (let prop in vChildren[i].props) {
        let value = vChildren[i].props[prop];
        if (value instanceof Binding) {
          // TODO: fix bindings
          value.unbind();
        }
      }

      for (let prop in vChildren[i].props) {
        if (prop == 'listeners') {
          for (let l in vChildren[i].props[prop]) {
            if (typeof vChildren[i].props[prop][l] === 'function') {
              // TODO: test for garbage / lingering listeners
              // TODO: check for conflicts / existing listeners
              element.__listeners[l] = element.__listeners[l] || [];
              element.__listeners[l].push(vChildren[i].props[prop][l]);
              element.addEventListener(l, vChildren[i].props[prop][l]);
            }
          }
        } else if (prop == 'style') {
          for (let s in vChildren[i].props[prop]) {
            element.style[s] = vChildren[i].props[prop][s];
          }
        } else if (prop == 'class') {
          // TODO: ugh
          element.className = vChildren[i].props[prop];
        }
      }

      if (vChildren[i].children && typeof vChildren[i].children === 'string') {
        element.innerHTML = vChildren[i].children;
      } else if (vChildren[i].children && typeof vChildren[i].children === 'object') {
        // TODO: test extensively
        this.traverse(vChildren[i].children, element);
      }

      // TODO: handle attributes better
      if (vChildren[i].props && vChildren[i].props.tabindex !== undefined) {
        element.setAttribute('tabindex', vChildren[i].props.tabindex);
      }

    }

     // TODO: consider caching elements for reuse
     if (children.length > vChildren.length) {
       for (let i = children.length - 1; children.length > vChildren.length; i--) {
         host.removeChild(children[i]);
       }
     }
   }
  _setValue(value) {
    let oldValue = this.value;
    this.value = value;
    this.fire('value-set', {value: value, oldValue: oldValue}, false);
  }
  fire(eventName, detail, bubbles = true) {
    this.dispatchEvent(new CustomEvent(eventName, {
      detail: detail,
      bubbles: bubbles,
      composed: true
    }));
  }
}

const renderElement = function(vDOMNode) {
  let ConstructorClass = customElements.get(vDOMNode.name);
  let element;
  if (ConstructorClass) {
    element = new ConstructorClass(vDOMNode.props);
  } else {
    element = document.createElement(vDOMNode.name);
    for (let prop in vDOMNode.props) {
      element[prop] = vDOMNode.props[prop];
    }
  }
  return element;
}

const _styledElements = {};
const _stagingElement = document.createElement('div');
const initStyle = function(localName, style) {
  if (style && !_styledElements[localName]) {
    _styledElements[localName] = true;
    _stagingElement.innerHTML = style.replace(new RegExp(':host', 'g'), localName);
    let element = _stagingElement.querySelector('style');
    element.setAttribute('id', 'io-style-' + localName);
    document.head.appendChild(element);
  }
}

// https://github.com/lukejacksonn/ijk
const clense = (a, b) => !b ? a : typeof b[0] === 'string' ? [...a, b] : [...a, ...b]
const buildVDOM = () => node => !!node && typeof node[1] === 'object' && !Array.isArray(node[1])
    ? {
        ['name']: node[0],
        ['props']: node[1],
        ['children']: Array.isArray(node[2]) ? node[2].reduce(clense, []).map(buildVDOM()) : node[2] || ''
      }
    : buildVDOM()([node[0], {}, node[1] || ''])
