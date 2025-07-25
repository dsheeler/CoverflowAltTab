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

function makeResetButton() {
    return new Gtk.Button({
        icon_name: "edit-clear-symbolic",
        tooltip_text: _("Reset to default value"),
        valign: Gtk.Align.CENTER,
    });
}


export default class CoverflowAltTabPreferences extends ExtensionPreferences {
    constructor(metadata) {
        super(metadata);

        let IconsPath = GLib.build_filenamev([this.path, 'ui', 'icons']);
        let iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
        iconTheme.add_search_path(IconsPath);
    }

    getVersionString(_page) {
        return _('Version %d').format(this.metadata.version);
    }

    fillPreferencesWindow(window) {
        let settings = this.getSettings();
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

        let switcher_looping_method_row = buildRadioAdw(settings, "switcher-looping-method", switcher_looping_method_buttons, _("Looping Method"), _("How to cycle through windows."));
        const switcher_style_buttons = [
            {
                choice: "Coverflow",
                label: _("Coverflow"),
                sensitive_widgets: [switcher_looping_method_row],
                insensitive_widgets: [],
            },
            {
                choice: "Timeline",
                label: _("Timeline"),
                sensitive_widgets: [],
                insensitive_widgets: [switcher_looping_method_row],
            },
        ];
        switcher_pref_group.add(buildRadioAdw(settings, "switcher-style", switcher_style_buttons, _("Style"), _("Pick the type of switcher.")));
        switcher_pref_group.add(buildSpinAdw(settings, "offset", [-500, 500, 1, 10], _("Vertical Offset"), _("Positive value moves everything down, negative up.")));
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
        switcher_pref_group.add(buildRadioAdw(settings, "position", position_buttons, _("Window Title Position"), _("Place window title above or below the switcher.")));
        switcher_pref_group.add(buildSwitcherAdw(settings, "enforce-primary-monitor", [], [], _("Enforce Primary Monitor"), _("Always show on the primary monitor, otherwise, show on the active monitor.")));

        switcher_pref_group.add(switcher_looping_method_row);
        switcher_pref_group.add(buildSwitcherAdw(settings, "hide-panel", [], [], _("Hide Panel"), _("Hide panel when switching windows.")));
        switcher_pref_group.add(buildSwitcherAdw(settings, "invert-swipes", [], [], _("Invert Swipes"), _("Invert system scroll direction setting.")));
        switcher_page.add(switcher_pref_group);

        let background_pref_group = new Adw.PreferencesGroup({
            title: _('Background'),
        });
        background_pref_group.add(buildRangeAdw(settings, "dim-factor", [0, 1, 0.001, [0.25, 0.5, 0.75]], _("Dim-factor"), _("Bigger means darker."), true));
        switcher_page.add(background_pref_group);

        let animation_page = new Adw.PreferencesPage({
            title: _("Animation"),
            icon_name: 'animation-symbolic',
        });

        let animation_pref_group = new Adw.PreferencesGroup({
            title: _('Properties'),
        });
        animation_page.add(animation_pref_group);
        animation_pref_group.add(buildDropDownAdw(settings, "easing-function", easing_options, _("Easing Function"), _("Determine how windows move.")));
        animation_pref_group.add(buildRangeAdw(settings, "animation-time", [0.01, 2, 0.001, [0.5, 1, 1.5]], _("Duration [s]"), "", true));
        animation_pref_group.add(buildSwitcherAdw(settings, "randomize-animation-times", [], [], _("Randomize Durations"), _("Each animation duration assigned randomly between 0 and configured duration.")));

        let windows_pref_group = new Adw.PreferencesGroup({
            title: _('Included'),
        });
        let options = [{
            id: 'current', name: _("Current workspace only")
        }, {
            id: 'all', name: _("All workspaces")
        }, {
            id: 'all-currentfirst', name: _("All workspaces, current first")
        }];
        windows_pref_group.add(buildDropDownAdw(settings, "current-workspace-only", options, _("Workspaces"), _("Switch between windows on current or on all workspaces.")));
        windows_pref_group.add(buildSwitcherAdw(settings, "switch-per-monitor", [], [], _("Current Monitor"), _("Switch between windows on current monitor.")));

        let icon_page = new Adw.PreferencesPage({
            title: _("Icons"),
            icon_name: "icons-symbolic",
        })

        let icon_pref_group = new Adw.PreferencesGroup({
            title: _("Properties"),
        });
        icon_page.add(icon_pref_group);

        let size_row = buildRangeAdw(settings, "overlay-icon-size", [16, 4096, 1, [32, 64, 128, 256, 512, 768, 1024, 1536, 2048, 3072]], _("Overlay Icon Size"), _("Set the overlay icon size in pixels."), true);
        let opacity_row = buildRangeAdw(settings, "overlay-icon-opacity", [0, 1, 0.001, [0.25, 0.5, 0.75]], _("Overlay Icon Opacity"), _("Set the overlay icon opacity."), true);
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
        let style_row = buildRadioAdw(settings, "icon-style", style_buttons, _("Application Icon Style"));

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
        let add_remove_effects_row = buildRadioAdw(settings, "icon-add-remove-effects", add_remove_effects_buttons, _("Add / Remove Effects"), _("How Icons and Labels ease in and out."));
        icon_pref_group.add(style_row);
        icon_pref_group.add(size_row);
        icon_pref_group.add(opacity_row);
        icon_pref_group.add(buildSwitcherAdw(settings, "icon-has-shadow", [], [], _("Icon Shadow")));
        icon_pref_group.add(add_remove_effects_row);

        let window_size_page = new Adw.PreferencesPage({
            title: _("Windows"),
            icon_name: "windows-symbolic"
        })
        let window_size_pref_group = new Adw.PreferencesGroup({
            title: _("Properties")
        });
        window_size_page.add(window_size_pref_group);
        window_size_page.add(windows_pref_group);
        window_size_pref_group.add(buildRangeAdw(settings, "preview-to-monitor-ratio", [0, 1, 0.001, [0.250, 0.500, 0.750]], _("Window Preview Size to Monitor Size Ratio"), _("Maximum ratio of window preview size to monitor size."), true));
        window_size_pref_group.add(buildRangeAdw(settings, "preview-scaling-factor", [0, 1, 0.001, [0.250, 0.500, 0.800]], _("Off-center Size Factor"), _("Factor by which to successively shrink previews off to the side."), true));
        window_size_pref_group.add(buildRangeAdw(settings, "coverflow-window-angle", [0, 360, 0.5, [0, 90, 180, 270]], _("Coverflow Window Angle"), _("Angle of off-center windows in coverflow mode."), true));
        window_size_pref_group.add(buildRangeAdw(settings, "coverflow-window-offset-width", [0, 1000, 1, [0, 50,]], _("Coverflow Window Offset Width"), _("How far windows are off to the side in coverflow mode."), true));
        let background_application_page = new Adw.PreferencesPage({
            title: _("AppSwitcher"),
            icon_name: "appswitcher-symbolic"
        })
        let background_application_switcher_pref_group = new Adw.PreferencesGroup({
            title: _('Properties'),
        });
        background_application_page.add(background_application_switcher_pref_group);
        background_application_switcher_pref_group.add(buildSwitcherAdw(settings, "switch-application-behaves-like-switch-windows", [], [], _("Make the Application Switcher Show Only First Preview"), _("Don't group windows of the same application in a subswitcher.")));
        background_application_switcher_pref_group.add(buildRangeAdw(settings, "desaturate-factor", [0, 1, 0.001, [0.25, 0.5, 0.75]], _("Desaturate"), _("Larger means more desaturation."), true));

        let color_row = new Adw.ExpanderRow({
            title: _("Tint"),
        });
        background_application_switcher_pref_group.add(color_row);

        let use_tint_switch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
            active: settings.get_boolean("use-tint"),
        });
        settings.bind("use-tint", use_tint_switch, "active", Gio.SettingsBindFlags.DEFAULT);
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
            let stc_c = settings.get_value("switcher-background-color").deep_unpack();
            let stc_rgba = new Gdk.RGBA();
            stc_rgba.red = stc_c[0];
            stc_rgba.green = stc_c[1];
            stc_rgba.blue = stc_c[2];
            stc_rgba.alpha = 1
            tint_color_button.set_rgba(stc_rgba);
        });

        let tint_use_theme_color_button = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
            active: settings.get_boolean('tint-use-theme-color')
        });

        tint_set_to_theme_color_button.set_sensitive(!tint_use_theme_color_button.active);
        tint_color_button.set_sensitive(!tint_use_theme_color_button.active);
        tint_use_theme_color_button.connect("notify::active",  (widget) => {
            settings.set_boolean("tint-use-theme-color", widget.active);
            tint_set_to_theme_color_button.set_sensitive(!widget.active);
            tint_color_button.set_sensitive(!widget.active);
        })

        let use_theme_color_label = new Gtk.Label({
            label: "Use Gnome-Shell Theme",
            valign: Gtk.Align.CENTER,
        });

        choose_tint_box.append(use_theme_color_label);
        choose_tint_box.append(tint_use_theme_color_button);
        choose_tint_box.append(tint_set_to_theme_color_button);
        choose_tint_box.append(tint_color_button);
        let c = settings.get_value("tint-color").deep_unpack();
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
            settings.set_value("tint-color", val);
        });
        use_tint_switch.connect('notify::active', function(widget) {
            color_row.set_expanded(widget.get_active());
        });

        let reset_button = makeResetButton();
        reset_button.connect("clicked", function (_widget) {
            settings.reset("use-tint");
        });
        color_row.add_suffix(reset_button);
        color_row.add_row(buildRangeAdw(settings, "tint-blend", [0, 1, 0.001, [0.25, 0.5, 0.75]], _("Blend"), _("How much to blend the tint color; bigger means more tint color."), true));
        background_application_switcher_pref_group.add(buildSwitcherAdw(settings, "use-glitch-effect", [], [], _("Glitch")));

        let keybinding_page = new Adw.PreferencesPage({
            title: _("Keybindings"),
            icon_name: "keybinding-symbolic"
        });

        let keybinding_pref_group = new Adw.PreferencesGroup({
            title: _("System Actions Keybindings"),
            description: _("In case of conflicts with other window switchers, can unbind from system actions."),
        });
        keybinding_page.add(keybinding_pref_group);
        keybinding_pref_group.add(buildSwitcherAdw(settings, "bind-to-switch-windows", [], [], _("Bind to 'switch-windows'")));
        keybinding_pref_group.add(buildSwitcherAdw(settings, "bind-to-switch-applications", [], [], _("Bind to 'switch-applications'")));

        let custom_keybinding_pref_group = new Adw.PreferencesGroup({
            title: _("Internal Actions Keybindings"),
            description: _("Internal actions that will not conflict with other window switchers.")
        });
        keybinding_page.add(custom_keybinding_pref_group);
        custom_keybinding_pref_group.add(buildShortcutButtonAdw(settings, "coverflow-switch-windows", _("Coverflow Switch Windows Shortcut"), _("Activate window switcher.")));
        custom_keybinding_pref_group.add(buildShortcutButtonAdw(settings, "coverflow-switch-applications", _("Coverflow Switch Applications Shortcut"), _("Activate application switcher.")));

        let pcorrection_pref_group = new Adw.PreferencesGroup({
            title: _("Advanced Options"),
        });

        pcorrection_pref_group.add(buildDropDownAdw(settings, "perspective-correction-method", [
            { id: "None", name: _("None") },
            { id: "Move Camera", name: _("Move Camera") },
            { id: "Adjust Angles", name: _("Adjust Angles") }],
            _("Perspective Correction"), _("Method to make off-center switcher look centered.")));

        pcorrection_pref_group.add(buildSwitcherAdw(settings, "verbose-logging", [], [], _("Verbose Logging"), _("Log debug and normal messages.")));
        switcher_page.add(pcorrection_pref_group);

        let highlight_color_row = new Adw.ExpanderRow({
            title: _("Highlight Window Under Mouse"),
            subtitle: _("Draw a colored highlight on window under the mouse to know the effects of clicking."),
        });
        window_size_pref_group.add(highlight_color_row);

        let highlight_switch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
            active: settings.get_boolean("highlight-mouse-over"),
        });
        settings.bind("highlight-mouse-over", highlight_switch, "active", Gio.SettingsBindFlags.DEFAULT);
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
            let stc_c = settings.get_value("switcher-background-color").deep_unpack();
            let stc_rgba = new Gdk.RGBA();
            stc_rgba.red = stc_c[0];
            stc_rgba.green = stc_c[1];
            stc_rgba.blue = stc_c[2];
            stc_rgba.alpha = 1
            highlight_color_button.set_rgba(stc_rgba);
        });

        let highlight_use_theme_color_button = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
            active: settings.get_boolean('highlight-use-theme-color')
        });
        highlight_set_to_theme_color_button.set_sensitive(!highlight_use_theme_color_button.active);
        highlight_color_button.set_sensitive(!highlight_use_theme_color_button.active);
        highlight_use_theme_color_button.connect('notify::active', (button) => {
            settings.set_boolean("highlight-use-theme-color", button.active);
            highlight_set_to_theme_color_button.set_sensitive(!button.active);
            highlight_color_button.set_sensitive(!button.active)
        });

        choose_highlight_box.append(highlight_use_theme_color_label);
        choose_highlight_box.append(highlight_use_theme_color_button);
        choose_highlight_box.append(highlight_set_to_theme_color_button);
        choose_highlight_box.append(highlight_color_button);
        let hc = settings.get_value("highlight-color").deep_unpack();
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
            settings.set_value("highlight-color", val);
        });
        highlight_switch.connect('notify::active', function(widget) {
            highlight_color_row.set_expanded(widget.get_active());
        });

        let highlight_reset_button = makeResetButton();
        highlight_reset_button.connect("clicked", function (_widget) {
            settings.reset("highlight-mouse-over");
        });
        highlight_color_row.add_suffix(highlight_reset_button);

        window_size_pref_group.add(buildSwitcherAdw(settings, "raise-mouse-over", [], [], _("Raise Window Under Mouse"), _("Raise the window under the mouse above all others.")));

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

        let links_pref_group = new Adw.PreferencesGroup();
        let code_row = new Adw.ActionRow({
            icon_name: "code-symbolic",
            title: _("Code (create pull requests, report issues, etc.)")
        });
        let github_link = new Gtk.LinkButton({
            label: "Github",
            uri: "https://github.com/dmo60/CoverflowAltTab",
        });

        let donate_row = new Adw.ActionRow({
            title: _("Donate"),
            icon_name: "support-symbolic",
        })
        let donate_link = new Gtk.LinkButton({
            label: "Liberapay",
            uri: "https://liberapay.com/dsheeler/donate",
        });

        let donate_link_paypal = new Gtk.LinkButton({
            label: "PayPal",

            uri: "https://paypal.me/DanielSheeler?country.x=US&locale.x=en_US",
        });

        let donate_link_github = new Gtk.LinkButton({
            label: "Github",

            uri: "https://github.com/sponsors/dsheeler",
        });

        let translate_row = new Adw.ActionRow({
            title: _("Translate"),
            icon_name: "translate-symbolic",
        })
        let translate_link = new Gtk.LinkButton({
            label: "Weblate",
            uri: "https://hosted.weblate.org/engage/coverflow-alt-tab/",
        });
        code_row.add_suffix(github_link);
        code_row.set_activatable_widget(github_link);
        translate_row.add_suffix(translate_link);
        translate_row.set_activatable_widget(translate_link);
        donate_row.add_suffix(donate_link);
        donate_row.add_suffix(donate_link_paypal);
        donate_row.add_suffix(donate_link_github);

        links_pref_group.add(code_row);
        links_pref_group.add(translate_row);
        links_pref_group.add(donate_row);

        label_box.append(label);
        label_box.append(another_label);
        icon_box.append(icon_image);
        icon_box.append(label_box);
        contribute_icon_pref_group.add(icon_box);

        contribution_page.add(contribute_icon_pref_group);
        contribution_page.add(links_pref_group)

        window.add(switcher_page);
        window.add(animation_page);
        window.add(icon_page);
        window.add(window_size_page);
        window.add(background_application_page);
        window.add(keybinding_page);
        // window.add(appearance_page);
        window.add(contribution_page);

        /* The prefs-default-width/height save/restore mechanism
        stolen from openweather refined:
        openweather-extension@penguin-teal.github.io */
        let prefsWidth = settings.get_double("prefs-default-width");
        let prefsHeight = settings.get_double("prefs-default-height");

        window.set_default_size(prefsWidth, prefsHeight);
        window.set_search_enabled(true);

        window.connect("close-request", () => {
            let currentWidth = window.default_width;
            let currentHeight = window.default_height;
            // Remember user window size adjustments.
            if (currentWidth !== prefsWidth || currentHeight !== prefsHeight)
            {
              settings.set_double("prefs-default-width", currentWidth);
              settings.set_double("prefs-default-height", currentHeight);
            }
        });
    }
}

function buildSwitcherAdw(settings, key, dependant_widgets, inverse_dependant_widgets, title, subtitle=null) {
    let pref = new Adw.ActionRow({
        title: title,
    });
    if (subtitle !== null) {
        pref.set_subtitle(subtitle);
    }

    let switcher = new Gtk.Switch({
        valign: Gtk.Align.CENTER,
        active: settings.get_boolean(key)
    });

    switcher.expand = false;
    switcher.connect('notify::active', function(widget) {
        settings.set_boolean(key, widget.active);
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

    let reset_button = makeResetButton();
    reset_button.connect("clicked", function(_widget) {
        settings.reset(key);
        switcher.set_active(settings.get_boolean(key));
    })
    pref.add_suffix(reset_button);
    return pref;
}

function buildRangeAdw(settings, key, values, title, subtitle="", draw_value=false) {
    let [min, max, step, defvs] = values;

    let pref = new Adw.ActionRow({
        title: title,
    });
    if (subtitle !== null && subtitle !== "") {
        pref.set_subtitle(subtitle);
    }
    let range = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, min, max, step);
    range.set_value(settings.get_double(key));
    if (draw_value) {
        range.set_draw_value(true);
        range.set_value_pos(Gtk.PositionType.RIGHT)
    }
    for (let defv of defvs) {
        range.add_mark(defv, Gtk.PositionType.BOTTOM, null);
    }
    range.set_size_request(200, -1);

    range.connect('value-changed', function(slider) {
        settings.set_double(key, slider.get_value());
    });

    pref.set_activatable_widget(range);
    pref.add_suffix(range)

    let reset_button = makeResetButton();
    reset_button.connect("clicked", function(_widget) {
        settings.reset(key);
        range.set_value(settings.get_double(key));
    });
    pref.add_suffix(reset_button);
    return pref;
}

function buildRadioAdw(settings, key, buttons, title, subtitle=null) {
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
        if (button.choice === settings.get_string(key)) {
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
                settings.set_string(key, button.choice);
                for (let sensitive_widget of button.sensitive_widgets) {
                    sensitive_widget.set_sensitive(true);
                }
                for (let insensitive_widget of button.insensitive_widgets) {
                    insensitive_widget.set_sensitive(false);
                }
            }
        });
        hbox.append(radio);
    };

    let reset_button = makeResetButton();
    reset_button.connect("clicked", function(_widget) {
        settings.reset(key);
        for (let button of buttons) {
            if (button.choice === settings.get_string(key)) {
                radio_for_button[button.choice].set_active(true);
            }
        }
    });

    pref.set_activatable_widget(hbox);
    pref.add_suffix(hbox);
    pref.add_suffix(reset_button);
    return pref;
};

function buildSpinAdw(settings, key, values, title, subtitle=null) {
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
    spin.set_value(settings.get_int(key));

    spin.connect('value-changed', function(widget) {
        settings.set_int(key, widget.get_value());
    });

    pref.set_activatable_widget(spin);
    pref.add_suffix(spin);

    let reset_button = makeResetButton();
    reset_button.connect("clicked", function(_widget) {
        settings.reset(key);
        spin.set_value(settings.get_int(key));
    });

    pref.add_suffix(reset_button);

    return pref;
}

function buildDropDownAdw(settings, key, values, title, subtitle=null) {
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
        if (item.id === settings.get_string(key)) {
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
        settings.set_string(key, values[idx].id);
    });
    pref.set_activatable_widget(chooser);
    pref.add_suffix(chooser);

    let reset_button = makeResetButton();
    reset_button.connect("clicked", function(_widget) {
        settings.reset(key);
        for (let i = 0; i < values.length; i++) {
            let item = values[i];
            if (item.id === settings.get_string(key)) {
                chooser.set_selected(i);
                break;
            }
        }
    });
    pref.add_suffix(reset_button);
    return pref;
}

function buildShortcutButtonAdw(settings, actionName, title, subtitle) {
    let shortcutButton = new ShortcutButton(settings, {
        hhomogeneous: false,
    }, actionName);
    settings.connect("changed::" + actionName, () => {
        shortcutButton.keybinding = settings.get_strv(actionName)[0];
    });
    shortcutButton.keybinding = settings.get_strv(actionName)[0];

    shortcutButton.connect("notify::keybinding", () => {
        settings.set_strv(actionName, [shortcutButton.keybinding]);
        settings.set_strv(actionName + "-backward", ["<Shift>" + shortcutButton.keybinding])
    });

    let shortcutActionRow = new Adw.ActionRow({
        title: _(title),
        subtitle: _(subtitle)
    });

    shortcutActionRow.set_activatable_widget(shortcutButton);
    shortcutActionRow.add_suffix(shortcutButton);
    return shortcutActionRow;
}
