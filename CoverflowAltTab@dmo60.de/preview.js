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


class Placement {}
Placement.RIGHT = 3;
Placement.LEFT = 7;
Placement.CENTER = 9;

class Orientation {}
Orientation.TO_RIGHT = 3;
Orientation.TO_LEFT = 7;


var Preview = GObject.registerClass({
    GTypeName: "Preview"
}, class Preview extends Clutter.Clone
{
    _init(...args)
    {
        super._init(...args);
    }
});
