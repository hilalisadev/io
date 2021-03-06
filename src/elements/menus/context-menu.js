import {IoElement} from "../../io.js";
import {IoLayerSingleton as Layer} from "../core/layer.js";
import {IoMenuOptions} from "./menu-options.js";
import {getElementDescendants} from "./menu-item.js";

export class IoContextMenu extends IoElement {
	static get Properties() {
		return {
			value: null,
			options: {
				type: Array,
				observe: true,
			},
			expanded: Boolean,
			position: 'pointer',
			button: 0,
			selectable: false,
			$options: HTMLElement,
		};
	}
	connectedCallback() {
		super.connectedCallback();
		Layer.addEventListener('pointermove', this._onLayerPointermove);
		this._parent = this.parentElement;
		this._parent.style.userSelect = 'none';
		this._parent.style.webkitUserSelect = 'none';
		this._parent.style.webkitTouchCallout = 'default';
		this._parent.addEventListener('pointerdown', this._onPointerdown);
		this._parent.addEventListener('click', this._onClick);
		this._parent.addEventListener('contextmenu', this._onContextmenu);
	}
	disconnectedCallback() {
		super.disconnectedCallback();
		if (this.$options) Layer.removeChild(this.$options);
		Layer.removeEventListener('pointermove', this._onLayerPointermove);
		this._parent.style.userSelect = null;
		this._parent.style.webkitUserSelect = null;
		this._parent.style.webkitTouchCallout = null;
		this._parent.removeEventListener('pointerdown', this._onPointerdown);
		this._parent.removeEventListener('contextmenu', this._onContextmenu);
		this._parent.removeEventListener('pointermove', this._onPointermove);
		this._parent.removeEventListener('pointerup', this._onPointerup);
		this._parent.removeEventListener('click', this._onClick);
		delete this._parent;
	}
	getBoundingClientRect() {
		return this._parent.getBoundingClientRect();
	}
	_onItemClicked(event) {
		const item = event.composedPath()[0];
		const d = event.detail;
		if (item !== this) {
			event.stopImmediatePropagation();
			if (d.value !== undefined && d.selectable !== false) this.set('value', d.value);
			this.dispatchEvent('item-clicked', d, true);
			this.requestAnimationFrameOnce(this._collapse);
		}
	}
	_onContextmenu(event) {
		if (this.button === 2) event.preventDefault();
	}
	_onPointerdown(event) {
		Layer.x = event.clientX;
		Layer.y = event.clientY;
		this._parent.addEventListener('pointermove', this._onPointermove);
		this._parent.addEventListener('pointerup', this._onPointerup);
		clearTimeout(this._contextTimeout);
		if (event.pointerType !== 'touch') {
			if (event.button === this.button) {
				this.expanded = true;
			}
		} else {
			// iOS Safari contextmenu event emulation.
			event.preventDefault();
			this._contextTimeout = setTimeout(() => {
				this.expanded = true;
			}, 150);
		}
	}
	_onPointermove(event) {
		clearTimeout(this._contextTimeout);
		if (this.expanded && this.$options) {
			const item = this.$options.querySelector('io-menu-item');
			if (item) item._onPointermove(event);
		}
	}
	_onPointerup(event) {
		clearTimeout(this._contextTimeout);
		if (this.expanded && this.$options) {
			const item = this.$options.querySelector('io-menu-item');
			if (item) item._onPointerup(event, {nocollapse: true});
		}
		this._parent.removeEventListener('pointermove', this._onPointermove);
		this._parent.removeEventListener('pointerup', this._onPointerup);
	}
	_onLayerPointermove(event) {
		if (this.expanded) this._onPointermove(event);
	}
	_onClick(event) {
		if (event.button === this.button && event.button !== 2) this.expanded = true;
	}
	_collapse() {
		this.expanded = false;
	}
	expandedChanged() {
		if (this.expanded) {
			if (!this.$options) {
				this.$options = new IoMenuOptions({
					$parent: this,
					'on-item-clicked': this._onItemClicked,
				});
			}
			if (this.$options.parentElement !== Layer) {
				Layer.appendChild(this.$options);
			}
			this.$options.setProperties({
				value: this.bind('value'),
				expanded: this.bind('expanded'),
				options: this.options,
				selectable: this.selectable,
				position: this.position,
			});
		} else {
			const descendants = getElementDescendants(this);
			for (let i = descendants.length; i--;) {
				descendants[i].expanded = false;
			}
		}
	}
}

IoContextMenu.Register();
