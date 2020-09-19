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
 * These are helper classes to handle the different keybinding apis.
 */

const Lang = imports.lang;
const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const Config = imports.misc.config;

let ExtensionImports;
if (Config.PACKAGE_NAME === "cinnamon") {
    ExtensionImports = imports.ui.extensionSystem.extensions["CoverflowAltTab@dmo60.de"];
} else {
    ExtensionImports = imports.misc.extensionUtils.getCurrentExtension().imports;
}

const {
    __ABSTRACT_METHOD__,
} = ExtensionImports.lib;


class AbstractKeybinder {
    enable() { __ABSTRACT_METHOD__(this, this.enable) }
    disable() { __ABSTRACT_METHOD__(this, this.disable) }
}

class Keybinder330Api extends AbstractKeybinder {
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
        Main.wm.setCustomKeybindingHandler('switch-applications', mode.NORMAL, Lang.bind(Main.wm, Main.wm._startSwitcher));
        Main.wm.setCustomKeybindingHandler('switch-windows', mode.NORMAL, Lang.bind(Main.wm, Main.wm._startSwitcher));
        Main.wm.setCustomKeybindingHandler('switch-group', mode.NORMAL, Lang.bind(Main.wm, Main.wm._startSwitcher));
        Main.wm.setCustomKeybindingHandler('switch-panels', mode.NORMAL, Lang.bind(Main.wm, Main.wm._startA11ySwitcher));
        Main.wm.setCustomKeybindingHandler('switch-applications-backward', mode.NORMAL, Lang.bind(Main.wm, Main.wm._startSwitcher));
        Main.wm.setCustomKeybindingHandler('switch-windows-backward', mode.NORMAL, Lang.bind(Main.wm, Main.wm._startSwitcher));
        Main.wm.setCustomKeybindingHandler('switch-group-backward', mode.NORMAL, Lang.bind(Main.wm, Main.wm._startSwitcher));
    }
}

class KeybinderNewApi extends AbstractKeybinder {
    enable(startAppSwitcherBind) {
        Meta.keybindings_set_custom_handler('switch-applications', startAppSwitcherBind);
        Meta.keybindings_set_custom_handler('switch-windows', startAppSwitcherBind);
        Meta.keybindings_set_custom_handler('switch-group', startAppSwitcherBind);
        Meta.keybindings_set_custom_handler('switch-panels', startAppSwitcherBind);
        Meta.keybindings_set_custom_handler('switch-applications-backward', startAppSwitcherBind);
        Meta.keybindings_set_custom_handler('switch-windows-backward', startAppSwitcherBind);
        Meta.keybindings_set_custom_handler('switch-group-backward', startAppSwitcherBind);
    }

    disable() {
        Meta.keybindings_set_custom_handler('switch-applications', Lang.bind(Main.wm, Main.wm._startAppSwitcher));
        Meta.keybindings_set_custom_handler('switch-windows', Lang.bind(Main.wm, Main.wm._startAppSwitcher));
        Meta.keybindings_set_custom_handler('switch-group', Lang.bind(Main.wm, Main.wm._startAppSwitcher));
        Meta.keybindings_set_custom_handler('switch-panels', Lang.bind(Main.wm, Main.wm._startA11ySwitcher));
        Meta.keybindings_set_custom_handler('switch-applications-backward', Lang.bind(Main.wm, Main.wm._startAppSwitcher));
        Meta.keybindings_set_custom_handler('switch-windows-backward', Lang.bind(Main.wm, Main.wm._startAppSwitcher));
        Meta.keybindings_set_custom_handler('switch-group-backward', Lang.bind(Main.wm, Main.wm._startAppSwitcher));
    }
}

class KeybinderOldApi extends AbstractKeybinder {
    enable(startAppSwitcherBind) {
        let wrapperBind = Lang.bind(this, function(wm, binding, mask, window, backwards) {
            let bindingWrapper = {
                get_mask: function() { return mask; },
                get_name: function() { return binding.replace('_', '-'); }
            };
            startAppSwitcherBind(global.display, global.screen, window, bindingWrapper);
        });
        Main.wm.setKeybindingHandler('switch_windows', wrapperBind);
        Main.wm.setKeybindingHandler('switch_group', wrapperBind);
        Main.wm.setKeybindingHandler('switch_panels', wrapperBind);
        Main.wm.setKeybindingHandler('switch_windows_backward', wrapperBind);
        Main.wm.setKeybindingHandler('switch_group_backward', wrapperBind);
    }

    disable() {
        Main.wm.setKeybindingHandler('switch_windows', Lang.bind(Main.wm, Main.wm._startAppSwitcher));
        Main.wm.setKeybindingHandler('switch_group', Lang.bind(Main.wm, Main.wm._startAppSwitcher));
        Main.wm.setKeybindingHandler('switch_panels', Lang.bind(Main.wm, Main.wm._startA11ySwitcher));
        Main.wm.setKeybindingHandler('switch_windows_backward', Lang.bind(Main.wm, Main.wm._startAppSwitcher));
        Main.wm.setKeybindingHandler('switch_group_backward', Lang.bind(Main.wm, Main.wm._startAppSwitcher));
    }
}
