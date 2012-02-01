/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

/* 
 * Gnome-shell extension specific routines.
 *
 * register/unregister keybinding handlers, etc.
 */

const Lang = imports.lang;
const Main = imports.ui.main;

const CoverflowAltTab = imports.ui.extensionSystem.extensions["CoverflowAltTab@dmo60.de"];
const Manager = CoverflowAltTab.manager;

let manager = null;

function init() {
}

function enable() {
	if (!manager) {
		manager = new Manager.Manager();
	}

	Main.wm.setKeybindingHandler('switch_windows', Lang.bind(manager, manager._startWindowSwitcher));
	Main.wm.setKeybindingHandler('switch_group', Lang.bind(manager, manager._startWindowSwitcher));
	Main.wm.setKeybindingHandler('switch_panels', Lang.bind(manager, manager._startWindowSwitcher));
	Main.wm.setKeybindingHandler('switch_windows_backward', Lang.bind(manager, manager._startWindowSwitcher));
	Main.wm.setKeybindingHandler('switch_group_backward', Lang.bind(manager, manager._startWindowSwitcher));
}

function disable() {
	if (manager) {
		manager = null;
	}

	Main.wm.setKeybindingHandler('switch_windows', Lang.bind(Main.wm, Main.wm._startAppSwitcher));
	Main.wm.setKeybindingHandler('switch_group', Lang.bind(Main.wm, Main.wm._startAppSwitcher));
	Main.wm.setKeybindingHandler('switch_panels', Lang.bind(Main.wm, Main.wm._startA11ySwitcher));
	Main.wm.setKeybindingHandler('switch_windows_backward', Lang.bind(Main.wm, Main.wm._startAppSwitcher));
	Main.wm.setKeybindingHandler('switch_group_backward', Lang.bind(Main.wm, Main.wm._startAppSwitcher));
}
