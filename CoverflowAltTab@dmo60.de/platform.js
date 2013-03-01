/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

/* CoverflowAltTab::Platform
 *
 * These are helper classes to handle gnome-shell / cinnamon differences.
 */

const Lang = imports.lang;
const St = imports.gi.St;
const Gio = imports.gi.Gio;
const Config = imports.misc.config;

let ExtensionImports;
if(Config.PACKAGE_NAME == 'cinnamon')
    ExtensionImports = imports.ui.extensionSystem.extensions["CoverflowAltTab@dmo60.de"];
else
    ExtensionImports = imports.misc.extensionUtils.getCurrentExtension().imports;

const POSITION_TOP = 1;
const POSITION_BOTTOM = 7;
const SHELL_SCHEMA = "org.gnome.shell.extensions.coverflowalttab";

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function AbstractPlatform() {
    this._init();
}

AbstractPlatform.prototype = {
    _init: function() {
    },

    enable: function() {
        throw new Error("Abstract method enable not implemented");
    },

    disable: function() {
        throw new Error("Abstract method disable not implemented");
    },

    getWidgetClass: function() {
        throw new Error("Abstract method getWidgetClass not implemented");
    },

    getWindowTracker: function() {
        throw new Error("Abstract method getWindowTracker not implemented");
    },

    getSettings: function() {
        throw new Error("Abstract method getSettings not implemented");
    },

    getDefaultSettings: function() {
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
}

function PlatformCinnamon() {
    this._init.apply(this, arguments);
}

PlatformCinnamon.prototype = {
    __proto__: AbstractPlatform.prototype,

    _init: function() {
        AbstractPlatform.prototype._init.apply(this, arguments);

        this._settings = null;
        this._configMonitor = null;
        this._configConnection = null;

        let ExtensionMeta = imports.ui.extensionSystem.extensions["CoverflowAltTab@dmo60.de"];
        let ExtensionDir = imports.ui.extensionSystem.extensionMeta["CoverflowAltTab@dmo60.de"].path;
        this._configFile = ExtensionDir + '/config.js';
    },

    enable: function() {
        this.disable();

        // watch for file changes
        let file = Gio.file_new_for_path(this._configFile);
        this._configMonitor = file.monitor(Gio.FileMonitorFlags.NONE, null);
        this._configConnection = this._configMonitor.connect('changed', Lang.bind(this, this._onConfigUpdate));
    },

    disable: function() {
        if(this._configMonitor) {
            this._configMonitor.disconnect(this._configConnection);
            this._configMonitor.monitor.cancel();
            this._configMonitor = null;
            this._configConnection = null;
        }
    },

    getWidgetClass: function() {
        return St.Group;
    },

    getWindowTracker: function() {
        return imports.gi.Cinnamon.WindowTracker.get_default();
    },

    getSettings: function() {
        if(!this._settings)
            this._settings = this._loadSettings();
        return this._settings;
    },

    _onConfigUpdate: function() {
        this._settings = null;
    },

    _convertConfigToSettings: function(config) {
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
    },

    _loadSettings: function() {
        try {
            let file = Gio.file_new_for_path(this._configFile);
            if(file.query_exists(null)) {
                [flag, data] = file.load_contents(null);
                if(flag) {
                    let config = eval('(' + data + ')');
                    return this._convertConfigToSettings(config);
                }
            }
            global.log("Could not load file: " + this._configFile);
        } catch(e) {
            global.log(e);
        }

        return this.getDefaultSettings();
    }
};

function PlatformGnomeShell() {
    this._init.apply(this, arguments);
}

PlatformGnomeShell.prototype = {
    __proto__: AbstractPlatform.prototype,

    _init: function() {
        AbstractPlatform.prototype._init.apply(this, arguments);

        this._settings = null;
        this._connections = null;
        this._gioSettings = null;
    },

    enable: function() {
        this.disable();

        if(this._gioSettings == null)
            this._gioSettings = ExtensionImports.lib.getSettings(SHELL_SCHEMA);

        let keys = [
            "animation-time",
            "dim-factor",
            "position",
            "icon-style",
            "offset",
            "hide-panel",
        ];

        this._connections = [];
        let bind = Lang.bind(this, this._onSettingsChaned);
        keys.forEach(function(key) { this._connections.push(this._gioSettings.connect('changed::' + key, bind)); }, this);
        this._settings = this._loadSettings();
    },

    disable: function() {
        if(this._connections) {
            this._connections.forEach(function(connection) { this._gioSettings.disconnect(connection); }, this);
            this._connections = null;
        }
        this._settings = null;
    },

    getWidgetClass: function() {
        return St.Widget;
    },

    getWindowTracker: function() {
        return imports.gi.Shell.WindowTracker.get_default();
    },

    getSettings: function() {
        if(!this._settings)
            this._settings = this._loadSettings();
        return this._settings;
    },

    _onSettingsChaned: function() {
        this._settings = null;
    },

    _loadSettings: function() {
        try {
            let settings = this._gioSettings;
            return {
                animation_time: Math.max(settings.get_int("animation-time") / 1000, 0),
                dim_factor: clamp(settings.get_int("dim-factor") / 10, 0, 1),
                preview_scale: 0.5,
                title_position: (settings.get_string("position") == 'Top' ? POSITION_TOP : POSITION_BOTTOM),
                icon_style: (settings.get_string("icon-style") == 'Overlay' ? 'Overlay' : 'Classic'),
                icon_size: 64,
                icon_size_big: 128,
                icon_title_spacing: 10,
                offset: settings.get_int("offset"),
                hide_panel: settings.get_boolean("hide-panel"),
                switcher_class: ExtensionImports.switcher.Switcher
            };
        } catch(e) {
            global.log(e);
        }

        return this.getDefaultSettings();
    }
};
