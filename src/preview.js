/*
    This file is part of CoverflowAltTab.

    CoverflowAltTab is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    CoverflowAltTab is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with CoverflowAltTab.  If not, see <http://www.gnu.org/licenses/>.
*/

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Graphene from 'gi://Graphene';
import St from 'gi://St';

/**
 * Direction and Placement properties values are set to be compatible with deprecated
 * Clutter.Gravity.
 */

export class Direction {}
Direction.TO_RIGHT = 3;
Direction.TO_LEFT = 7;

export class Placement {}
Placement.TOP = 1;
Placement.TOP_RIGHT = 2;
Placement.RIGHT = 3;
Placement.BOTTOM_RIGHT = 4;
Placement.BOTTOM = 5;
Placement.BOTTOM_LEFT = 6;
Placement.LEFT = 7;
Placement.TOP_LEFT = 8;
Placement.CENTER = 9;

export const Preview = GObject.registerClass({
    GTypeName: "Preview"
}, class Preview extends Clutter.Clone {
    _init(window, switcher, ...args) {
        super._init(...args);
        this.metaWin = window;
        this.switcher = switcher;
        this._icon = null;
        this._highlight = null;
        this._flash = null;
        this._entered = false;
        this._effectNames = ['blur', 'glitch', 'desaturate', 'tint']
        this._effectCounts = {};
        for (let effect_name of this._effectNames) {
            this._effectCounts[effect_name] = 0;
        }
    }

    /**
     * Make the preview above all other children layers in the given parent.
     *
     * @param {Object} parent The preview parent. If is not its real parent,then the
     * behaviour is undefined.
     * @return {void}
     */
    make_top_layer(parent) {
        if (this.raise_top) {
            this.raise_top()
        } else if (parent.set_child_above_sibling) {
            parent.set_child_above_sibling(this, null);
        } else {
            // Don't throw anything here, it may cause unstabilities
            logError("No method found for making preview the top layer");
        }
    }

    /**
     * Make the preview below all other children layers in the given parent.
     *
     * @param {Object} parent The preview parent. If is not its real parent,then the
     * behaviour is undefined.
     * @return {void}
     */
    make_bottom_layer(parent) {
        if (this.lower_bottom) {
            this.lower_bottom()
        } else if (parent.set_child_below_sibling) {
            parent.set_child_below_sibling(this, null);
        } else {
            // Don't throw anything here, it may cause unstabilities
            logError("No method found for making preview the bottom layer");
        }
    }

    addEffect(effect_class, constructor_argument, name, parameter_name, from_param_value, param_value, duration) {
        duration = 0.99 * 1000.0 * duration;
        let effect_name = name + "-effect";
        let add_transition_name = effect_name + "-add";
        let remove_transition_name = effect_name + "-remove";
        let property_transition_name = `@effects.${effect_name}.${parameter_name}`;
        if (this.get_transition(remove_transition_name) !== null) {
            this.remove_transition(remove_transition_name);
            let transition = Clutter.PropertyTransition.new(property_transition_name);
            transition.progress_mode = Clutter.AnimationMode.LINEAR;
            transition.duration = duration;
            transition.remove_on_complete = true;
            transition.set_from(this.get_effect(effect_name)[parameter_name]);
            transition.set_to(param_value);
            this.get_effect(effect_name)[parameter_name] = 1.0;
            this.add_transition(add_transition_name, transition);
        } else if (this._effectCounts[name] == 0) {
            if (this.get_transition(add_transition_name) === null) {
                let transition = Clutter.PropertyTransition.new(property_transition_name);
                transition.progress_mode = Clutter.AnimationMode.EASE_IN_OUT_QUINT;
                transition.duration = duration;
                transition.remove_on_complete = true;
                transition.set_to(param_value);
                transition.set_from(from_param_value);
                this._newFrameCount = 0;
                this.add_effect_with_name(effect_name, new effect_class(constructor_argument));
                this.add_transition(add_transition_name, transition);
                this._effectCounts[name] = 1;
            }
        } else {
            this._effectCounts[name] += 1;
        }
    }

    removeEffect(name, parameter_name, value, duration) {
        duration = 0.99 * 1000.0 * duration;
        let effect_name = name + "-effect";
        let add_transition_name = effect_name + "-add";
        let remove_transition_name = effect_name + "-remove";
        let property_transition_name = `@effects.${effect_name}.${parameter_name}`;
        if (this._effectCounts[name] > 0) {
            if (this._effectCounts[name] == 1) {
                this.remove_transition(add_transition_name);
                if (this.get_transition(remove_transition_name) === null) {
                    let transition = Clutter.PropertyTransition.new(property_transition_name);
                    transition.progress_mode = Clutter.AnimationMode.LINEAR;
                    transition.duration = duration;
                    transition.remove_on_complete = true;
                    transition.set_from(this.get_effect(effect_name)[parameter_name]);
                    transition.set_to(value);
                    this.get_effect(effect_name)[parameter_name] = 1.0;
                    this.add_transition(remove_transition_name, transition);
                    transition.connect("completed", (trans) => {
                        this.remove_effect_by_name(effect_name);
                        this._effectCounts[name] = 0;
                    });
                }
            } else {
                this._effectCounts[name] -= 1;
            }
        }
    }

    _pulse_highlight() {
        if (this._highlight == null) return;
        this._highlight.ease({
            opacity: 255,
            duration: 2000,
            mode: Clutter.AnimationMode.EASE_IN_OUT_QUINT,
            onComplete: () => {
                this._highlight.ease({
                    opacity: 80,
                    duration: 1400,
                    mode: Clutter.AnimationMode.EASE_IN_OUT_QUINT,
                    onComplete: () => {
                        this._pulse_highlight();
                    },
                });
            },
        });
    }

    remove_highlight() {
        if (this._highlight != null) {
            this._highlight.ease({
                opacity: 0,
                duration: 300,
                mode: Clutter.AnimationMode.EASE_IN_OUT_QUINT,
                onComplete: () => {
                    this._highlight.destroy()
                    this._highlight = null;
                },
            });
        }
        if (this._flash != null) {
            this._flash.destroy();
            this._flash = null;
        }
    }

    _getHighlightStyle(alpha) {
        let bgcolor = this.switcher._getSwitcherBackgroundColor();
        let style =`background-color: rgba(${bgcolor.red}, ${bgcolor.green}, ${bgcolor.blue}, ${alpha})`;
        return style;
    }

    vfunc_enter_event(crossingEvent) {
        if (this.switcher._animatingClosed || this._entered == true) {
            return Clutter.EVENT_PROPAGATE;
        } 
        this._entered = true;
        if (this.switcher._settings.raise_mouse_over) {
            this.make_top_layer(this.switcher.previewActor);
            this.switcher._raiseIcons();
        }
        if (this.switcher._settings.highlight_mouse_over) {
            let window_actor = this.metaWin.get_compositor_private();
            if (this._highlight == null) {
                    this._highlight = new St.Bin({
                    opacity: 0,
                    width: this.width,
                    height: this.height,
                    x: 0,
                    y: 0,
                    reactive: false,
                });
                this._highlight.set_style(this._getHighlightStyle(0.3));
                let constraint = Clutter.BindConstraint.new(window_actor, Clutter.BindCoordinate.SIZE, 0);
                this._highlight.add_constraint(constraint);
                window_actor.add_actor(this._highlight);

            }
            if (this._flash == null) {
                this._flash = new St.Bin({
                    width: 1,
                    height: 1,
                    opacity: 255,
                    reactive: false,
                    x: 0,
                    y: 0,
                });
                this._flash.set_style(this._getHighlightStyle(1));
                let constraint = Clutter.BindConstraint.new(window_actor, Clutter.BindCoordinate.SIZE, 0);
                this._flash.add_constraint(constraint);
                window_actor.add_actor(this._flash);
                this._flash.ease({
                    opacity: 0,
                    duration: 500,
                    mode: Clutter.AnimationMode.EASE_OUT_QUINT,
                    onComplete: () => {
                        this._pulse_highlight();
                    }
                });
            }
        }
        return Clutter.EVENT_PROPAGATE;
    }

    vfunc_leave_event(crossingEvent) {
        this.remove_highlight();
        this._entered = false;
        if (this.switcher._settings.raise_mouse_over && !this.switcher._animatingClosed) this.switcher._updatePreviews(true, 0);
        return Clutter.EVENT_PROPAGATE;
    }

    /**
     * Gets the pivot point relative to the preview.
     *
     * @param {Placement} placement
     * @return {Graphene.Point}
     */
    get_pivot_point_placement(placement) {
        let xFraction = 0,
            yFraction = 0;

        // Set xFraction
        switch (placement) {
            case Placement.TOP_LEFT:
            case Placement.LEFT:
            case Placement.BOTTOM_LEFT:
                xFraction = 0;
                break;

            case Placement.TOP:
            case Placement.CENTER:
            case Placement.BOTTOM:
                xFraction = 0.5;
                break;

            case Placement.TOP_RIGHT:
            case Placement.RIGHT:
            case Placement.BOTTOM_RIGHT:
                xFraction = 1;
                break;

            default:
                throw new Error("Unknown placement given");
        }

        // Set yFraction
        switch (placement) {
            case Placement.TOP_LEFT:
            case Placement.TOP:
            case Placement.TOP_RIGHT:
                yFraction = 0;
                break;

            case Placement.LEFT:
            case Placement.CENTER:
            case Placement.RIGHT:
                yFraction = 0.5;
                break;

            case Placement.BOTTOM_LEFT:
            case Placement.BOTTOM:
            case Placement.BOTTOM_RIGHT:
                yFraction = 1;
                break;

            default:
                throw new Error("Unknown placement given");
        }
        return new Graphene.Point({ x: xFraction, y: yFraction });
    }

   /**
     * Sets the pivot point placement, relative to the preview.
     *
     * @param {Placement} placement
     * @return {void}
     */
    set_pivot_point_placement(placement) {
        let point = this.get_pivot_point_placement(placement);
        this.set_pivot_point(point.x, point.y);
    }
});

export function findUpperLeftFromCenter(sideSize, position) {
    return position - sideSize / 2;
}
