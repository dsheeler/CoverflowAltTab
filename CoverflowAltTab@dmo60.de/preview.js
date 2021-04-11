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
} = imports.gi;


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
    _init(...args) {
        super._init(...args);
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

    /**
     * Sets the pivot point placement, relative to the preview.
     *
     * @param {Placement} placement
     * @return {void}
     */
    set_pivot_point_placement(placement) {
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

        this.set_pivot_point(xFraction, yFraction);
    }
});

function findUpperLeftFromCenter(sideSize, position) {
    return position - sideSize / 2;
}
