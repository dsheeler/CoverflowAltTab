/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

/*
 * Cinnamon/Gnome-Shell extension specific routines.
 *
 * Create the correct manager and enable/disable it.
 */

const Config = imports.misc.config;

const PACKAGE_NAME = Config.PACKAGE_NAME;
const PACKAGE_VERSION = Config.PACKAGE_VERSION.split('.');
for(let i=0; i<PACKAGE_VERSION; i++)
    PACKAGE_VERSION[i] = parseInt(PACKAGE_VERSION[i]);

let ExtensionImports;

let HAS_META_KEYBIND_API;
if(PACKAGE_NAME == 'cinnamon') {
    HAS_META_KEYBIND_API = !(PACKAGE_VERSION[0] <= 1 && PACKAGE_VERSION[1] <= 4);
    ExtensionImports = imports.ui.extensionSystem.extensions["CoverflowAltTab@dmo60.de"];
}
else {
    // fixme: shell version number ?
    HAS_META_KEYBIND_API = !(PACKAGE_VERSION[0] <= 0 && PACKAGE_VERSION[1] <= 0);

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
        let platform = PACKAGE_NAME == 'cinnamon' ? new Platform.PlatformCinnamon() : new Platform.PlatformGnomeShell();
        let keybinder = HAS_META_KEYBIND_API ? new Keybinder.KeybinderNewApi() : new Keybinder.KeybinderOldApi();
        manager = new Manager.Manager(platform, keybinder);
    }
    manager.enable();
}

function disable() {
    if (manager) {
        manager.disable();
    }
}
