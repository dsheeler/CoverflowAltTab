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
const TRANSITION_TYPE = 'easeOutQuad';

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
            animation_time: 0.25,
            dim_factor: 0.4,
            title_position: POSITION_BOTTOM,
            icon_style: 'Classic',
            icon_has_shadow: false,
            overlay_icon_size: 128,
            overlay_icon_opacity: 1,
            offset: 0,
            hide_panel: true,
            enforce_primary_monitor: true,
            switcher_class: Switcher,
            easing_function: 'ease-out-cubic',
            current_workspace_only: '1',
            switch_per_monitor: false,
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
        this._gioSettings = null;
    }

    enable() {
        this.disable();

        if (this._gioSettings == null)
            this._gioSettings = ExtensionImports.lib.getSettings(SHELL_SCHEMA);

        let keys = [
            "animation-time",
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
            "switcher-style"
        ];

        this._connections = [];
        let bind = this._onSettingsChanged.bind(this);
        for (let key of keys) {
            this._connections.push(this._gioSettings.connect('changed::' + key, bind));
        }

        this._settings = this._loadSettings();
    }

    disable() {
        if (this._connections) {
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

    getPrimaryModifier(mask) {
        return imports.ui.switcherPopup.primaryModifier(mask);
    }

    getSettings() {
        if (!this._settings) {
            this._settings = this._loadSettings();
        }
        return this._settings;
    }

    _onSettingsChanged() {
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
                icon_has_shadow: settings.get_boolean("icon-has-shadow"),
                overlay_icon_size: clamp(settings.get_int("overlay-icon-size"), 64, 1024),
                overlay_icon_opacity: clamp(settings.get_int("overlay-icon-opacity") / 100, 0, 1),
                offset: settings.get_int("offset"),
                hide_panel: settings.get_boolean("hide-panel"),
                enforce_primary_monitor: settings.get_boolean("enforce-primary-monitor"),
                easing_function: settings.get_string("easing-function"),
                switcher_class: settings.get_string("switcher-style") === 'Timeline'
                    ? TimelineSwitcher : CoverflowSwitcher,
                current_workspace_only: settings.get_string("current-workspace-only"),
                switch_per_monitor: settings.get_boolean("switch-per-monitor"),
            };
        } catch (e) {
            global.log(e);
        }

        return this.getDefaultSettings();
    }

    tween(actor, params) {
        params.duration = params.time * 1000;
        if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-in-bounce" ||
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
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-in-cubic" ||
            params.transition == 'easeInCubic') {
            params.mode = Clutter.AnimationMode.EASE_IN_CUBIC;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-out-cubic" ||
            params.transition == 'easeOutCubic') {
            params.mode = Clutter.AnimationMode.EASE_OUT_CUBIC;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-in-out-cubic" ||
            params.transition == 'easeInOutCubic') {
            params.mode = Clutter.AnimationMode.EASE_IN_OUT_CUBIC;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-in-quad" ||
            params.transition == 'easeInQuad') {
            params.mode = Clutter.AnimationMode.EASE_IN_QUAD;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-out_quad" ||
            params.transition == 'easeOutQuad') {
            params.mode = Clutter.AnimationMode.EASE_OUT_QUAD;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-in-out-quad" ||
            params.transition == 'easeInOutQuad') {
            params.mode = Clutter.AnimationMode.EASE_IN_OUT_QUINT;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-in-quint" ||
            params.transition == 'easeInQuint') {
            params.mode = Clutter.AnimationMode.EASE_IN_QUINT;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-out-quint" ||
            params.transition == 'easeOutQuint') {
            params.mode = Clutter.AnimationMode.EASE_OUT_QUINT;
        } else if (params.transition == 'userChoice' && this.getSettings().easing_function == "ease-in-out-quint" ||
            params.transition == 'easeInOutQuint') {
            params.mode = Clutter.AnimationMode.EASE_IN_OUT_QUINT;
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
        this._vignette_brigtness_backup = Lightbox.VIGNETTE_SHARPNESS;

        Lightbox.VIGNETTE_SHARPNESS = 1.0;
        Lightbox.VIGNETTE_BRIGHTNESS = 1.0;

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
        this._backgroundGroup.show();
        this._lightbox.lightOn();
        this._lightbox.opacity = 0;
        let alpha = 1 - this._settings.dim_factor;
        this.tween(this._lightbox, {
            opacity: 255 * alpha,
            time: this._settings.animation_time,
            transition: 'easeInOutQuint',
        });
     }

    lightenBackground() {
        this.tween(this._lightbox, {
            time: this._settings.animation_time * 0.97,
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
}
