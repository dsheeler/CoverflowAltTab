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

/* CoverflowAltTab::Platform
 *
 * These are helper classes to handle gnome-shell / cinnamon differences.
 */

const Lang = imports.lang;
const St = imports.gi.St;
const Gio = imports.gi.Gio;
const Config = imports.misc.config;
const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const Clutter = imports.gi.Clutter;

let Tweener = null;
if (Config.PACKAGE_NAME == 'cinnamon' || Config.PACKAGE_VERSION <= "3.37") {
    Tweener = imports.ui.tweener;
}

let ExtensionImports;
if (Config.PACKAGE_NAME === "cinnamon") {
    ExtensionImports = imports.ui.extensionSystem.extensions["CoverflowAltTab@dmo60.de"];
} else {
    ExtensionImports = imports.misc.extensionUtils.getCurrentExtension().imports;
}

const {__ABSTRACT_METHOD__} = ExtensionImports.lib;

const {Switcher} = ExtensionImports.switcher;
const {CoverflowSwitcher} = ExtensionImports.coverflowSwitcher;
const {TimelineSwitcher} = ExtensionImports.timelineSwitcher;

const POSITION_TOP = 1;
const POSITION_BOTTOM = 7;
const SHELL_SCHEMA = "org.gnome.shell.extensions.coverflowalttab";
const TRANSITION_TYPE = 'easeOutQuad';

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

class AbstractPlatform {
    enable() { __ABSTRACT_METHOD__(this, this.enable) }
    disable() { __ABSTRACT_METHOD__(this, this.disable) }

    getWidgetClass() { __ABSTRACT_METHOD__(this, this.getWidgetClass) }
    getWindowTracker() { __ABSTRACT_METHOD__(this, this.getWindowTracker) }

    getSettings() { __ABSTRACT_METHOD__(this, this.getSettings) }

    getDefaultSettings() {
        return {
            animation_time: 0.25,
            dim_factor: 0.4,
            title_position: POSITION_BOTTOM,
            icon_style: 'Classic',
            offset: 0,
            hide_panel: true,
            enforce_primary_monitor: true,
            switcher_class: Switcher,
            elastic_mode: false,
            current_workspace_only: '1',
        };
    }

    getPrimaryModifier(mask) {
    	return imports.ui.altTab.primaryModifier(mask);
    }

    initBackground() {
    	this._background = Meta.BackgroundActor.new_for_screen(global.screen);
		this._background.hide();
        global.overlay_group.add_actor(this._background);
    }

    dimBackground() {
    	this._background.show();
        this.tween(this._background, {
            dim_factor: this._settings.dim_factor,
            time: this._settings.animation_time,
            transition: TRANSITION_TYPE
        });
    }

    undimBackground(onCompleteBind) {
    	this.removeTweens(this._background);
        this.tween(this._background, {
            dim_factor: 1.0,
            time: this._settings.animation_time,
            transition: TRANSITION_TYPE,
            onComplete: onCompleteBind,
        });
    }

    removeBackground() {
    	global.overlay_group.remove_actor(this._background);
    }

    tween(actor, params) {
        throw new Error("Abstract method tween not implemented");
    }

    removeTweens(actor) {
        throw new Error("Abstract method removeTweens not implemented");
    }
}

class PlatformCinnamon extends AbstractPlatform {
    constructor(...args) {
        super(...args);

        this._settings = null;
        this._configMonitor = null;
        this._configConnection = null;

        let ExtensionMeta = imports.ui.extensionSystem.extensions["CoverflowAltTab@dmo60.de"];
        let ExtensionDir = imports.ui.extensionSystem.extensionMeta["CoverflowAltTab@dmo60.de"].path;
        this._configFile = ExtensionDir + '/config.js';
    }

    enable() {
        this.disable();

        // watch for file changes
        let file = Gio.file_new_for_path(this._configFile);
        this._configMonitor = file.monitor(Gio.FileMonitorFlags.NONE, null);
        this._configConnection = this._configMonitor.connect('changed', Lang.bind(this, this._onConfigUpdate));
    }

    disable() {
        if(this._configMonitor) {
            this._configMonitor.disconnect(this._configConnection);
            this._configMonitor.cancel();
            this._configMonitor = null;
            this._configConnection = null;
        }
    }

    getWidgetClass() {
        return St.Group;
    }

    getWindowTracker() {
        return imports.gi.Cinnamon.WindowTracker.get_default();
    }

    getSettings() {
        if (!this._settings) {
            this._settings = this._loadSettings();
        }
        return this._settings;
    }

    _onConfigUpdate() {
        this._settings = null;
    }

    _convertConfigToSettings(config) {
        return {
            animation_time: Math.max(config.animation_time, 0),
            dim_factor: clamp(config.dim_factor, 0, 1),
            title_position: (config.title_position == 'Top' ? POSITION_TOP : POSITION_BOTTOM),
            icon_style: (config.icon_style == 'Overlay' ? 'Overlay' : 'Classic'),
            offset: config.offset,
            hide_panel: config.hide_panel === true,
            enforce_primary_monitor: config.enforce_primary_monitor === true,
            elastic_mode: config.elastic_mode === true,
            switcher_class: config.switcher_style == 'Timeline' ? TimelineSwitcher :
                CoverflowSwitcher,
            current_workspace_only: config.current_workspace_only
        };
    }

    _loadSettings() {
        try {
            let file = Gio.file_new_for_path(this._configFile);
            if(file.query_exists(null)) {
                let [flag, data] = file.load_contents(null);
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

    tween(actor, params) {
        Tweener.addTween(actor, params);
    }

    removeTweens(actor) {
        Tweener.removeTweens(actor);
    }
};

class PlatformCinnamon18 extends AbstractPlatform {
    constructor(...args) {
        super(...args);

        this._settings = this.getDefaultSettings();
        this._settings.updateSwitcherStyle = () => {
            this.switcher_class = this.switcher_style == 'Timeline' ? TimelineSwitcher :
                CoverflowSwitcher;
        };
        this._settings.updateTitlePosition = () => {
            this.title_position = this.titlePosition == 'Top' ? POSITION_TOP : POSITION_BOTTOM;
        };


        let Settings = imports.ui.settings;

        // Init settings
        let extSettings = new Settings.ExtensionSettings(this._settings, "CoverflowAltTab@dmo60.de");
        function noop() {}
        extSettings.bindProperty(Settings.BindingDirection.ONE_WAY, "animation-time", "animation_time", noop);
        extSettings.bindProperty(Settings.BindingDirection.ONE_WAY, "dim-factor", "dim_factor", noop);
        extSettings.bindProperty(Settings.BindingDirection.ONE_WAY, "title-position", "titlePosition", this._settings.updateTitlePosition);
        extSettings.bindProperty(Settings.BindingDirection.ONE_WAY, "icon-style", "icon_style", noop);
        extSettings.bindProperty(Settings.BindingDirection.ONE_WAY, "offset", "offset", noop);
        extSettings.bindProperty(Settings.BindingDirection.ONE_WAY, "hide-panel", "hide_panel", noop);
        extSettings.bindProperty(Settings.BindingDirection.ONE_WAY, "enforce-primary-monitor", "enforce_primary_monitor", noop);
        extSettings.bindProperty(Settings.BindingDirection.ONE_WAY, "elastic-mode", "elastic_mode", noop);
        extSettings.bindProperty(Settings.BindingDirection.ONE_WAY, "switcher-style", "switcher_style", this._settings.updateSwitcherStyle);
        extSettings.bindProperty(Settings.BindingDirection.ONE_WAY, "current-workspace-only", "current_workspace_only", noop);

        this._settings.updateSwitcherStyle();
        this._settings.updateTitlePosition();
    }

    // Prevent from throwing exceptions on calling these methods
    enable() {}
    disable() {}

    getWidgetClass() {
        return St.Group;
    }

    getWindowTracker() {
        return imports.gi.Cinnamon.WindowTracker.get_default();
    }

    getSettings() {
        return this._settings;
    }

    getPrimaryModifier(mask) {
    	return imports.ui.appSwitcher.appSwitcher.primaryModifier(mask);
    }

    tween(actor, params) {
        Tweener.addTween(actor, params);
    }

    removeTweens(actor) {
        Tweener.removeTweens(actor);
    }

}


class PlatformGnomeShell extends AbstractPlatform {
    constructor(...args) {
        super(...args);

        this._settings = null;
        this._connections = null;
        this._gioSettings = null;
    }

    enable() {
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
            "enforce-primary-monitor",
            "elastic-mode",
            "current-workspace-only",
        ];

        this._connections = [];
        let bind = Lang.bind(this, this._onSettingsChaned);
        for (let key of keys) {
            this._connections.push(this._gioSettings.connect('changed::' + key, bind));
        }
        this._settings = this._loadSettings();
    }

    disable() {
        if(this._connections) {
            for (let connection of this._connections) {
                this._gioSettings.disconnect(connection);
            }
            this._connections = null;
        }
        this._settings = null;
    }

    getWidgetClass() {
        return St.Widget;
    }

    getWindowTracker() {
        return imports.gi.Shell.WindowTracker.get_default();
    }

    getSettings() {
        if (!this._settings) {
            this._settings = this._loadSettings();
        }
        return this._settings;
    }

    _onSettingsChaned() {
        this._settings = null;
    }

    _loadSettings() {
        try {
            let settings = this._gioSettings;
            return {
                animation_time: Math.max(settings.get_int("animation-time") / 1000, 0),
                dim_factor: clamp(settings.get_int("dim-factor") / 10, 0, 1),
                title_position: (settings.get_string("position") == 'Top' ? POSITION_TOP : POSITION_BOTTOM),
                icon_style: (settings.get_string("icon-style") == 'Overlay' ? 'Overlay' : 'Classic'),
                offset: settings.get_int("offset"),
                hide_panel: settings.get_boolean("hide-panel"),
                enforce_primary_monitor: settings.get_boolean("enforce-primary-monitor"),
                elastic_mode: settings.get_boolean("elastic-mode"),
                switcher_class: settings.get_string("switcher-style") === 'Timeline'
                    ? TimelineSwitcher : CoverflowSwitcher,
                current_workspace_only: settings.get_string("current-workspace-only")
            };
        } catch(e) {
            global.log(e);
        }

        return this.getDefaultSettings();
    }

    tween(actor, params) {
        if (Tweener) {
            return Tweener.addTween(actor, params);
        }

        if (params.transition == "easeOutCubic") {
            params.mode = Clutter.AnimationMode.EASE_OUT_CUBIC;
        } else {
            params.mode = Clutter.AnimationMode.EASE_OUT_QUAD;
        }

        if (params.onComplete) {
            if (params.onCompleteParams && params.onCompleteScope) {
                params.onComplete = params.onComplete.bind(params.onCompleteScope, ...params.onCompleteParams);
            } else if (params.onCompleteParams) {
                params.onComplete = params.onComplete.bind(null, params.onCompleteParams);
            } else if (params.onCompleteScope) {
                params.onComplete = params.onComplete.bind(params.onCompleteScope);
            }
        }

        params.duration = params.time * 1000;
        actor.ease(params);
    }

    removeTweens(actor) {
        if (Tweener) {
            return Tweener.removeTweens(actor);
        }

        actor.remove_all_transitions();
    }

}

class PlatformGnomeShell314 extends PlatformGnomeShell {
    getPrimaryModifier(mask) {
	    	return imports.ui.switcherPopup.primaryModifier(mask);
	        }

    initBackground() {
	    	let Background = imports.ui.background;

	    	this._backgroundGroup = new Meta.BackgroundGroup();
        Main.layoutManager.uiGroup.add_child(this._backgroundGroup);
	    	if (this._backgroundGroup.lower_bottom) {
	    	        this._backgroundGroup.lower_bottom();
                } else {
	    	        Main.uiGroup.set_child_below_sibling(this._backgroundGroup, null);
                }
        this._backgroundGroup.hide();
        for (let i = 0; i < Main.layoutManager.monitors.length; i++) {
            new Background.BackgroundManager({
                container: this._backgroundGroup,
                                               monitorIndex: i,
                vignette: true
            });
        }
    }

    dimBackground() {
	    	this._backgroundGroup.show();
        let backgrounds = this._backgroundGroup.get_children();
        for (let background of backgrounds) {
            this.tween(background, {
                               brightness: 0.8,
                               vignette_sharpness: 1 - this.getSettings().dim_factor,
                               time: this.getSettings().animation_time,
                               transition: TRANSITION_TYPE
                             });
        }
    }

    undimBackground(onCompleteBind) {
        let backgrounds = this._backgroundGroup.get_children();
        for (let background of backgrounds) {
            this.tween(background, {
                               brightness: 1.0,
                               vignette_sharpness: 0.0,
                               time: this.getSettings().animation_time,
                               transition: TRANSITION_TYPE,
                               onComplete: onCompleteBind
                             });
        }
    }

    removeBackground() {
	    	Main.layoutManager.uiGroup.remove_child(this._backgroundGroup);
	}
}
