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

const {
    Clutter,
    GObject,
    Graphene,
    St,
} = imports.gi;

const Lightbox = imports.ui.lightbox;
const Main = imports.ui.main;

/**
 * Direction and Placement properties values are set to be compatible with deprecated
 * Clutter.Gravity.
 */

var Direction = class Direction {}
Direction.TO_RIGHT = 3;
Direction.TO_LEFT = 7;

var Placement = class Placement {}
Placement.TOP = 1;
Placement.TOP_RIGHT = 2;
Placement.RIGHT = 3;
Placement.BOTTOM_RIGHT = 4;
Placement.BOTTOM = 5;
Placement.BOTTOM_LEFT = 6;
Placement.LEFT = 7;
Placement.TOP_LEFT = 8;
Placement.CENTER = 9;


var Preview = GObject.registerClass({
    GTypeName: "Preview"
}, class Preview extends Clutter.Clone {
    _init(window, ...args) {
        super._init(...args);
        this.metaWin = window;
        this._highlight = null;
        this._flash = null;
        this._entered = false;
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

    vfunc_enter_event(crossingEvent) {
        if (this.switcher._destroying || this._entered == true) return Clutter.EVENT_PROPAGATE;
        this._entered = true;
        if (this.switcher._settings.raise_mouse_over) {
            this.make_top_layer(this.switcher.previewActor);
            this.switcher._raiseIcons();
        }
        if (this.switcher._settings.highlight_mouse_over) {
            let window_actor = this.metaWin.get_compositor_private();
            if (this._highlight == null) {
                    this._highlight = new St.Bin({
                    style_class: 'highlight',
                    opacity: 0,
                    width: this.width,
                    height: this.height,
                    x: 0,
                    y: 0,
                    reactive: false,
                });
                this._highlight.set_style('background-color: rgba(255, 255, 255, 0.3);');
                let constraint = Clutter.BindConstraint.new(window_actor, Clutter.BindCoordinate.SIZE, 0);
                this._highlight.add_constraint(constraint);
                window_actor.add_actor(this._highlight);

            }
            if (this._flash == null) {
                this._flash = new St.Bin({
                    style_class: 'flashspot',
                    width: 1,
                    height: 1,
                    opacity: 255,
                    reactive: false,
                    x: 0,
                    y: 0,
                });
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
        if (crossingEvent.source == null) return Clutter.EVENT_PROPAGATE;
        this.remove_highlight();
        this._entered = false;
        if (this.switcher._settings.raise_mouse_over && !this.switcher._destroying) this.switcher._updatePreviews(true, 0);
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

function findUpperLeftFromCenter(sideSize, position) {
    return position - sideSize / 2;
}
