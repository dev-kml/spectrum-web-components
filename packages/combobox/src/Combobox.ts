/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import {
    html,
    SpectrumElement,
    CSSResultArray,
    TemplateResult,
    property,
    query,
    PropertyValues,
    ifDefined,
} from '@spectrum-web-components/base';
import '../sp-combobox-item.js';
import { ComboboxItem } from './ComboboxItem.js';
import { openOverlay } from '@spectrum-web-components/overlay';
import '@spectrum-web-components/icons-ui/icons/sp-icon-chevron100.js';
import '@spectrum-web-components/popover/sp-popover.js';
import '@spectrum-web-components/menu/sp-menu.js';
import '@spectrum-web-components/menu/sp-menu-item.js';

import { Textfield } from '@spectrum-web-components/textfield';
import styles from './combobox.css.js';
import chevronStyles from '@spectrum-web-components/icon/src/spectrum-icon-chevron.css.js';

export type ComboboxOption = {
    id: string;
    value: string;
};

/**
 * @element sp-combobox
 */
export class Combobox extends SpectrumElement {
    public static get styles(): CSSResultArray {
        return [...Textfield.styles, styles, chevronStyles];
    }

    /**
     * The currently active ComboboxItem descendent, when available.
     */
    @property({ attribute: false })
    protected activeDescendent?: ComboboxOption;

    @property({ attribute: false })
    protected availableOptions: ComboboxOption[] = [];

    @property()
    public label = '';

    /**
     * Whether the listbox is visible.
     **/
    @property({ type: Boolean, reflect: true })
    public open = false;

    @property()
    public value = '';

    @query('input')
    public focusElement!: HTMLInputElement;

    @query('[name="option"]')
    public optionSlot!: HTMLSlotElement;

    @query('#listbox')
    public listbox!: HTMLDivElement;

    public overlay!: HTMLDivElement;

    /**
     * The array of the children of the combobox, ie ComboboxItems.
     **/
    @property({ type: Array })
    public options: ComboboxOption[] = [];

    // { value: "String thing", id: "string1" }
    public focus(): void {
        this.focusElement.focus();
    }

    public click(): void {
        this.focus();
        this.focusElement.click();
    }

    public onComboboxKeydown(event: KeyboardEvent): void {
        if (event.altKey && event.code === 'ArrowDown') {
            this.open = true;
        } else if (event.code === 'ArrowDown') {
            event.preventDefault();
            this.open = true;
            this.activateNextDescendent();
            const activeEl = this.overlay.querySelector(
                `#${(this.activeDescendent as ComboboxOption).id}`
            ) as HTMLElement;
            if (activeEl) {
                activeEl.scrollIntoView({ block: 'nearest' });
            }
        } else if (event.code === 'ArrowUp') {
            event.preventDefault();
            this.open = true;
            this.activatePreviousDescendent();
            const activeEl = this.overlay.querySelector(
                `#${(this.activeDescendent as ComboboxOption).id}`
            ) as HTMLElement;
            if (activeEl) {
                activeEl.scrollIntoView({ block: 'nearest' });
            }
        } else if (event.code === 'Escape') {
            if (!this.open) {
                this.value = '';
            }
            this.open = false;
        } else if (event.code === 'Enter') {
            this.selectDescendent();
            this.open = false;
        } else if (event.code === 'Home') {
            this.focusElement.setSelectionRange(0, 0);
            this.activeDescendent = undefined;
        } else if (event.code === 'End') {
            const { length } = this.value;
            this.focusElement.setSelectionRange(length, length);
            this.activeDescendent = undefined;
        } else if (event.code === 'ArrowLeft') {
            this.activeDescendent = undefined;
        } else if (event.code === 'ArrowRight') {
            this.activeDescendent = undefined;
        }
    }

    /**
     * Convert the flattened array of assigned elements of `slot[name='option']` to
     * an array of `ComboboxOptions` for use in rendering options in the shadow DOM.s
     **/
    public onSlotchange(): void {
        this.setOptionsFromSlottedItems();
        this.itemObserver.disconnect();
        const comboboxItems = this.optionSlot.assignedElements({
            flatten: true,
        }) as ComboboxItem[];
        comboboxItems.map((item) => {
            this.itemObserver.observe(item, {
                attributes: true,
                attributeFilter: ['id'],
                childList: true,
            });
        });
    }

    public setOptionsFromSlottedItems(): void {
        const elements = this.optionSlot.assignedElements({
            flatten: true,
        }) as ComboboxItem[];
        // Element data
        this.options = elements.map((element) => {
            return { id: element.id, value: element.value };
        });
    }

    public activateNextDescendent(): void {
        const activeIndex = !this.activeDescendent
            ? -1
            : this.availableOptions.indexOf(this.activeDescendent);
        const nextActiveIndex =
            (this.availableOptions.length + activeIndex + 1) %
            this.availableOptions.length;
        this.activeDescendent = this.availableOptions[nextActiveIndex];
    }

    public activatePreviousDescendent(): void {
        const activeIndex = !this.activeDescendent
            ? 0
            : this.options.indexOf(this.activeDescendent);
        const previousActiveIndex =
            (this.options.length + activeIndex - 1) % this.options.length;
        this.activeDescendent = this.options[previousActiveIndex];
    }

    public selectDescendent(): void {
        if (!this.activeDescendent) {
            return;
        }
        this.value = this.activeDescendent.value;
    }

    public filterAvailableOptions(): void {
        const valueLowerCase = this.value.toLowerCase();
        this.availableOptions = this.options.filter((descendent) => {
            const descendentValueLowerCase = descendent.value.toLowerCase();
            return descendentValueLowerCase.startsWith(valueLowerCase);
        });
    }

    public onComboboxInput({
        target,
    }: Event & { target: HTMLInputElement }): void {
        // Element data.
        this.value = target.value;
        this.activeDescendent = undefined;
        this.open = true;
    }

    public onListPointerenter({
        target,
    }: PointerEvent & { target: ComboboxItem }) {
        this.activeDescendent = target;
    }

    public onListPointerleave() {
        this.activeDescendent = undefined;
    }

    public onListClick(event: PointerEvent & { target: ComboboxItem }) {
        const { target } = event;
        event.preventDefault();
        this.activeDescendent = target;
        if (!this.activeDescendent) {
            return;
        }
        this.selectDescendent();
        this.open = false;
        this._returnItems();
    }

    public onOverlayScroll = () => {
        const overlayMenu = this.overlay.children[0] as HTMLElement;
        const menu = this.listbox.children[0] as HTMLElement;
        menu.scroll(overlayMenu.scrollLeft, overlayMenu.scrollTop);
    };

    public onOpened(): void {
        this.overlayObserver.observe(
            this.overlay.parentElement as HTMLElement,
            {
                attributes: true,
                // attributeFilter: [ "style" ]
            }
        );
        const menu = this.overlay.children[0] as HTMLElement;
        menu.addEventListener('scroll', this.onOverlayScroll);
    }

    public toggleOpen(): void {
        this.open = !this.open;
    }

    protected shouldUpdate(changed: PropertyValues<this>): boolean {
        if (changed.has('open') && !this.open) {
            this.activeDescendent = undefined;
        }
        if (changed.has('value')) {
            this.filterAvailableOptions();
        }
        return super.shouldUpdate(changed);
    }

    private positionListbox(entries: MutationRecord[]): void {
        entries.forEach((entry) => {
            if ((entry.target as HTMLElement).children.length) {
                const targetRect = ((entry.target as HTMLElement)
                    .children[0] as HTMLElement).getBoundingClientRect();
                const rootRect = this.getBoundingClientRect();
                this.listbox.style.transform = `translate(${
                    targetRect.x - rootRect.x
                }px, ${targetRect.y - rootRect.y}px)`;
                this.listbox.style.height = `${targetRect.height}px`;
                this.listbox.style.maxHeight = `${targetRect.height}px`;
            }
        });
    }

    protected render(): TemplateResult {
        return html`
            <label id="label" for="input">
                <slot>${this.label}</slot>
            </label>
            <input
                aria-controls="listbox"
                aria-activedescendant=${ifDefined(
                    this.activeDescendent
                        ? `${this.activeDescendent.id}-sr`
                        : undefined
                )}
                aria-autocomplete="list"
                aria-expanded=${this.open ? 'true' : 'false'}
                aria-labelledby="label"
                autocomplete="off"
                @click=${this.toggleOpen}
                @input=${this.onComboboxInput}
                @keydown=${this.onComboboxKeydown}
                id="input"
                role="combobox"
                type="text"
                .value=${this.value}
                @sp-closed=${() => {
                    this.open = false;
                }}
                @sp-opened=${this.onOpened}
            />
            <button
                aria-controls="listbox"
                aria-expanded=${this.open ? 'true' : 'false'}
                aria-labelledby="label"
                @click=${this.toggleOpen}
                tabindex="-1"
                class="button"
            >
                <sp-icon-chevron100
                    class="spectrum-UIIcon-ChevronDown100 icon"
                ></sp-icon-chevron100>
            </button>
            <sp-popover
                aria-labelledby="label"
                @pointerenter=${this.onListPointerenter}
                @pointerleave=${this.onListPointerleave}
                @click=${this.onListClick}
                ?hidden=${!this.open}
                role="listbox"
                id="overlay"
                style="max-height: 100%;"
            >
                <sp-menu>
                    ${this.availableOptions.map((option) => {
                        return html`
                            <sp-menu-item
                                id=${option.id}
                                aria-selected=${ifDefined(
                                    this.activeDescendent?.id === option.id
                                        ? 'true'
                                        : undefined
                                )}
                                ?focused=${this.activeDescendent?.id ===
                                option.id}
                                ?selected=${this.value === option.value}
                                .value=${option.value}
                            >
                                ${option.value}
                            </sp-menu-item>
                        `;
                    })}
                </sp-menu>
            </sp-popover>
            <sp-popover
                aria-labelledby="label"
                ?open=${this.open}
                role="listbox"
                id="listbox"
                style="overflow: auto;"
            >
                <sp-menu>
                    ${this.availableOptions.map((option) => {
                        return html`
                            <sp-menu-item
                                id="${option.id}-sr"
                                aria-selected=${ifDefined(
                                    this.activeDescendent?.id === option.id
                                        ? 'true'
                                        : undefined
                                )}
                                ?focused=${this.activeDescendent?.id ===
                                option.id}
                                ?selected=${this.value === option.value}
                                .value=${option.value}
                            >
                                ${option.value}
                            </sp-menu-item>
                        `;
                    })}
                </sp-menu>
            </sp-popover>
            <slot name="option" @slotchange=${this.onSlotchange} hidden></slot>
        `;
    }

    protected firstUpdated(changed: PropertyValues<this>): void {
        super.firstUpdated(changed);
        this.overlay = this.shadowRoot.querySelector(
            '#overlay'
        ) as HTMLDivElement;
        this.updateComplete.then(() => {
            this.availableOptions = this.options;
        });
    }

    private _returnItems = () => {
        return;
    };

    protected async manageListOverlay(): Promise<void> {
        if (this.open) {
            this._returnItems = await openOverlay(
                this.shadowRoot.querySelector('#input') as HTMLElement,
                'click',
                this.shadowRoot.querySelector('#overlay') as HTMLElement,
                {
                    offset: 0,
                    placement: 'bottom-start',
                }
            );
        } else {
            this._returnItems();
            this._returnItems = () => {};
            this.overlayObserver.disconnect();
            this.overlay.removeEventListener('scroll', this.onOverlayScroll);
        }
    }

    protected updated(changed: PropertyValues<this>): void {
        if (changed.has('open')) {
            this.manageListOverlay();
        }
    }

    protected async _getUpdateComplete(): Promise<void> {
        await super._getUpdateComplete();
        const list = this.shadowRoot.querySelector(
            '#listbox'
        ) as HTMLUListElement;
        if (list) {
            const descendents = [...list.children] as ComboboxItem[];
            await Promise.all(
                descendents.map((descendent) => descendent.updateComplete)
            );
        }
    }

    public connectedCallback(): void {
        super.connectedCallback();
        if (!this.overlayObserver) {
            this.overlayObserver = new MutationObserver(
                this.positionListbox.bind(this)
            );
        }
        if (!this.itemObserver) {
            this.itemObserver = new MutationObserver(
                this.setOptionsFromSlottedItems.bind(this)
            );
        }
    }

    public disconnectedCallback(): void {
        this.overlayObserver.disconnect();
        this.itemObserver.disconnect();
        this.open = false;
        super.disconnectedCallback();
    }

    private overlayObserver!: MutationObserver;
    private itemObserver!: MutationObserver;
}

/**
 * 
    <sp-combobox>
        #shadow-root
    this.shadowRoot.querySelector('#listbox').children;
    this.shadowRoot.querySelectorAll('li');
            <div class="spectrum-Textfield spectrum-InputGroup-textfield">
                <input type="text" placeholder="Type here" name="field" value="" class="spectrum-Textfield-input spectrum-InputGroup-input">
            </div>
            <button class="spectrum-Picker spectrum-Picker--sizeM spectrum-InputGroup-button" tabindex="-1" aria-haspopup="true">
                <svg class="spectrum-Icon spectrum-UIIcon-ChevronDown100 spectrum-Picker-menuIcon spectrum-InputGroup-icon" focusable="false" aria-hidden="true">
                    <use xlink:href="#spectrum-css-icon-Chevron100" />
                </svg>
            </button>
    </sp-conbobox>
 * 
 */

/**
 *
 * Public API
 * popover requirement
 *
 * Aria-Spectrum consumption
 *
 * visual delivery - Spectrum CSS
 *
 *
 * does test:watch build the plugins correctly?
 */
