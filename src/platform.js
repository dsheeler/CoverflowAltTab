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
 * CoverflowAltTab::Platform
 *
 * Originally, created to be helper classes to handle Gnome Shell and Cinnamon differences.
 */

const St = imports.gi.St;
const Gio = imports.gi.Gio;
const Config = imports.misc.config;
const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const Clutter = imports.gi.Clutter;
const Lightbox = imports.ui.lightbox;

const ExtensionImports = imports.misc.extensionUtils.getCurrentExtension().imports;

const {__ABSTRACT_METHOD__} = ExtensionImports.lib;

const {Switcher} = ExtensionImports.switcher;
const {CoverflowSwitcher} = ExtensionImports.coverflowSwitcher;
const {TimelineSwitcher} = ExtensionImports.timelineSwitcher;

const POSITION_TOP = 1;
const POSITION_BOTTOM = 7;
const SHELL_SCHEMA = "org.gnome.shell.extensions.coverflowalttab";
const DESKTOP_INTERFACE_SCHEMA = 'org.gnome.desktop.interface';
const KEY_TEXT_SCALING_FACTOR = 'text-scaling-factor';

const TRANSITION_TYPE = 'easeOutQuad';

const modes = [
    Clutter.AnimationMode.EASE_IN_BOUNCE,
    Clutter.AnimationMode.EASE_OUT_BOUNCE,
    Clutter.AnimationMode.EASE_IN_OUT_BOUNCE,
    Clutter.AnimationMode.EASE_IN_BACK,
    Clutter.AnimationMode.EASE_OUT_BACK,
    Clutter.AnimationMode.EASE_IN_OUT_BACK,
    Clutter.AnimationMode.EASE_IN_ELASTIC,
    Clutter.AnimationMode.EASE_OUT_ELASTIC,
    Clutter.AnimationMode.EASE_IN_OUT_ELASTIC,
    Clutter.AnimationMode.EASE_IN_QUAD,
    Clutter.AnimationMode.EASE_OUT_QUAD,
    Clutter.AnimationMode.EASE_IN_OUT_QUAD,
    Clutter.AnimationMode.EASE_IN_CUBIC,
    Clutter.AnimationMode.EASE_OUT_CUBIC,
    Clutter.AnimationMode.EASE_IN_OUT_CUBIC,
    Clutter.AnimationMode.EASE_IN_QUART,
    Clutter.AnimationMode.EASE_OUT_QUART,
    Clutter.AnimationMode.EASE_IN_OUT_QUART,
    Clutter.AnimationMode.EASE_IN_QUINT,
    Clutter.AnimationMode.EASE_OUT_QUINT,
    Clutter.AnimationMode.EASE_IN_OUT_QUINT,
    Clutter.AnimationMode.EASE_IN_SINE,
    Clutter.AnimationMode.EASE_OUT_SINE,
    Clutter.AnimationMode.EASE_IN_OUT_SINE,
    Clutter.AnimationMode.EASE_IN_EXPO,
    Clutter.AnimationMode.EASE_OUT_EXPO,
    Clutter.AnimationMode.EASE_IN_OUT_EXPO,
    Clutter.AnimationMode.EASE_IN_CIRC,
    Clutter.AnimationMode.EASE_OUT_CIRC,
    Clutter.AnimationMode.EASE_IN_OUT_CIRC,
    Clutter.AnimationMode.LINEAR
];

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

class AbstractPlatform {
    enable() { __ABSTRACT_METHOD__(this, this.enable) }
    disable() { __ABSTRACT_METHOD__(this, this.disable) }

    getWidgetClass() { __ABSTRACT_METHOD__(this, this.getWidgetClass) }
    getWindowTracker() { __ABSTRACT_METHOD__(this, this.getWindowTracker) }
    getPrimaryModifier(mask) { __ABSTRACT_METHOD__(this, this.getPrimaryModifier) }

    getSettings() { __ABSTRACT_METHOD__(this, this.getSettings) }

    tween(actor, params) { __ABSTRACT_METHOD__(this, this.tween) }
    removeTweens(actor) { __ABSTRACT_METHOD__(this, this.removeTweens) }

    getDefaultSettings() {
        return {
            animation_time: 0.2,
            randomize_animation_times: false,
            dim_factor: 0,
            title_position: POSITION_BOTTOM,
            icon_style: 'Classic',
            icon_has_shadow: false,
            overlay_icon_size: 128,
            overlay_icon_opacity: 1,
            text_scaling_factor: 1,
            offset: 0,
            hide_panel: true,
            enforce_primary_monitor: true,
            switcher_class: Switcher,
            easing_function: 'ease-out-cubic',
            current_workspace_only: '1',
            switch_per_monitor: false,
            preview_to_monitor_ratio: 0.5,
            preview_scaling_factor: 0.75,
            bind_to_switch_applications: true,
            bind_to_switch_windows: true,
            perspective_correction_method: "None",
            highlight_mouse_over: false,
            raise_mouse_over: true,
            blur_sigma: 7,
            desaturation_factor: 0.75,
            switcher_looping_method: 'Flip Stack',
        };
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

    removeBackground() {
    	global.overlay_group.remove_actor(this._background);
    }
}

var PlatformGnomeShell = class PlatformGnomeShell extends AbstractPlatform {
    constructor(...args) {
        super(...args);

        this._settings = null;
        this._connections = null;
        this._extensionSettings = null;
        this._desktopSettings = null;
        this._settings_changed_callbacks = null;
    }

    enable() {
        //this.disable();

        this._settings_changed_callbacks = [];

        if (this._extensionSettings == null)
            this._extensionSettings = ExtensionImports.lib.getSettings(SHELL_SCHEMA);

        if (this._desktopSettings == null)
            this._desktopSettings = new Gio.Settings({ schema_id: DESKTOP_INTERFACE_SCHEMA });

        let keys = [
            "animation-time",
            "randomize-animation-times",
            "dim-factor",
            "position",
            "icon-style",
            "icon-has-shadow",
            "overlay-icon-size",
            "overlay-icon-opacity",
            "offset",
            "hide-panel",
            "enforce-primary-monitor",
            "easing-function",
            "current-workspace-only",
            "switch-per-monitor",
            "switcher-style",
            "preview-to-monitor-ratio",
            "preview-scaling-factor",
            "bind-to-switch-applications",
            "bind-to-switch-windows",
            "perspective-correction-method",
            "highlight-mouse-over",
            "raise-mouse-over",
            "desaturation-factor",
            "blur-sigma",
            "switcher-looping-method",
        ];

        let dkeys = [
            KEY_TEXT_SCALING_FACTOR,
        ];

        this._connections = [];
        for (let key of keys) {
            let bind = this._onSettingsChanged.bind(this, key);
            this._connections.push(this._extensionSettings.connect('changed::' + key, bind));
        }

        this._dconnections = [];
        for (let dkey of dkeys) {
            let bind = this._onSettingsChanged.bind(this, dkey);
            this._dconnections.push(this._desktopSettings.connect('changed::' + dkey, bind));
        }

        this._settings = this._loadSettings();
    }

    disable() {
        if (this._connections) {
            for (let connection of this._connections) {
                this._extensionSettings.disconnect(connection);
            }
            this._connections = null;
        }
        if (this._dconnections) {
            for (let dconnection of this._dconnections) {
                this._desktopSettings.disconnect(dconnection);
            }
        }
        this._settings = null;
    }

    getWidgetClass() {
        return St.Widget;
    }

    getWindowTracker() {
        return imports.gi.Shell.WindowTracker.get_default();
    }

    getPrimaryModifier(mask) {
        return imports.ui.switcherPopup.primaryModifier(mask);
    }

    getSettings() {
        if (!this._settings) {
            this._settings = this._loadSettings();
        }
        return this._settings;
    }

    addSettingsChangedCallback(cb) {
        cb(this._extensionSettings);
        this._settings_changed_callbacks.push(cb);
    }

    _onSettingsChanged(key) {
        this._settings = null;
        for (let cb of this._settings_changed_callbacks) {
            cb(this._extensionSettings, key);
        }
    }


    _loadSettings() {
        try {
            let settings = this._extensionSettings;
            let dsettings = this._desktopSettings;
            return {
                animation_time: settings.get_double("animation-time"),
                randomize_animation_times: settings.get_boolean("randomize-animation-times"),
                dim_factor: clamp(settings.get_double("dim-factor"), 0, 1),
                title_position: (settings.get_string("position") == 'Top' ? POSITION_TOP : POSITION_BOTTOM),
                icon_style: (settings.get_string("icon-style") == 'Overlay' ? 'Overlay' : 'Classic'),
                icon_has_shadow: settings.get_boolean("icon-has-shadow"),
                overlay_icon_size: clamp(settings.get_double("overlay-icon-size"), 0, 1024),
                overlay_icon_opacity: clamp(settings.get_double("overlay-icon-opacity"), 0, 1),
                text_scaling_factor: dsettings.get_double(KEY_TEXT_SCALING_FACTOR),
                offset: settings.get_int("offset"),
                hide_panel: settings.get_boolean("hide-panel"),
                enforce_primary_monitor: settings.get_boolean("enforce-primary-monitor"),
                easing_function: settings.get_string("easing-function"),
                switcher_class: settings.get_string("switcher-style") === 'Timeline'
                    ? TimelineSwitcher : CoverflowSwitcher,
                current_workspace_only: settings.get_string("current-workspace-only"),
                switch_per_monitor: settings.get_boolean("switch-per-monitor"),
                preview_to_monitor_ratio: clamp(settings.get_double("preview-to-monitor-ratio"), 0, 1),
                preview_scaling_factor: clamp(settings.get_double("preview-scaling-factor"), 0, 1),
                bind_to_switch_applications: settings.get_boolean("bind-to-switch-applications"),
                bind_to_switch_windows: settings.get_boolean("bind-to-switch-windows"),
                perspective_correction_method: settings.get_string("perspective-correction-method"),
                highlight_mouse_over: settings.get_boolean("highlight-mouse-over"),
                raise_mouse_over: settings.get_boolean("raise-mouse-over"),
                desaturation_factor: settings.get_double("desaturation-factor"),
                blur_sigma: settings.get_int("blur-sigma"),
                switcher_looping_method: settings.get_string("switcher-looping-method"),
            };
        } catch (e) {
            global.log(e);
        }

        return this.getDefaultSettings();
    }

    tween(actor, params) {
        params.duration = params.time * 1000;
        if (params.transition == 'userChoice' && this.getSettings().easing_function == 'random' ||
            params.transition == 'Random') {
            params.mode = modes[Math.floor(Math.random()*modes.length)];
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-in-bounce" ||
            params.transition == 'easeInBounce') {
            params.mode = Clutter.AnimationMode.EASE_IN_BOUNCE;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-out-bounce" ||
            params.transition == 'easeOutBounce') {
            params.mode = Clutter.AnimationMode.EASE_OUT_BOUNCE;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-in-out-bounce" ||
            params.transition == 'easeInOutBounce') {
            params.mode = Clutter.AnimationMode.EASE_IN_OUT_BOUNCE;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-in-back" ||
            params.transition == 'easeInBack') {
            params.mode = Clutter.AnimationMode.EASE_IN_BACK;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-out-back" ||
            params.transition == 'easeOutBack') {
            params.mode = Clutter.AnimationMode.EASE_OUT_BACK;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-in-out-back" ||
            params.transition == 'easeInOutBack') {
            params.mode = Clutter.AnimationMode.EASE_IN_OUT_BACK;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-in-elastic" ||
            params.transition == 'easeInElastic') {
            params.mode = Clutter.AnimationMode.EASE_IN_ELASTIC;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-out-elastic" ||
            params.transition == 'easeOutElastic') {
            params.mode = Clutter.AnimationMode.EASE_OUT_ELASTIC;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-in-out-elastic" ||
            params.transition == 'easeInOutElastic') {
            params.mode = Clutter.AnimationMode.EASE_IN_OUT_ELASTIC;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-in-quad" ||
            params.transition == 'easeInQuad') {
            params.mode = Clutter.AnimationMode.EASE_IN_QUAD;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-out_quad" ||
            params.transition == 'easeOutQuad') {
            params.mode = Clutter.AnimationMode.EASE_OUT_QUAD;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-in-out-quad" ||
            params.transition == 'easeInOutQuad') {
            params.mode = Clutter.AnimationMode.EASE_IN_OUT_QUAD;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-in-cubic" ||
            params.transition == 'easeInCubic') {
            params.mode = Clutter.AnimationMode.EASE_IN_CUBIC;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-out-cubic" ||
            params.transition == 'easeOutCubic') {
            params.mode = Clutter.AnimationMode.EASE_OUT_CUBIC;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-in-out-cubic" ||
            params.transition == 'easeInOutCubic') {
            params.mode = Clutter.AnimationMode.EASE_IN_OUT_CUBIC;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-in-quart" ||
            params.transition == 'easeInQuart') {
            params.mode = Clutter.AnimationMode.EASE_IN_QUART;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-out-quart" ||
            params.transition == 'easeOutQuart') {
            params.mode = Clutter.AnimationMode.EASE_OUT_QUART;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-in-out-quart" ||
            params.transition == 'easeInOutQuart') {
            params.mode = Clutter.AnimationMode.EASE_IN_OUT_QUART;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-in-quint" ||
            params.transition == 'easeInQuint') {
            params.mode = Clutter.AnimationMode.EASE_IN_QUINT;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-out-quint" ||
            params.transition == 'easeOutQuint') {
            params.mode = Clutter.AnimationMode.EASE_OUT_QUINT;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-in-out-quint" ||
            params.transition == 'easeInOutQuint') {
            params.mode = Clutter.AnimationMode.EASE_IN_OUT_QUINT;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-in-sine" ||
            params.transition == 'easeInSine') {
            params.mode = Clutter.AnimationMode.EASE_IN_SINE;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-out-sine" ||
            params.transition == 'easeOutSine') {
            params.mode = Clutter.AnimationMode.EASE_OUT_SINE;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-in-out-sine" ||
            params.transition == 'easeInOutSine') {
            params.mode = Clutter.AnimationMode.EASE_IN_OUT_SINE;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-in-expo" ||
            params.transition == 'easeInExpo') {
            params.mode = Clutter.AnimationMode.EASE_IN_EXPO;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-out-expo" ||
            params.transition == 'easeOutExpo') {
            params.mode = Clutter.AnimationMode.EASE_OUT_EXPO;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-in-out-expo" ||
            params.transition == 'easeInOutExpo') {
            params.mode = Clutter.AnimationMode.EASE_IN_OUT_EXPO;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-in-circ" ||
            params.transition == 'easeInCirc') {
            params.mode = Clutter.AnimationMode.EASE_IN_CIRC;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-out-circ" ||
            params.transition == 'easeOutCirc') {
            params.mode = Clutter.AnimationMode.EASE_OUT_CIRC;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-in-out-circ" ||
            params.transition == 'easeInOutCirc') {
            params.mode = Clutter.AnimationMode.EASE_IN_OUT_CIRC;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-linear" ||
            params.transition == 'easeLinear') {
            params.mode = Clutter.AnimationMode.LINEAR;
        } else {
            global.log("Could not find Clutter AnimationMode", params.transition, this.getSettings().easing_function);
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

        actor.ease(params);
    }

    removeTweens(actor) {
        actor.remove_all_transitions();
    }

    initBackground() {
        this._vignette_sharpness_backup = Lightbox.VIGNETTE_SHARPNESS;
        this._vignette_brigtness_backup = Lightbox.VIGNETTE_BRIGHTNESS;

        Lightbox.VIGNETTE_SHARPNESS = 1 - this._settings.dim_factor;
        Lightbox.VIGNETTE_BRIGHTNESS = 1;

    	let Background = imports.ui.background;

    	this._backgroundGroup = new Meta.BackgroundGroup();
        Main.layoutManager.uiGroup.add_child(this._backgroundGroup);
    	if (this._backgroundGroup.lower_bottom) {
	        this._backgroundGroup.lower_bottom();
        } else {
	        Main.uiGroup.set_child_below_sibling(this._backgroundGroup, null);
        }
         this._lightbox = new Lightbox.Lightbox(this._backgroundGroup, {
             inhibitEvents: true,
             radialEffect: true,
        });
        this._lightbox.opacity = 0;
        this._backgroundGroup.hide();
        for (let i = 0; i < Main.layoutManager.monitors.length; i++) {
            new Background.BackgroundManager({
                container: this._backgroundGroup,
                monitorIndex: i,
                vignette: false,
            });
        }
    }

     dimBackground() {
        let panels = this.getPanels();
        for (let panel of panels) {
            try {
                let panelActor = (panel instanceof Clutter.Actor) ? panel : panel.actor;
                panelActor.set_reactive(false);
                if (this._settings.hide_panel) {
                    this.tween(panelActor, {
                        opacity: 0,
                        time: this._settings.animation_time,
                        transition: 'easeInOutQuint'
                    });
                }
            } catch (e) {
                log(e);
                // ignore fake panels
            }
        }

        // hide gnome-shell legacy tray
        try {
            if (Main.legacyTray) {
                Main.legacyTray.actor.hide();
            }
        } catch (e) {
            // ignore missing legacy tray
        }
        this._backgroundGroup.show();
        this._lightbox.lightOn();
        this.tween(this._lightbox, {
            opacity: 255,
            time: this._settings.animation_time,
            transition: 'easeInOutQuint',
        });
    }

    lightenBackground() {
        // panels
        let panels = this.getPanels();
        for (let panel of panels){
            try {
                let panelActor = (panel instanceof Clutter.Actor) ? panel : panel.actor;
                panelActor.set_reactive(true);
                if (this._settings.hide_panel) {
                    this.removeTweens(panelActor);
                    this.tween(panelActor, {
                        opacity: 255,
                        time: this._settings.animation_time,
                        transition: 'easeInOutQuint'
                    });
                }
            } catch (e) {
                //ignore fake panels
            }
        }
        // show gnome-shell legacy trayconn
        try {
            if (Main.legacyTray) {
                Main.legacyTray.actor.show();
            }
        } catch (e) {
            //ignore missing legacy tray
        }

        this.tween(this._lightbox, {
            time: this._settings.animation_time * 0.95,
            transition: 'easeInOutQuint',
            opacity: 0,
            onComplete: this._lightbox.lightOff.bind(this._lightbox),
        });
    }

    removeBackground() {
        Lightbox.VIGNETTE_SHARPNESS = this._vignette_sharpness_backup;
        Lightbox.VIGNETTE_BRIGHTNESS = this._vignette_brigtness_backup;
        Main.layoutManager.uiGroup.remove_child(this._backgroundGroup);
	}

    getPanels() {
        let panels = [Main.panel];
        if (Main.panel2)
            panels.push(Main.panel2);
        // gnome-shell dash
        if (Main.overview._dash)
            panels.push(Main.overview._dash);
        return panels;
    }


}
