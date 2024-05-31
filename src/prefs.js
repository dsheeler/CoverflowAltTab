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

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'

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

function getBaseString(translatedString) {
	switch (translatedString) {
		case _("Coverflow"): return "Coverflow";
		case _("Timeline"): return "Timeline";
		case _("Bottom"): return "Bottom";
		case _("Top"): return "Top";
		case _("Classic"): return "Classic";
		case _("Overlay"): return "Overlay";
		default: return translatedString;
	}
}

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
		let general_page = new Adw.PreferencesPage({
			title: _('General'),
			icon_name: 'general-symbolic',
		});

		let switcher_pref_group = new Adw.PreferencesGroup({
			title: _('Switcher'),
		});
		let switcher_looping_method_buttons = new Map([ [_("Flip Stack"), [[],[]]], [_("Carousel"), [[],[]]]]);

		let switcher_looping_method_row = buildRadioAdw(settings, "switcher-looping-method", switcher_looping_method_buttons, _("Looping Method"), _("How to cycle through windows."));
		switcher_pref_group.add(buildRadioAdw(settings, "switcher-style", new Map([ [_("Coverflow"), [[switcher_looping_method_row], []]], [_("Timeline"), [[],[switcher_looping_method_row]] ]]), _("Style"), _("Pick the type of switcher.")))
		switcher_pref_group.add(buildSpinAdw(settings, "offset", [-500, 500, 1, 10], _("Vertical Offset"), _("Positive value moves everything down, negative up.")));
		switcher_pref_group.add(buildRadioAdw(settings, "position", new Map([ [_("Bottom"), [[], []]], [_("Top"), [[],[]]]]), _("Window Title Position"), _("Place window title above or below the switcher.")));
		switcher_pref_group.add(buildSwitcherAdw(settings, "enforce-primary-monitor", [], [], _("Enforce Primary Monitor"), _("Always show on the primary monitor, otherwise, show on the active monitor.")));

		switcher_pref_group.add(switcher_looping_method_row);
		switcher_pref_group.add(buildSwitcherAdw(settings, "hide-panel", [], [], _("Hide Panel"), _("Hide panel when switching windows.")));
		switcher_pref_group.add(buildSwitcherAdw(settings, "invert-swipes", [], [], _("Invert Swipes"), _("Swipe content instead of view.")));
        let animation_pref_group = new Adw.PreferencesGroup({
            title: _('Animation'),
        });

        animation_pref_group.add(buildDropDownAdw(settings, "easing-function", easing_options, "Easing Function", "Determine how windows move."));
        animation_pref_group.add(buildRangeAdw(settings, "animation-time", [0.01, 20, 0.001, [0.5, 1, 1.5]], _("Duration [s]"), "", true));
        animation_pref_group.add(buildSwitcherAdw(settings, "randomize-animation-times", [], [], _("Randomize Durations"), _("Each animation duration assigned randomly between 0 and configured duration.")));

        let windows_pref_group = new Adw.PreferencesGroup({
            title: _('Switcher Windows'),
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

        let icon_pref_group = new Adw.PreferencesGroup({
            title: _("Icons"),
        });

        
		let size_row = buildRangeAdw(settings, "overlay-icon-size", [16, 1024, 1, [32, 64, 128, 256, 512]], _("Overlay Icon Size"), _("Set the overlay icon size in pixels."), true);
        let opacity_row = buildRangeAdw(settings, "overlay-icon-opacity", [0, 1, 0.001, [0.25, 0.5, 0.75]], _("Overlay Icon Opacity"), _("Set the overlay icon opacity."), true);
		let buttons = new Map([[_("Classic"), [[],[size_row, opacity_row]]], [_("Overlay"), [[size_row, opacity_row], []]], [_("Attached"), [[size_row, opacity_row], []]]]);
		let style_row = buildRadioAdw(settings, "icon-style", buttons, _("Application Icon Style"));
        icon_pref_group.add(style_row);
        icon_pref_group.add(size_row);
        icon_pref_group.add(opacity_row);
        icon_pref_group.add(buildSwitcherAdw(settings, "icon-has-shadow", [], [], _("Icon Shadow")));

        let window_size_pref_group = new Adw.PreferencesGroup({
            title: _("Window Properties")
        });
        window_size_pref_group.add(buildRangeAdw(settings, "preview-to-monitor-ratio", [0, 1, 0.001, [0.250, 0.500, 0.750]], _("Window Preview Size to Monitor Size Ratio"), _("Maximum ratio of window preview size to monitor size."), true));
        window_size_pref_group.add(buildRangeAdw(settings, "preview-scaling-factor", [0, 1, 0.001, [0.250, 0.500, 0.800]], _("Off-center Size Factor"), _("Factor by which to successively shrink previews off to the side."), true));

        let background_application_switcher_pref_group = new Adw.PreferencesGroup({
            title: _('Application Switcher'),
        });
        background_application_switcher_pref_group.add(buildSwitcherAdw(settings, "switch-application-behaves-like-switch-windows", [], [], _("Make the Application Switcher Behave Like the Window Switcher"), _("Don't group windows of the same application in a subswitcher.")));
        background_application_switcher_pref_group.add(buildRangeAdw(settings, "desaturate-factor", [0, 1, 0.001, [0.25, 0.5, 0.75]], _("Desaturate"), _("Larger means more desaturation."), true));
        background_application_switcher_pref_group.add(buildRangeAdw(settings, "blur-radius", [0, 20, 0.1, [5, 10, 15]], _("Blur"), _("Larger means blurrier."), true));

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

        let color_button = new Gtk.ColorDialogButton({
            valign: Gtk.Align.CENTER,
            dialog: color_dialog,
        });

        let use_theme_color_button = new Gtk.Button({
            label: _("Set to Theme Color"),
            valign: Gtk.Align.CENTER,
        });

		use_theme_color_button.connect('clicked', () => {
			let c = settings.get_value("switcher-background-color").deep_unpack();
			let rgba = color_button.rgba;
			rgba.red = c[0];
			rgba.green = c[1];
			rgba.blue = c[2];
			rgba.alpha = 1
			color_button.set_rgba(rgba);
		});

        choose_tint_box.append(use_theme_color_button);
        choose_tint_box.append(color_button);
        let c = settings.get_value("tint-color").deep_unpack();
        let rgba = color_button.rgba;
        rgba.red = c[0];
        rgba.green = c[1];
        rgba.blue = c[2];
        rgba.alpha = 1
        color_button.set_rgba(rgba);
        color_button.connect('notify::rgba', _ => {
            let c = color_button.rgba;
            let val = new GLib.Variant("(ddd)", [c.red, c.green, c.blue]);
            settings.set_value("tint-color", val);
        });
		use_tint_switch.connect('notify::active', function(widget) {
			color_row.set_expanded(widget.get_active());
		});

        let reset_button = makeResetButton();
        reset_button.connect("clicked", function (widget) {
            settings.reset("use-tint");
        });
        color_row.add_suffix(reset_button);
		color_row.add_row(buildRangeAdw(settings, "tint-blend", [0, 1, 0.001, [0.25, 0.5, 0.75]], _("Blend"), _("How much to blend the tint color; bigger means more tint color."), true));
        background_application_switcher_pref_group.add(buildSwitcherAdw(settings, "use-glitch-effect", [], [], _("Glitch")));

        let background_pref_group = new Adw.PreferencesGroup({
            title: _('Background'),
        });
        background_pref_group.add(buildRangeAdw(settings, "dim-factor", [0, 1, 0.001, [0.25, 0.5, 0.75]], _("Dim-factor"), _("Bigger means darker."), true));

        let keybinding_pref_group = new Adw.PreferencesGroup({
            title: _("Keybindings"),
        });
        keybinding_pref_group.add(buildSwitcherAdw(settings, "bind-to-switch-windows", [], [], _("Bind to 'switch-windows'")));
        keybinding_pref_group.add(buildSwitcherAdw(settings, "bind-to-switch-applications", [background_application_switcher_pref_group], [], _("Bind to 'switch-applications'")));

        let pcorrection_pref_group = new Adw.PreferencesGroup({
            title: _("Perspective Correction")
        })
        pcorrection_pref_group.add(buildDropDownAdw(settings, "perspective-correction-method", [
            { id: "None", name: _("None") },
            { id: "Move Camera", name: _("Move Camera") },
            { id: "Adjust Angles", name: _("Adjust Angles") }],
            _("Perspective Correction"), ("Method to make off-center switcher look centered.")));

        let highlight_color_row = new Adw.ExpanderRow({
            title: _("Highlight Window Under Mouse"),
            subtitle: _("Draw a colored highlight on window under the mouse to know the effects of clicking."),
        });
        window_size_pref_group.add(highlight_color_row);

        choose_tint_box.append(use_theme_color_button);
        choose_tint_box.append(color_button);
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

        let highlight_color_button = new Gtk.ColorDialogButton({
            valign: Gtk.Align.CENTER,
            dialog: highlight_color_dialog,
        });
        
        let highlight_use_theme_color_button = new Gtk.Button({
            label: _("Set to Theme Color"),
            valign: Gtk.Align.CENTER,
        });
        highlight_use_theme_color_button.connect('clicked', () => {
			let c = settings.get_value("switcher-background-color").deep_unpack();
			let rgba = highlight_color_button.rgba;
			rgba.red = c[0];
			rgba.green = c[1];
			rgba.blue = c[2];
			rgba.alpha = 1
			highlight_color_button.set_rgba(rgba);
		});

        choose_highlight_box.append(highlight_use_theme_color_button);
        choose_highlight_box.append(highlight_color_button);
        let hc = settings.get_value("highlight-color").deep_unpack();
        let hrgba = highlight_color_button.rgba;
        hrgba.red = hc[0];
        hrgba.green = hc[1];
        hrgba.blue = hc[2];
        hrgba.alpha = 1
        highlight_color_button.set_rgba(hrgba);
        highlight_color_button.connect('notify::rgba', _ => {
            let c = highlight_color_button.rgba;
            let val = new GLib.Variant("(ddd)", [c.red, c.green, c.blue]);
            settings.set_value("highlight-color", val);
        });
		highlight_switch.connect('notify::active', function(widget) {
			highlight_color_row.set_expanded(widget.get_active());
		});

        let highlight_reset_button = makeResetButton();
        highlight_reset_button.connect("clicked", function (widget) {
            settings.reset("highlight-mouse-over");
        });
        highlight_color_row.add_suffix(highlight_reset_button);

		window_size_pref_group.add(buildSwitcherAdw(settings, "raise-mouse-over", [], [], _("Raise Window Under Mouse"), _("Raise the window under the mouse above all others.")));

        /*let tweaks_page = new Adw.PreferencesPage({
            title: _('Tweaks'),
            icon_name: 'applications-symbolic',
        });
        tweaks_page.add(pcorrection_pref_group);
        tweaks_page.add(highlight_mouse_over_pref_group);*/

        general_page.add(switcher_pref_group);
        general_page.add(animation_pref_group);
        general_page.add(icon_pref_group);
        general_page.add(windows_pref_group);
        general_page.add(window_size_pref_group);
        general_page.add(background_pref_group);
        general_page.add(background_application_switcher_pref_group);
        general_page.add(pcorrection_pref_group);
        general_page.add(keybinding_pref_group);

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

        window.add(general_page);
        // window.add(appearance_page);
        window.add(contribution_page);

        window.set_search_enabled(true);
    }
}

function buildSwitcherAdw(settings, key, dependant_widgets, inverse_dependant_widgets, title, subtitle=null) {
	let pref = new Adw.ActionRow({
		title: title,
	});
	if (subtitle != null) {
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
	reset_button.connect("clicked", function(widget) {
		settings.reset(key);
		switcher.set_active(settings.get_boolean(key));
	})
	pref.add_suffix(reset_button);
	return pref;
}

function buildRangeAdw(settings, key, values, title, subtitle="", draw_value=false) {
	let [min, max, step, defvs] = values;

	let pref = new Adw.ActionRow({
		title: title,	});
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
	reset_button.connect("clicked", function(widget) {
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
	if (subtitle != null) {
		pref.set_subtitle(subtitle);
	}
	let hbox = new Gtk.Box({
	 	orientation: Gtk.Orientation.HORIZONTAL,
	 	spacing: 10,
	 	valign: Gtk.Align.CENTER,
 	});

	let radio = new Gtk.ToggleButton();

	let radio_for_button = {};
	for (let button_name of buttons.keys()) {
		radio = new Gtk.ToggleButton({group: radio, label: button_name});
		radio_for_button[button_name] = radio;
		if (getBaseString(button_name) == settings.get_string(key)) {
			radio.set_active(true);
			for (let pref_row of buttons.get(button_name)[0]) {
				pref_row.set_sensitive(radio_for_button[button_name].get_active());
			}
			for (let pref_row of buttons.get(button_name)[1]) {
				pref_row.set_sensitive(!radio_for_button[button_name].get_active());
			}
		}
		radio.connect('toggled', function(widget) {
			if (widget.get_active()) {
				settings.set_string(key, getBaseString(widget.get_label()));
			}
			for (let pref_row of buttons.get(button_name)[0]) {
				pref_row.set_sensitive(widget.get_active());
			}
			for (let pref_row of buttons.get(button_name)[1]) {
				pref_row.set_sensitive(!widget.get_active());
			}
		});
		hbox.append(radio);
	};
	
	let reset_button = makeResetButton();
	reset_button.connect("clicked", function(widget) {
		settings.reset(key);
		for (let button of buttons.keys()) {
			if (getBaseString(button) == settings.get_string(key)) {
				radio_for_button[button].set_active(true);
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
	if (subtitle != null) {
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
	reset_button.connect("clicked", function(widget) {
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
	if (subtitle != null) {
		pref.set_subtitle(subtitle);
	}
	let model = new Gtk.StringList();
	let chosen_idx = 0;
	for (let i = 0; i < values.length; i++) {
		let item = values[i];
		model.append(item.name);
		if (item.id == settings.get_string(key)) {
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
	reset_button.connect("clicked", function(widget) {
		settings.reset(key);
		for (let i = 0; i < values.length; i++) {
			let item = values[i];
			if (item.id == settings.get_string(key)) {
				chooser.set_selected(i);
				break;
			}
		}
	});
	pref.add_suffix(reset_button);
	return pref;
}
