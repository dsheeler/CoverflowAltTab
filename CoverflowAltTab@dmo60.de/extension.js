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
 * Cinnamon/Gnome-Shell extension specific routines.
 *
 * Create the correct manager and enable/disable it.
 */

const Config = imports.misc.config;

const PACKAGE_NAME = Config.PACKAGE_NAME;
const PACKAGE_VERSION = Config.PACKAGE_VERSION;

let ExtensionImports;
if (PACKAGE_NAME === "cinnamon") {
    ExtensionImports = imports.ui.extensionSystem.extensions["CoverflowAltTab@dmo60.de"];
} else {
    ExtensionImports = imports.misc.extensionUtils.getCurrentExtension().imports;
}

const Manager = ExtensionImports.manager;
const Platform = ExtensionImports.platform;
const Keybinder = ExtensionImports.keybinder;

let manager = null;

function init() {
}

function enable() {
    if (!manager) {
        let platform, keybinder;

        if (PACKAGE_NAME === "cinnamon") {
            platform =
                PACKAGE_VERSION >= "1.8.0" ? new Platform.PlatformCinnamon18() :
                    new Platform.PlatformCinnamon();
            keybinder =
                PACKAGE_VERSION >= "1.4.0" ? new Keybinder.KeybinderNewApi() :
                    new Keybinder.KeybinderOldApi();
        } else {
            platform =
                PACKAGE_VERSION >= "3.14.0" ? new Platform.PlatformGnomeShell314() :
                PACKAGE_VERSION >= "3.10.0" ? new Platform.PlatformGnomeShell310() :
                PACKAGE_VERSION >= "3.8.0" ? new Platform.PlatformGnomeShell38() :
                    new Platform.PlatformGnomeShell();
            keybinder =
                PACKAGE_VERSION >= "3.30.0" ? new Keybinder.Keybinder330Api() :
                PACKAGE_VERSION >= "3.22.0" ? new Keybinder.Keybinder322Api() :
                PACKAGE_VERSION >= "3.8.0" ? new Keybinder.KeybinderNewGSApi() :
                    new Keybinder.KeybinderNewApi();
        }
        manager = new Manager.Manager(platform, keybinder);
    }
    manager.enable();
}

function disable() {
    if (manager) {
        manager.disable();
    }
}
