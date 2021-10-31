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

/* CoverflowAltTab::Keybinder
 *
 * Originally, created to be helper classes to handle the different keybinding APIs.
 */

const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const Config = imports.misc.config;

const ExtensionImports = imports.misc.extensionUtils.getCurrentExtension().imports;

const {__ABSTRACT_METHOD__} = ExtensionImports.lib;

class AbstractKeybinder {
    enable() { __ABSTRACT_METHOD__(this, this.enable) }
    disable() { __ABSTRACT_METHOD__(this, this.disable) }
}

var Keybinder330Api = class Keybinder330Api extends AbstractKeybinder {
    enable(startAppSwitcherBind) {
        let Shell = imports.gi.Shell;
        let mode = Shell.ActionMode ? Shell.ActionMode : Shell.KeyBindingMode;
        Main.wm.setCustomKeybindingHandler('switch-applications', mode.NORMAL, startAppSwitcherBind);
        Main.wm.setCustomKeybindingHandler('switch-windows', mode.NORMAL, startAppSwitcherBind);
        Main.wm.setCustomKeybindingHandler('switch-group', mode.NORMAL, startAppSwitcherBind);
        Main.wm.setCustomKeybindingHandler('switch-panels', mode.NORMAL, startAppSwitcherBind);
        Main.wm.setCustomKeybindingHandler('switch-applications-backward', mode.NORMAL, startAppSwitcherBind);
        Main.wm.setCustomKeybindingHandler('switch-windows-backward', mode.NORMAL, startAppSwitcherBind);
        Main.wm.setCustomKeybindingHandler('switch-group-backward', mode.NORMAL, startAppSwitcherBind);
    }

    disable() {
        let Shell = imports.gi.Shell;
        let mode = Shell.ActionMode ? Shell.ActionMode : Shell.KeyBindingMode;
        Main.wm.setCustomKeybindingHandler('switch-applications', mode.NORMAL, Main.wm._startSwitcher.bind(Main.wm));
        Main.wm.setCustomKeybindingHandler('switch-windows', mode.NORMAL, Main.wm._startSwitcher.bind(Main.wm));
        Main.wm.setCustomKeybindingHandler('switch-group', mode.NORMAL, Main.wm._startSwitcher.bind(Main.wm));
        Main.wm.setCustomKeybindingHandler('switch-panels', mode.NORMAL, Main.wm._startA11ySwitcher.bind(Main.wm));
        Main.wm.setCustomKeybindingHandler('switch-applications-backward', mode.NORMAL, Main.wm._startSwitcher.bind(Main.wm));
        Main.wm.setCustomKeybindingHandler('switch-windows-backward', mode.NORMAL, Main.wm._startSwitcher.bind(Main.wm));
        Main.wm.setCustomKeybindingHandler('switch-group-backward', mode.NORMAL, Main.wm._startSwitcher.bind(Main.wm));
    }
}
