/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

/*
 * Cinnamon extension specific routines.
 *
 * register/unregister keybinding handlers, etc.
 */

const Lang = imports.lang;
const Main = imports.ui.main;
const Config = imports.misc.config;
const Meta = imports.gi.Meta;
const Cinnamon = imports.gi.Cinnamon;
const St = imports.gi.St;
const Gio = imports.gi.Gio;

const ExtensionImports = imports.ui.extensionSystem.extensions["CoverflowAltTab@dmo60.de"];

const ExtensionMeta = imports.ui.extensionSystem.extensions["CoverflowAltTab@dmo60.de"];
const ExtensionDir = imports.ui.extensionSystem.extensionMeta["CoverflowAltTab@dmo60.de"].path;
const ConfigFile = ExtensionDir + '/config.js';

const PACKAGE_VERSION = Config.PACKAGE_VERSION.split('.');
for(let i=0; i<PACKAGE_VERSION; i++)
    PACKAGE_VERSION[i] = parseInt(PACKAGE_VERSION[i]);

const HAS_META_KEYBIND_API = !(PACKAGE_VERSION[0] <= 1 && PACKAGE_VERSION[1] <= 4);

const POSITION_TOP = 1;
const POSITION_BOTTOM = 7;

let settings = null;

function activateSelectedWindow(win) {
    Main.activateWindow(win, global.get_current_time());
}

function removeSelectedWindow(win) {
    win.delete(global.get_current_time());
}

function sortWindowsByUserTime(win1, win2) {
    let t1 = win1.get_user_time();
    let t2 = win2.get_user_time();
    return (t2 > t1) ? 1 : -1 ;
}

function matchSkipTaskbar(win) {
    return !win.is_skip_taskbar();
}

function matchWmClass(win) {
    return win.get_wm_class() == this && !win.is_skip_taskbar();
}

function matchWorkspace(win) {
    return win.get_workspace() == this && !win.is_skip_taskbar();
}

function startWindowSwitcher(display, screen, window, binding) {			
    let windows = [];
    let currentWorkspace = screen.get_active_workspace();

    // Construct a list with all windows
    let windowActors = global.get_window_actors();
    for (i in windowActors)
        windows.push(windowActors[i].get_meta_window());
    
    windowActors = null;

    switch(binding.get_name()) {
        case 'switch-panels':
            // Switch between windows of all workspaces
            windows = windows.filter( matchSkipTaskbar );
            break;
        case 'switch-group':
            // Switch between windows of same application from all workspaces
            let focused = display.focus_window ? display.focus_window : windows[0];
            windows = windows.filter( matchWmClass, focused.get_wm_class() );
            break;
        default:
            // Switch between windows of current workspace
            windows = windows.filter( matchWorkspace, currentWorkspace );
            break;
    }
    
    // Sort by user time
    windows.sort(sortWindowsByUserTime);

    if (windows.length) {
        let actions = {
            'activate_selected': activateSelectedWindow,
            'remove_selected': removeSelectedWindow
        };

        let mask = binding.get_mask();
        let currentIndex = windows.indexOf(display.focus_window);
        
        if(settings == null)
            settings = loadSettings();
        
        let tracker = Cinnamon.WindowTracker.get_default();
        let switcher = new settings.switcher_class(windows, tracker, actions, mask, currentIndex, settings);
    }
}

function startWindowSwitcherOldApi(shellwm, binding, mask, window, backwards) {
    let bindingWrapper = {
        get_mask: function() { return mask; },
        get_name: function() { return binding.replace('_', '-'); }
    };
    startWindowSwitcher(global.display, global.screen, window, bindingWrapper);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function convertConfigToSettings(config) {
    return {
        animation_time: Math.max(config.animation_time, 0),
        dim_factor: clamp(config.dim_factor, 0, 1),
        preview_scale: clamp(config.dim_factor, 0, 1),
        title_position: (config.title_position == 'Top' ? POSITION_TOP : POSITION_BOTTOM),
        icon_style: (config.icon_style == 'Overlay' ? 'Overlay' : 'Classic'),
        icon_size: Math.max(config.icon_size, 0),
        icon_size_big: Math.max(config.icon_size_big, 0),
        icon_title_spacing: config.icon_title_spacing,
        offset: config.offset,
        hide_panel: config.hide_panel === true,
        switcher_class: config.switcher_style == 'Windows 7' ? ExtensionImports.win7switcher.Switcher: ExtensionImports.switcher.Switcher
    };
}
function loadSettings() {
    try {
        let file = Gio.file_new_for_path(ConfigFile);
        if(file.query_exists(null)) {
            [flag, data] = file.load_contents(null);
            if(flag) {
                let isFirstLoad = this.menu == null;

                let settings = eval('(' + data + ')');
                return convertConfigToSettings(settings);
            }
        }
        global.log("Could not load file: " + ConfigFile);
    } catch(e) {
        global.log(e);
    }

    // Return default config
    return {
        animation_time: 0.25,
        dim_factor: 0.4,
        preview_scale: 0.5,
        title_position: POSITION_BOTTOM,
        icon_style: 'Classic',
        icon_size: 64,
        icon_size_big: 128,
        icon_title_spacing: 10,
        offset: 0,
        
        hide_panel: true,
        switcher_class: ExtensionImports.switcher.Switcher
    };
}

function init() {
}

let configMonitor;
let configConnection;

function enable() {
    // watch for file changes
    let file = Gio.file_new_for_path(ConfigFile);
    configMonitor = file.monitor(Gio.FileMonitorFlags.NONE, null);
    configConnection = configMonitor.connect('changed', function() { settings = null; });
    
    if(HAS_META_KEYBIND_API) {
        Meta.keybindings_set_custom_handler('switch-windows', startWindowSwitcher);
        Meta.keybindings_set_custom_handler('switch-group', startWindowSwitcher);
        Meta.keybindings_set_custom_handler('switch-panels', startWindowSwitcher);
        Meta.keybindings_set_custom_handler('switch-windows-backward', startWindowSwitcher);
        Meta.keybindings_set_custom_handler('switch-group-backward', startWindowSwitcher);
    } else {
        Main.wm.setKeybindingHandler('switch_windows', startWindowSwitcherOldApi);
        Main.wm.setKeybindingHandler('switch_group', startWindowSwitcherOldApi);
        Main.wm.setKeybindingHandler('switch_panels', startWindowSwitcherOldApi);
        Main.wm.setKeybindingHandler('switch_windows_backward', startWindowSwitcherOldApi);
        Main.wm.setKeybindingHandler('switch_group_backward', startWindowSwitcherOldApi);
    }
}

function disable() {
    configMonitor.disconnect(configConnection);
    configMonitor.monitor.cancel();
    
    if(HAS_META_KEYBIND_API) {
        Meta.keybindings_set_custom_handler('switch-windows', Lang.bind(Main.wm, Main.wm._startAppSwitcher));
        Meta.keybindings_set_custom_handler('switch-group', Lang.bind(Main.wm, Main.wm._startAppSwitcher));
        Meta.keybindings_set_custom_handler('switch-panels', Lang.bind(Main.wm, Main.wm._startA11ySwitcher));
        Meta.keybindings_set_custom_handler('switch-windows-backward', Lang.bind(Main.wm, Main.wm._startAppSwitcher));
        Meta.keybindings_set_custom_handler('switch-group-backward', Lang.bind(Main.wm, Main.wm._startAppSwitcher));
    } else {
        Main.wm.setKeybindingHandler('switch_windows', Lang.bind(Main.wm, Main.wm._startAppSwitcher));
        Main.wm.setKeybindingHandler('switch_group', Lang.bind(Main.wm, Main.wm._startAppSwitcher));
        Main.wm.setKeybindingHandler('switch_panels', Lang.bind(Main.wm, Main.wm._startA11ySwitcher));
        Main.wm.setKeybindingHandler('switch_windows_backward', Lang.bind(Main.wm, Main.wm._startAppSwitcher));
        Main.wm.setKeybindingHandler('switch_group_backward', Lang.bind(Main.wm, Main.wm._startAppSwitcher));
    }
}
