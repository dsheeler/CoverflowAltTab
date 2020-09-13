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

const Clutter = imports.gi.Clutter;
const GObject = imports.gi.GObject;


class Direction {}
Direction.TO_RIGHT = 3;
Direction.TO_LEFT = 7;


var Preview = GObject.registerClass({
    GTypeName: "Preview"
}, class Preview extends Clutter.Clone
{
    _init(...args)
    {
        super._init(...args);
    }

    make_top_layer(parent)
    {
        if (this.raise_top) {
            this.raise_top()
        } else if (parent.set_child_above_sibling) {
            parent.set_child_above_sibling(this, null);
        } else {
            // Don't throw anything here, it may cause unstabilities
            logError("No method found for making preview the top layer");
        }
    }

    make_bottom_layer(parent)
    {
        if (this.lower_bottom) {
            this.lower_bottom()
        } else if (parent.set_child_below_sibling) {
            parent.set_child_below_sibling(this, null);
        } else {
            // Don't throw anything here, it may cause unstabilities
            logError("No method found for making preview the bottom layer");
        }
    }
});
