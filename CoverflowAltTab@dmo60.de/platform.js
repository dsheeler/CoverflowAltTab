/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

/* CoverflowAltTab::Platform
 *
 * These are helper classes to handle gnome-shell / cinnamon differences.
 */

const Lang = imports.lang;
const St = imports.gi.St;
const Gio = imports.gi.Gio;

const ExtensionImports = imports.ui.extensionSystem.extensions["CoverflowAltTab@dmo60.de"];

const ExtensionMeta = imports.ui.extensionSystem.extensions["CoverflowAltTab@dmo60.de"];
const ExtensionDir = imports.ui.extensionSystem.extensionMeta["CoverflowAltTab@dmo60.de"].path;
const ConfigFile = ExtensionDir + '/config.js';

const POSITION_TOP = 1;
const POSITION_BOTTOM = 7;

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
    },
    
    enable: function() {
        // watch for file changes
        let file = Gio.file_new_for_path(ConfigFile);
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
            let file = Gio.file_new_for_path(ConfigFile);
            if(file.query_exists(null)) {
                [flag, data] = file.load_contents(null);
                if(flag) {
                    let config = eval('(' + data + ')');
                    return this._convertConfigToSettings(config);
                }
            }
            global.log("Could not load file: " + ConfigFile);
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
    },
    
    enable: function() {
        // todo: gsettings listener ?
    },
    
    disable: function() {
        // todo: gsettings listener ?
    },
    
    getWidgetClass: function() {
        return St.Widget;
    },
    
    getWindowTracker: function() {
        return imports.gi.Shell.WindowTracker.get_default();
    },
    
    getSettings: function() {
        // todo: get from gsettings
        return this.getDefaultSettings();
    },
};