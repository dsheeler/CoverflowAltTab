/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

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

/*
 * Gnome Shell extension specific routines.
 *
 * Create the correct manager and enable/disable it.
 */

const ExtensionImports = imports.misc.extensionUtils.getCurrentExtension().imports;

const Manager = ExtensionImports.manager;
const Platform = ExtensionImports.platform;
const Keybinder = ExtensionImports.keybinder;

let manager = null;

function init() {
}

function enable() {
    if (!manager) {
        /*
         * As there are restricted Gnome versions the current extension support (that
         * are specified in metadata.json file), only the API related to those supported
         * versions must be used, not anything else. As a result, performing checks for
         * keeping backward-compatiblity with old unsupported versions is a wrong
         * decision.
         *
         * To support older versions of Gnome, first, add the version to the metadata
         * file, then, if needed, include backward-compatible API here for each
         * version.
         */
        manager = new Manager.Manager(
            new Platform.PlatformGnomeShell(),
            new Keybinder.Keybinder330Api()
        );
    }

    manager.enable();
}

function disable() {
    if (manager) {
        manager.disable();
    }
}
