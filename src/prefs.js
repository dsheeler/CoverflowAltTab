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
 * CoverflowAltTab
 *
 * Preferences dialog for "gnome-extensions prefs" tool
 *
 * Based on preferences in the following extensions: JustPerfection, dash2doc-lite, night theme switcher, and desktop cube
 *
 */
import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'
import { ShortcutButton } from './shortcutButton.js';
import { ExtensionSettingKeys } from './settings.js';


const easing_options = [
    {
        id: 'ease-linear', name: 'easeLinear'
    }, {
        id: 'ease-in-quad', name: "easeInQuad"
    }, {
        id: 'ease-out-quad', name: "easeOutQuad"
    }, {
        id: 'ease-in-out-quad', name: "easeInOutQuad"
    }, {
        id: 'ease-in-cubic', name: "easeInCubic"
    }, {
        id: 'ease-out-cubic', name: "easeOutCubic"
    }, {
        id: 'ease-in-out-cubic', name: "easeInOutCubic"
    }, {
        id: 'ease-in-quart', name: "easeInQuart"
    }, {
        id: 'ease-out-quart', name: "easeOutQuart"
    }, {
        id: 'ease-in-out-quart', name: "easeInOutQuart"
    }, {
        id: 'ease-in-quint', name: "easeInQuint"
    }, {
        id: 'ease-out-quint', name: "easeOutQuint"
    }, {
        id: 'ease-in-out-quint', name: "easeInOutQuint"
    }, {
        id: 'ease-in-sine', name: "easeInSine"
    }, {
        id: 'ease-out-sine', name: "easeOutSine"
    }, {
        id: 'ease-in-out-sine', name: "easeInOutSine"
    }, {
        id: 'ease-in-expo', name: "easeInExpo"
    }, {
        id: 'ease-out-expo', name: "easeOutExpo"
    }, {
        id: 'ease-in-out-expo', name: "easeInOutExpo"
    }, {
        id: 'ease-in-circ', name: "easeInCirc"
    }, {
        id: 'ease-out-circ', name: "easeOutCirc"
    }, {
        id: 'ease-in-out-circ', name: "easeInOutCirc"
    }, {
        id: 'ease-in-back', name: "easeInBack"
    }, {
        id: 'ease-out-back', name: "easeOutBack"
    }, {
        id: 'ease-in-out-back', name: "easeInOutBack"
    }, {
        id: 'ease-in-elastic', name: "easeInElastic"
    }, {
        id: 'ease-out-elastic', name: "easeOutElastic"
    }, {
        id: 'ease-in-out-elastic', name: "easeInOutElastic"
    }, {
        id: 'ease-in-bounce', name: "easeInBounce"
    }, {
        id: 'ease-out-bounce', name: "easeOutBounce"
    }, {
        id: 'ease-in-out-bounce', name: "easeInOutBounce"
    }, {
        id: 'random', name: "Random"
    }];



export default class CoverflowAltTabPreferences extends ExtensionPreferences {
    constructor(metadata) {
        super(metadata);

        this.settings = this.getSettings();

        let IconsPath = GLib.build_filenamev([this.path, 'ui', 'icons']);
        let iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
        iconTheme.add_search_path(IconsPath);
    }

    getVersionString(_page) {
        return _('Version %d').format(this.metadata.version);
    }

    fillPreferencesWindow(window) {
        let switcher_page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'general-symbolic',
        });

        let switcher_pref_group = new Adw.PreferencesGroup({
            title: _('Switcher Properties'),
        });
        const switcher_looping_method_buttons = [
            {
                choice: "Flip Stack",
                label: _("Flip Stack"),
                sensitive_widgets: [],
                insensitive_widgets: [],
            },
            {
                choice: "Carousel",
                label: _("Carousel"),
                sensitive_widgets: [],
                insensitive_widgets: [],
            },
        ];

        let switcher_looping_method_row = this.buildRadioAdw("switcher-looping-method", switcher_looping_method_buttons, _("Looping Method"), _("How to cycle through windows."));
        const switcher_style_buttons = [
            {
                choice: "Coverflow",
                label: _("Coverflow"),
                sensitive_widgets: [],
                insensitive_widgets: [],
            },
            {
                choice: "Timeline",
                label: _("Timeline"),
                sensitive_widgets: [],
                insensitive_widgets: [],
            },
        ];
        switcher_pref_group.add(this.buildRadioAdw("switcher-style", switcher_style_buttons, _("Style"), _("Pick the type of switcher.")));
        switcher_pref_group.add(this.buildSpinAdw("offset", [-500, 500, 1, 10], _("Vertical Offset"), _("Positive value moves everything down, negative up.")));
        const position_buttons = [
            {
                choice: "Bottom",
                label: _("Bottom"),
                sensitive_widgets: [],
                insensitive_widgets: [],
            },
            {
                choice: "Top",
                label: _("Top"),
                sensitive_widgets: [],
                insensitive_widgets: [],
            },
        ];
        switcher_pref_group.add(this.buildRadioAdw("position", position_buttons, _("Window Title Position"), _("Place window title above or below the switcher.")));
        switcher_pref_group.add(this.buildSwitcherAdw("enforce-primary-monitor", [], [], _("Enforce Primary Monitor"), _("Always show on the primary monitor, otherwise, show on the active monitor.")));

        switcher_pref_group.add(this.buildSwitcherAdw("hide-panel", [], [], _("Hide Panel"), _("Hide panel when switching windows.")));
        switcher_pref_group.add(this.buildRangeAdw("dim-factor", [0, 1, 0.001, [0.25, 0.5, 0.75]], _("Background Dim-Factor"), _("Bigger means darker."), true));
        switcher_pref_group.add(this.buildSwitcherAdw("invert-swipes", [], [], _("Invert Swipes"), _("Invert system scroll direction setting.")));
        switcher_pref_group.add(this.buildSwitcherAdw("start-with-next", [], [], _("Start with Next"), _("Start with the next window (instead of the current window).")));
        switcher_page.add(switcher_pref_group);

        let dash_to_dock_pref_group = new Adw.PreferencesGroup({
            title: _('Dash to Dock Properties'),
        });
        const dash_to_dock_visibility_behavior_buttons = [
            {
                choice: "Show",
                label: _("Show"),
                sensitive_widgets: [],
                insensitive_widgets: [],
            },
            {
                choice: "Hide",
                label: _("Hide"),
                sensitive_widgets: [],
                insensitive_widgets: [],
            },
            {
                choice: "Neither",
                label: _("Neither"),
                sensitive_widgets: [],
                insensitive_widgets: [],
            },
        ];
        dash_to_dock_pref_group.add(this.buildRadioAdw("dash-to-dock-visibility-behavior",
            dash_to_dock_visibility_behavior_buttons, _("Dash to Dock Visibility Behavior"),
            _("How to display dash-to-dock when the switcher is active.")));

        switcher_page.add(dash_to_dock_pref_group);
        let animation_page = new Adw.PreferencesPage({
            title: _("Animation"),
            icon_name: 'animation-symbolic',
        });

        let animation_pref_group = new Adw.PreferencesGroup({
            title: _('Properties'),
        });
        animation_page.add(animation_pref_group);
        animation_pref_group.add(this.buildDropDownAdw("easing-function", easing_options, _("Easing Function"), _("Determine how windows move.")));
        animation_pref_group.add(this.buildRangeAdw("animation-time", [0.01, 2, 0.001, [0.5, 1, 1.5]], _("Duration [s]"), "", true));
        animation_pref_group.add(this.buildSwitcherAdw("randomize-animation-times", [], [], _("Randomize Durations"), _("Each animation duration assigned randomly between 0 and configured duration.")));

        let icon_page = new Adw.PreferencesPage({
            title: _("Icons"),
            icon_name: "icons-symbolic",
        })

        let icon_pref_group = new Adw.PreferencesGroup({
            title: _("Properties"),
        });
        icon_page.add(icon_pref_group);

        let size_row = this.buildRangeAdw("overlay-icon-size", [16, 4096, 1, [32, 64, 128, 256, 512, 768, 1024, 1536, 2048, 3072]], _("Overlay Icon Size"), _("Set the overlay icon size in pixels."), true);
        let opacity_row = this.buildRangeAdw("overlay-icon-opacity", [0, 1, 0.001, [0.25, 0.5, 0.75]], _("Overlay Icon Opacity"), _("Set the overlay icon opacity."), true);
        const style_buttons = [
            {
                choice: "Classic",
                label: _("Classic"),
                sensitive_widgets: [],
                insensitive_widgets: [size_row, opacity_row],
            },
            {
                choice: "Overlay",
                label: _("Overlay"),
                sensitive_widgets: [size_row, opacity_row],
                insensitive_widgets: [],
            },
            {
                choice: "Attached",
                label: _("Attached"),
                sensitive_widgets: [size_row, opacity_row],
                insensitive_widgets: [],
            },
        ];
        let style_row = this.buildRadioAdw("icon-style", style_buttons, _("Application Icon Style"));

        const add_remove_effects_buttons = [
            {
                choice: "Fade Only",
                label: _("Fade Only"),
                sensitive_widgets: [],
                insensitive_widgets: [],
            },
            {
                choice: "Scale Only",
                label: _("Scale Only"),
                sensitive_widgets: [],
                insensitive_widgets: [],
            },
            {
                choice: "Fade and Scale",
                label: _("Fade and Scale"),
                sensitive_widgets: [],
                insensitive_widgets: [],
            },
        ];
        let add_remove_effects_row = this.buildRadioAdw("icon-add-remove-effects", add_remove_effects_buttons, _("Add / Remove Effects"), _("How Icons and Labels ease in and out."));
        icon_pref_group.add(style_row);
        icon_pref_group.add(size_row);
        icon_pref_group.add(opacity_row);
        icon_pref_group.add(this.buildSwitcherAdw("icon-has-shadow", [], [], _("Icon Shadow")));
        icon_pref_group.add(add_remove_effects_row);

        let window_size_page = new Adw.PreferencesPage({
            title: _("Windows"),
            icon_name: "windows-symbolic"
        })
        let window_size_pref_group = new Adw.PreferencesGroup({
            title: _("General Settings")
        });
        let timeline_window_pref_group = new Adw.PreferencesGroup({
            title: _("Timeline Settings")
        });
        let coverflow_window_pref_group = new Adw.PreferencesGroup({
            title: _("Coverflow Settings")
        });
        window_size_page.add(window_size_pref_group);
        window_size_page.add(coverflow_window_pref_group);
        window_size_page.add(timeline_window_pref_group);
        window_size_pref_group.add(this.buildRangeAdw("preview-to-monitor-ratio", [0, 1, 0.001, [0.250, 0.500, 0.750]], _("Window Size to Monitor Size Ratio"), _("Maximum ratio of window size to monitor size."), true));
        let workspace_inclusion_options = [{
            id: 'current', name: _("Current workspace only")
        }, {
            id: 'all', name: _("All workspaces")
        }, {
            id: 'all-currentfirst', name: _("All workspaces, current first")
        }];
        window_size_pref_group.add(this.buildDropDownAdw("current-workspace-only", workspace_inclusion_options, _("Workspaces"), _("Switch between windows on current or on all workspaces.")));
        window_size_pref_group.add(this.buildSwitcherAdw("switch-per-monitor", [], [], _("Current Monitor"), _("Switch between windows on current monitor.")));
        window_size_pref_group.add(this.buildSwitcherAdw("skip-minimized-windows", [], [], _("Skip Minimized Windows"), _("Exclude minimized windows from the switcher.")));
        coverflow_window_pref_group.add(switcher_looping_method_row);
        timeline_window_pref_group.add(this.buildRangeAdw("timeline-preview-distance", [0, 1024, 1, [64, 128, 256, 512, 768, 1024]], _("Window Layout Distance"), _("Distance in pixels between timeline window's upper left corners."), true));
        timeline_window_pref_group.add(this.buildRangeAdw("timeline-preview-angle", [0, 60, 0.001, [29.36, 32, 45.00]], _("Window Layout Angle"), _("Angle in degrees (0-90) for timeline window layout such that windows go from lower right to upper left at this angle between successive window's upper left corners. The topmost window's upper left corner is at the center of the monitor."), true));
        timeline_window_pref_group.add(this.buildRangeAdw("timeline-preview-tilt-angle", [0, 90, 0.5, [0, 15, 30, 45, 60, 75, 90]], _("Window Tilt Angle"), _("Y-axis rotation angle in degrees applied to timeline windows."), true));
        const scaling_factor_row = this.buildRangeAdw("timeline-preview-scaling-factor", [0, 1, 0.001, [0.250, 0.500, 0.800]], _("Window Scaling Factor"), _("Factor by which timeline windows successively shrink with distance from the top window."), true);
        timeline_window_pref_group.add(this.buildSwitcherAdw("timeline-preview-scale-with-distance", [scaling_factor_row], [], _("Enable Window Scaling"), _("Useful if you have a large number of windows and want to see them all.")));
        timeline_window_pref_group.add(scaling_factor_row);
        coverflow_window_pref_group.add(this.buildRangeAdw("coverflow-preview-scaling-factor", [0, 1, 0.001, [0.250, 0.500, 0.800]], _("Window Scaling Factor"), _("Factor by which coverflow windows successively shrink off to the side."), true));
        coverflow_window_pref_group.add(this.buildRangeAdw("coverflow-window-angle", [0, 360, 0.5, [0, 90, 180, 270]], _("Window Angle"), _("Angle of off-center windows in coverflow mode."), true));
        coverflow_window_pref_group.add(this.buildRangeAdw("coverflow-window-offset-width", [0, 1000, 1, [0, 50,]], _("Window Offset Width"), _("How far windows are off to the side in coverflow mode."), true));
        let background_application_page = new Adw.PreferencesPage({
            title: _("AppSwitcher"),
            icon_name: "appswitcher-symbolic"
        })
        let background_application_switcher_pref_group = new Adw.PreferencesGroup({
            title: _('Properties'),
        });
        background_application_page.add(background_application_switcher_pref_group);
        background_application_switcher_pref_group.add(this.buildSwitcherAdw("switch-application-behaves-like-switch-windows", [], [], _("Make the Application Switcher Show Only First Preview"), _("Don't group windows of the same application in a subswitcher.")));
        background_application_switcher_pref_group.add(this.buildRangeAdw("desaturate-factor", [0, 1, 0.001, [0.25, 0.5, 0.75]], _("Desaturate"), _("Larger means more desaturation."), true));

        let color_row = new Adw.ExpanderRow({
            title: _("Tint"),
        });
        background_application_switcher_pref_group.add(color_row);

        let use_tint_switch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
            active: this.settings.get_boolean("use-tint"),
        });
        this.settings.bind("use-tint", use_tint_switch, "active", Gio.SettingsBindFlags.DEFAULT);
        color_row.add_suffix(use_tint_switch);

        let tint_chooser_row = new Adw.ActionRow({
            title: _("Color")
        });
        let choose_tint_box = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 10,
            valign: Gtk.Align.CENTER,
        });

        tint_chooser_row.add_suffix(choose_tint_box);
        color_row.add_row(tint_chooser_row);

        let color_dialog = new Gtk.ColorDialog({
            with_alpha: false,
        });

        let tint_color_button = new Gtk.ColorDialogButton({
            valign: Gtk.Align.CENTER,
            dialog: color_dialog,
        });

        let tint_set_to_theme_color_button = new Gtk.Button({
            label: _("Set to Theme Color"),
            valign: Gtk.Align.CENTER,
        });

        tint_set_to_theme_color_button.connect('clicked', () => {
            let stc_c = this.settings.get_value("switcher-background-color").deep_unpack();
            let stc_rgba = new Gdk.RGBA();
            stc_rgba.red = stc_c[0];
            stc_rgba.green = stc_c[1];
            stc_rgba.blue = stc_c[2];
            stc_rgba.alpha = 1
            tint_color_button.set_rgba(stc_rgba);
        });

        let tint_use_theme_color_button = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
        });
        this.settings.bind('tint-use-theme-color', tint_use_theme_color_button, 'active', Gio.SettingsBindFlags.DEFAULT);
        tint_set_to_theme_color_button.set_sensitive(!this.settings.get_boolean('tint-use-theme-color'));
        tint_color_button.set_sensitive(!this.settings.get_boolean('tint-use-theme-color'));
        tint_use_theme_color_button.connect("notify::active", widget => {
            tint_set_to_theme_color_button.set_sensitive(!widget.active);
            tint_color_button.set_sensitive(!widget.active);
        });

        let use_theme_color_label = new Gtk.Label({
            label: "Use Gnome-Shell Theme",
            valign: Gtk.Align.CENTER,
        });

        choose_tint_box.append(use_theme_color_label);
        choose_tint_box.append(tint_use_theme_color_button);
        choose_tint_box.append(tint_set_to_theme_color_button);
        choose_tint_box.append(tint_color_button);
        let c = this.settings.get_value("tint-color").deep_unpack();
        let rgba = new Gdk.RGBA();
        rgba.red = c[0];
        rgba.green = c[1];
        rgba.blue = c[2];
        rgba.alpha = 1
        tint_color_button.set_rgba(rgba);
        tint_color_button.connect('notify::rgba', _button => {
            //eslint-disable-next-line no-shadow
            let c = tint_color_button.rgba;
            let val = new GLib.Variant("(ddd)", [c.red, c.green, c.blue]);
            this.settings.set_value("tint-color", val);
        });
        this.settings.connect('changed::tint-color', () => {
            let tc = this.settings.get_value("tint-color").deep_unpack();
            let nrgba = new Gdk.RGBA();
            nrgba.red = tc[0];
            nrgba.green = tc[1];
            nrgba.blue = tc[2];
            nrgba.alpha = 1;
            tint_color_button.set_rgba(nrgba);
        });
        use_tint_switch.connect('notify::active', function(widget) {
            color_row.set_expanded(widget.get_active());
        });

        let reset_button = this.buildResetButton();
        reset_button.connect("clicked", function (_widget) {
            this.settings.reset("use-tint");
        });
        color_row.add_suffix(reset_button);
        color_row.add_row(this.buildRangeAdw("tint-blend", [0, 1, 0.001, [0.25, 0.5, 0.75]], _("Blend"), _("How much to blend the tint color; bigger means more tint color."), true));
        background_application_switcher_pref_group.add(this.buildSwitcherAdw("use-glitch-effect", [], [], _("Glitch")));

        let keybinding_page = new Adw.PreferencesPage({
            title: _("Keybindings"),
            icon_name: "keybinding-symbolic"
        });

        let keybinding_pref_group = new Adw.PreferencesGroup({
            title: _("System Actions Keybindings"),
            description: _("In case of conflicts with other window switchers, can unbind from system actions."),
        });
        keybinding_page.add(keybinding_pref_group);
        keybinding_pref_group.add(this.buildSwitcherAdw("bind-to-switch-windows", [], [], _("Bind to 'switch-windows'")));
        keybinding_pref_group.add(this.buildSwitcherAdw("bind-to-switch-applications", [], [], _("Bind to 'switch-applications'")));

        let custom_keybinding_pref_group = new Adw.PreferencesGroup({
            title: _("Internal Actions Keybindings"),
            description: _("Internal actions that will not conflict with other window switchers.")
        });
        keybinding_page.add(custom_keybinding_pref_group);
        custom_keybinding_pref_group.add(this.buildShortcutButtonAdw("coverflow-switch-windows", _("Coverflow Switch Windows Shortcut"), _("Activate window switcher.")));
        custom_keybinding_pref_group.add(this.buildShortcutButtonAdw("coverflow-switch-windows-on-all-workspaces", _("Coverflow Switch Windows That are Visible on All Workspaces Shortcut"), _("Activate window switcher listing windows visible on all workspaces.")));
        custom_keybinding_pref_group.add(this.buildShortcutButtonAdw("coverflow-switch-applications", _("Coverflow Switch Applications Shortcut"), _("Activate application switcher.")));
        custom_keybinding_pref_group.add(this.buildShortcutButtonAdw("coverflow-switch-applications-on-all-workspaces", _("Coverflow Switch Applications That are Visible on All Workspaces Shortcut"), _("Activate application switcher listing applications visible on all workspaces.")));

        let pcorrection_pref_group = new Adw.PreferencesGroup({
            title: _("Advanced Options"),
        });

        pcorrection_pref_group.add(this.buildDropDownAdw("perspective-correction-method", [
            { id: "None", name: _("None") },
            { id: "Move Camera", name: _("Move Camera") },
            { id: "Adjust Angles", name: _("Adjust Angles") }],
            _("Perspective Correction"), _("Method to make off-center switcher look centered.")));

        pcorrection_pref_group.add(this.buildSwitcherAdw("verbose-logging", [], [], _("Verbose Logging"), _("Log debug and normal messages.")));
        switcher_page.add(pcorrection_pref_group);

        let highlight_color_row = new Adw.ExpanderRow({
            title: _("Highlight Window Under Mouse"),
            subtitle: _("Draw a colored highlight on window under the mouse to know the effects of clicking."),
        });
        window_size_pref_group.add(highlight_color_row);

        let highlight_switch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
            active: this.settings.get_boolean("highlight-mouse-over"),
        });
        this.settings.bind("highlight-mouse-over", highlight_switch, "active", Gio.SettingsBindFlags.DEFAULT);
        highlight_color_row.add_suffix(highlight_switch);

        let highlight_chooser_row = new Adw.ActionRow({
            title: _("Color")
        });
        let choose_highlight_box = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 10,
            valign: Gtk.Align.CENTER,
        });
        highlight_chooser_row.add_suffix(choose_highlight_box);
        highlight_color_row.add_row(highlight_chooser_row);

        let highlight_color_dialog = new Gtk.ColorDialog({
            with_alpha: false,
        });
        let highlight_use_theme_color_label = new Gtk.Label({
            label: "Use Gnome-Shell Theme",
            valign: Gtk.Align.CENTER,
        });

        let highlight_color_button = new Gtk.ColorDialogButton({
            valign: Gtk.Align.CENTER,
            dialog: highlight_color_dialog,
        });

        let highlight_set_to_theme_color_button = new Gtk.Button({
            label: _("Set to Theme Color"),
            valign: Gtk.Align.CENTER,

        });

        highlight_set_to_theme_color_button.connect('clicked', () => {
            let stc_c = this.settings.get_value("switcher-background-color").deep_unpack();
            let stc_rgba = new Gdk.RGBA();
            stc_rgba.red = stc_c[0];
            stc_rgba.green = stc_c[1];
            stc_rgba.blue = stc_c[2];
            stc_rgba.alpha = 1
            highlight_color_button.set_rgba(stc_rgba);
        });

        let highlight_use_theme_color_button = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
        });
        this.settings.bind('highlight-use-theme-color', highlight_use_theme_color_button, 'active', Gio.SettingsBindFlags.DEFAULT);
        highlight_set_to_theme_color_button.set_sensitive(!this.settings.get_boolean('highlight-use-theme-color'));
        highlight_color_button.set_sensitive(!this.settings.get_boolean('highlight-use-theme-color'));
        highlight_use_theme_color_button.connect('notify::active', button => {
            highlight_set_to_theme_color_button.set_sensitive(!button.active);
            highlight_color_button.set_sensitive(!button.active);
        });

        choose_highlight_box.append(highlight_use_theme_color_label);
        choose_highlight_box.append(highlight_use_theme_color_button);
        choose_highlight_box.append(highlight_set_to_theme_color_button);
        choose_highlight_box.append(highlight_color_button);
        let hc = this.settings.get_value("highlight-color").deep_unpack();
        let hrgba = new Gdk.RGBA();
        hrgba.red = hc[0];
        hrgba.green = hc[1];
        hrgba.blue = hc[2];
        hrgba.alpha = 1
        highlight_color_button.set_rgba(hrgba);
        highlight_color_button.connect('notify::rgba', _button => {
            //eslint-disable-next-line no-shadow
            let c = highlight_color_button.rgba;
            let val = new GLib.Variant("(ddd)", [c.red, c.green, c.blue]);
            this.settings.set_value("highlight-color", val);
        });
        this.settings.connect('changed::highlight-color', () => {
            let hcv = this.settings.get_value("highlight-color").deep_unpack();
            let nrgba = new Gdk.RGBA();
            nrgba.red = hcv[0];
            nrgba.green = hcv[1];
            nrgba.blue = hcv[2];
            nrgba.alpha = 1;
            highlight_color_button.set_rgba(nrgba);
        });
        highlight_switch.connect('notify::active', function(widget) {
            highlight_color_row.set_expanded(widget.get_active());
        });

        let highlight_reset_button = this.buildResetButton();
        highlight_reset_button.connect("clicked", function (_widget) {
            this.settings.reset("highlight-mouse-over");
        });
        highlight_color_row.add_suffix(highlight_reset_button);

        window_size_pref_group.add(this.buildSwitcherAdw("raise-mouse-over", [], [], _("Raise Window Under Mouse"), _("Raise the window under the mouse above all others.")));

        let contribution_page = new Adw.PreferencesPage({
            title: _("Contribute"),
            icon_name: 'contribute-symbolic',
        });

        let contribute_icon_pref_group = new Adw.PreferencesGroup();
        let icon_box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            margin_top: 24,
            margin_bottom: 24,
            spacing: 18,
        });

        let icon_image = new Gtk.Image({
            icon_name: "coverflow-symbolic",
            pixel_size: 256,
        });

        let label_box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 6,
        });

        let label = new Gtk.Label({
            label: "Coverflow Alt-Tab",
            wrap: true,
        });
        let context = label.get_style_context();
        context.add_class("title-1");

        let another_label = new Gtk.Label({
            label: this.getVersionString(),
        });

        let links_pref_group = new Adw.PreferencesGroup({
            title: _('Get involved'),
            description: _('Help improve this extension by contributing code, reporting issues, or translating it into your language.'),
        });
        links_pref_group.add(this.buildContributeLinkRow(window, {
            icon_name: 'code-symbolic',
            title: _('Code and Issues'),
            subtitle: 'github.com/dsheeler/CoverflowAltTab',
            uri: 'https://github.com/dsheeler/CoverflowAltTab',
        }));
        links_pref_group.add(this.buildContributeLinkRow(window, {
            icon_name: 'translate-symbolic',
            title: _('Translations'),
            subtitle: 'hosted.weblate.org coverflow-alt-tab',
            uri: 'https://hosted.weblate.org/engage/coverflow-alt-tab/',
        }));

        let support_pref_group = new Adw.PreferencesGroup({
            title: _('Donate'),
            description: _('If you use this extension, consider supporting its development.'),
        });
        support_pref_group.add(this.buildContributeLinkRow(window, {
            icon_name: 'emblem-favorite-symbolic',
            title: _('Liberapay'),
            subtitle: 'liberapay.com/dsheeler',
            uri: 'https://liberapay.com/dsheeler/donate',
        }));
        support_pref_group.add(this.buildContributeLinkRow(window, {
            icon_name: 'send-to-symbolic',
            title: _('PayPal'),
            subtitle: 'paypal.me/DanielSheeler',
            uri: 'https://paypal.me/DanielSheeler?country.x=US&locale.x=en_US',
        }));
        support_pref_group.add(this.buildContributeLinkRow(window, {
            icon_name: 'starred-symbolic',
            title: _('GitHub Sponsors'),
            subtitle: 'github.com/sponsors/dsheeler',
            uri: 'https://github.com/sponsors/dsheeler',
        }));

        const settings_pref_group = new Adw.PreferencesGroup({
            title: _('Preferences backup'),
            description: _('Save or restore this extension\'s settings, or reset everything to defaults.'),
        });

        // Save/Load Settings----------------------------------------------------------
        const settingsRow = new Adw.ActionRow({
            title: _('Settings'),
            icon_name: "settings-symbolic",
        });
        const loadButton = new Gtk.Button({
            label: _('Load'),
            valign: Gtk.Align.CENTER,
        });

        const schemaPath = '/org/gnome/shell/extensions/coverflowalttab/';
        loadButton.connect('clicked', () => {
            this.showFileChooser(window, _('Load Settings'), Gtk.FileChooserAction.OPEN, filename => {
                    if (!filename || !GLib.file_test(filename, GLib.FileTest.EXISTS))
                        return;
                    try {
                        const file = Gio.File.new_for_path(filename);
                        const [readOk, contents] = file.load_contents(null);
                        if (!readOk)
                            throw new Error(_('Could not read settings file'));
                        const subprocess = Gio.Subprocess.new(
                            ['dconf', 'load', schemaPath],
                            Gio.SubprocessFlags.STDIN_PIPE,
                        );
                        subprocess.communicate(new GLib.Bytes(contents), null);
                        if (!subprocess.get_successful())
                            console.error('CoverflowAltTab: dconf load exited with an error');
                    } catch (e) {
                        console.error(`CoverflowAltTab: failed to load settings: ${e}`);
                    }
            });
        });
        const saveButton = new Gtk.Button({
            label: _('Save'),
            valign: Gtk.Align.CENTER,
        });
        saveButton.connect('clicked', () => {
            this.showFileChooser(window, _('Save Settings'), Gtk.FileChooserAction.SAVE, filename => {
                    try {
                        const file = Gio.File.new_for_path(filename);
                        const raw = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
                        const out = Gio.BufferedOutputStream.new_sized(raw, 4096);
                        const [ok, dumpBytes] = GLib.spawn_command_line_sync(`dconf dump ${schemaPath}`);
                        if (!ok)
                            throw new Error(_('dconf dump failed'));
                        out.write_all(dumpBytes, null);
                        out.close(null);
                    } catch (e) {
                        console.error(`CoverflowAltTab: failed to save settings: ${e}`);
                    }
            });
        });

        const resetButton = new Gtk.Button({
            label: _('Reset'),
            valign: Gtk.Align.CENTER,
        });
        resetButton.connect('clicked', () => {
            for (const key of ExtensionSettingKeys) {
                this.settings.reset(key);
            }
        });

        settingsRow.add_suffix(saveButton);
        settingsRow.add_suffix(loadButton);
        settingsRow.add_suffix(resetButton);

        settings_pref_group.add(settingsRow);

        label_box.append(label);
        label_box.append(another_label);
        icon_box.append(icon_image);
        icon_box.append(label_box);
        contribute_icon_pref_group.add(icon_box);

        contribution_page.add(contribute_icon_pref_group);
        contribution_page.add(links_pref_group);
        contribution_page.add(support_pref_group);
        contribution_page.add(settings_pref_group);

        window.add(switcher_page);
        window.add(animation_page);
        window.add(icon_page);
        window.add(window_size_page);
        window.add(background_application_page);
        window.add(keybinding_page);
        window.add(contribution_page);

        /* The prefs-default-width/height save/restore mechanism
        stolen from openweather refined:
        openweather-extension@penguin-teal.github.io */
        let prefsWidth = this.settings.get_double("prefs-default-width");
        let prefsHeight = this.settings.get_double("prefs-default-height");

        window.set_default_size(prefsWidth, prefsHeight);
        window.set_search_enabled(true);

        window.connect("close-request", () => {
            let currentWidth = window.default_width;
            let currentHeight = window.default_height;
            // Remember user window size adjustments.
            if (currentWidth !== prefsWidth || currentHeight !== prefsHeight)
            {
              this.settings.set_double("prefs-default-width", currentWidth);
              this.settings.set_double("prefs-default-height", currentHeight);
            }
        });
    }


    showFileChooser(parent, title, action, acceptHandler) {
        const dialog = new Gtk.FileDialog({
            title: _(title),
        });
        const onResult = (_dialog, result) => {
            try {
                const file = action === Gtk.FileChooserAction.SAVE
                    ? dialog.save_finish(result)
                    : dialog.open_finish(result);
                acceptHandler(file.get_path());
            } catch (e) {
                if (e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED))
                    return;
                console.log(`CoverflowAltTab - Filechooser error: ${e}`);
            }
        };
        if (action === Gtk.FileChooserAction.SAVE)
            dialog.save(parent, null, onResult);
        else
            dialog.open(parent, null, onResult);
    }

    buildResetButton() {
        return new Gtk.Button({
            icon_name: "edit-clear-symbolic",
            tooltip_text: _("Reset to default value"),
            valign: Gtk.Align.CENTER,
        });
    }

    buildContributeLinkRow(window, { icon_name, title, subtitle, uri }) {
        const rowProps = { title, subtitle };
        if (icon_name)
            rowProps.icon_name = icon_name;
        const row = new Adw.ActionRow(rowProps);
        row.set_tooltip_text(uri);
        row.activatable = true;
        row.connect('activated', () => {
            const launcher = new Gtk.UriLauncher({ uri });
            launcher.launch(window, null, null, (_src, res) => {
                try {
                    launcher.launch_finish(res);
                } catch (e) {
                    console.error(`CoverflowAltTab: could not open link: ${e.message}`);
                }
            });
        });
        return row;
    }

    buildSwitcherAdw(key, dependant_widgets, inverse_dependant_widgets, title, subtitle=null) {
        let pref = new Adw.ActionRow({
            title: title,
        });
        if (subtitle !== null) {
            pref.set_subtitle(subtitle);
        }

        let switcher = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
            active: this.settings.get_boolean(key)
        });

        switcher.expand = false;
        switcher.connect('notify::active', function(widget) {
            this.settings.set_boolean(key, widget.active);
        }.bind(this));
        this.settings.connect(`changed::${key}`, () => {
            const v = this.settings.get_boolean(key);
            if (switcher.get_active() !== v)
                switcher.set_active(v);
        });

        pref.set_activatable_widget(switcher);
        pref.add_suffix(switcher);

        switcher.connect('notify::active', function(widget) {
            for (let dep of dependant_widgets) {
                dep.set_sensitive(widget.get_active());
            }
        });

        for (let widget of dependant_widgets) {
            widget.set_sensitive(switcher.get_active());
        }

        switcher.connect('notify::active', function(widget) {
            for (let inv_dep of inverse_dependant_widgets) {
                inv_dep.set_sensitive(!widget.get_active());
            }
        });

        for (let widget of inverse_dependant_widgets) {
            widget.set_sensitive(!switcher.get_active());
        }

        let reset_button = this.buildResetButton();
        reset_button.connect("clicked", function(_widget) {
            this.settings.reset(key);
            switcher.set_active(this.settings.get_boolean(key));
        }.bind(this));
        pref.add_suffix(reset_button);
        return pref;
    }

    buildRangeAdw(key, values, title, subtitle="", draw_value=false) {
        let [min, max, step, defvs] = values;

        let pref = new Adw.ActionRow({
            title: title,
        });
        if (subtitle !== null && subtitle !== "") {
            pref.set_subtitle(subtitle);
        }
        let range = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, min, max, step);
        range.set_value(this.settings.get_double(key));
        if (draw_value) {
            range.set_draw_value(true);
            range.set_value_pos(Gtk.PositionType.RIGHT)
        }
        for (let defv of defvs) {
            range.add_mark(defv, Gtk.PositionType.BOTTOM, null);
        }
        range.set_size_request(200, -1);

        range.connect('value-changed', function(slider) {
            this.settings.set_double(key, slider.get_value());
        }.bind(this));
        this.settings.connect(`changed::${key}`, () => {
            const v = this.settings.get_double(key);
            if (Math.abs(range.get_value() - v) > 1e-9)
                range.set_value(v);
        });

        pref.set_activatable_widget(range);
        pref.add_suffix(range)

        let reset_button = this.buildResetButton();
        reset_button.connect("clicked", function(_widget) {
            this.settings.reset(key);
            range.set_value(this.settings.get_double(key));
        }.bind(this));
        pref.add_suffix(reset_button);
        return pref;
    }

    buildRadioAdw(key, buttons, title, subtitle=null) {
        let pref = new Adw.ActionRow({
            title: title,
        });
        if (subtitle !== null) {
            pref.set_subtitle(subtitle);
        }
        let hbox = new Gtk.Box({
             orientation: Gtk.Orientation.HORIZONTAL,
             spacing: 10,
             valign: Gtk.Align.CENTER,
         });

        let radio = new Gtk.ToggleButton();

        let radio_for_button = {};
        for (let button of buttons) {
            radio = new Gtk.ToggleButton({group: radio, label: button.label});
            radio_for_button[button.choice] = radio;
            if (button.choice === this.settings.get_string(key)) {
                radio.set_active(true);
                for (let sensitive_widget of button.sensitive_widgets) {
                    sensitive_widget.set_sensitive(true);
                }
                for (let insensitive_widget of button.insensitive_widgets) {
                    insensitive_widget.set_sensitive(false);
                }
            }
            radio.connect('toggled', function(widget) {
                if (widget.get_active()) {
                    this.settings.set_string(key, button.choice);
                    for (let sensitive_widget of button.sensitive_widgets) {
                        sensitive_widget.set_sensitive(true);
                    }
                    for (let insensitive_widget of button.insensitive_widgets) {
                        insensitive_widget.set_sensitive(false);
                    }
                }
            }.bind(this));
            hbox.append(radio);
        };

        this.settings.connect(`changed::${key}`, () => {
            const val = this.settings.get_string(key);
            const btn = radio_for_button[val];
            if (btn && !btn.get_active())
                btn.set_active(true);
        });

        let reset_button = this.buildResetButton();
        reset_button.connect("clicked", function(_widget) {
            this.settings.reset(key);
            for (let button of buttons) {
                if (button.choice === this.settings.get_string(key)) {
                    radio_for_button[button.choice].set_active(true);
                }
            }
        }.bind(this));

        pref.set_activatable_widget(hbox);
        pref.add_suffix(hbox);
        pref.add_suffix(reset_button);
        return pref;
    }

    buildSpinAdw(key, values, title, subtitle=null) {
        let [min, max, step, page] = values;
        let pref = new Adw.ActionRow({
            title: title,
        });
        if (subtitle !== null) {
            pref.set_subtitle(subtitle);
        }
        let spin = new Gtk.SpinButton({ valign: Gtk.Align.CENTER });
        spin.set_range(min, max);
        spin.set_increments(step, page);
        spin.set_value(this.settings.get_int(key));

        spin.connect('value-changed', function(widget) {
            this.settings.set_int(key, widget.get_value());
        }.bind(this));
        this.settings.connect(`changed::${key}`, () => {
            const v = this.settings.get_int(key);
            if (spin.get_value() !== v)
                spin.set_value(v);
        });

        pref.set_activatable_widget(spin);
        pref.add_suffix(spin);

        let reset_button = this.buildResetButton();
        reset_button.connect("clicked", function(_widget) {
            this.settings.reset(key);
            spin.set_value(this.settings.get_int(key));
        }.bind(this));

        pref.add_suffix(reset_button);

        return pref;
    }

    buildDropDownAdw(key, values, title, subtitle=null) {
        let pref = new Adw.ActionRow({
            title: title,
        });
        if (subtitle !== null) {
            pref.set_subtitle(subtitle);
        }
        let model = new Gtk.StringList();
        let chosen_idx = 0;
        for (let i = 0; i < values.length; i++) {
            let item = values[i];
            model.append(item.name);
            if (item.id === this.settings.get_string(key)) {
                chosen_idx = i;
            }
        }

        let chooser = new Gtk.DropDown({
             valign: Gtk.Align.CENTER,
            model: model,
            selected: chosen_idx,
        });
        chooser.connect('notify::selected-item', function(c) {
            let idx = c.get_selected();
            this.settings.set_string(key, values[idx].id);
        }.bind(this));
        this.settings.connect(`changed::${key}`, () => {
            const id = this.settings.get_string(key);
            for (let i = 0; i < values.length; i++) {
                if (values[i].id === id) {
                    if (chooser.get_selected() !== i)
                        chooser.set_selected(i);
                    break;
                }
            }
        });
        pref.set_activatable_widget(chooser);
        pref.add_suffix(chooser);

        let reset_button = this.buildResetButton();
        reset_button.connect("clicked", function(_widget) {
            this.settings.reset(key);
            for (let i = 0; i < values.length; i++) {
                let item = values[i];
                if (item.id === this.settings.get_string(key)) {
                    chooser.set_selected(i);
                    break;
                }
            }
        }.bind(this));
        pref.add_suffix(reset_button);
        return pref;
    }

    buildShortcutButtonAdw(actionName, title, subtitle) {
        let shortcutButton = new ShortcutButton(this.settings, {
            hhomogeneous: false,
        }, actionName);
        this.settings.connect("changed::" + actionName, () => {
            shortcutButton.keybinding = this.settings.get_strv(actionName)[0];
        });
        shortcutButton.keybinding = this.settings.get_strv(actionName)[0];

        shortcutButton.connect("notify::keybinding", () => {
            this.settings.set_strv(actionName, [shortcutButton.keybinding]);
            this.settings.set_strv(actionName + "-backward", ["<Shift>" + shortcutButton.keybinding])
        });

        let shortcutActionRow = new Adw.ActionRow({
            title: _(title),
            subtitle: _(subtitle)
        });

        shortcutActionRow.set_activatable_widget(shortcutButton);
        shortcutActionRow.add_suffix(shortcutButton);
        return shortcutActionRow;
    }
}
