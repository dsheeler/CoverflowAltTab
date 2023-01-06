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
const { Adw, Gdk, GLib, Gtk } = imports.gi;

const Config = imports.misc.config;

const Gettext = imports.gettext.domain('coverflow');
const _ = Gettext.gettext;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const UIFolderPath = Me.dir.get_child('ui').get_path();
const ExtensionImports = Me.imports;
const Lib = ExtensionImports.lib;

const SCHEMA = "org.gnome.shell.extensions.coverflowalttab";

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

function init() {
	let iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
  	iconTheme.add_search_path(`${UIFolderPath}/icons`);
	Lib.initTranslations("coverflow");
}

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

function getVersionString(_page) {
	return _('Version %d').format(Me.metadata.version);
}

function fillPreferencesWindow(window) {
	let settings = Lib.getSettings(SCHEMA);
	let general_page = new Adw.PreferencesPage({
		title: _('General'),
		icon_name: 'general-symbolic',
	});

	let switcher_pref_group = new Adw.PreferencesGroup({
		title: _('Switcher'),
	});
	switcher_pref_group.add(buildRadioAdw(settings, "switcher-style", [_("Coverflow"), _("Timeline")], _("Style"), _("Pick the type of switcher.")))
	switcher_pref_group.add(buildSpinAdw(settings, "offset", [-500, 500, 1, 10], _("Vertical Offset"), _("Positive value moves everything down, negative up.")));
	switcher_pref_group.add(buildRadioAdw(settings, "position", [_("Bottom"), _("Top")], _("Window Title Position"), _("Place window title above or below the switcher.")));
	switcher_pref_group.add(buildSwitcherAdw(settings, "enforce-primary-monitor", _("Enforce Primary Monitor"), _("Always show on the primary monitor, otherwise, show on the active monitor.")));

	let behavior_pref_group = new Adw.PreferencesGroup({
		title: _("Behavior"),
	});
	behavior_pref_group.add(buildSwitcherAdw(settings, "hide-panel", _("Hide Panel"), _("Hide panel when switching widnows.")));

	let animation_pref_group = new Adw.PreferencesGroup({
		title: _('Animation'),
	});

    animation_pref_group.add(buildDropDownAdw(settings, "easing-function", easing_options, "Easing Function", "Determine how windows move."));
    animation_pref_group.add(buildRangeAdw(settings, "animation-time", [0.01, 2, 0.001, [0.5, 1, 1.5]], _("Duration"), _("In seconds."), true));
	animation_pref_group.add(buildSwitcherAdw(settings, "randomize-animation-times", _("Randomize Durations"), _("Each animation duration assigned randomly between 0 and configured duration")));

	let windows_pref_group = new Adw.PreferencesGroup({
		title: _('Switcher Windows'),
	});
	options = [{
	    id: 'current', name: _("Current workspace only")
	}, {
	    id: 'all', name: _("All workspaces")
	}, {
	    id: 'all-currentfirst', name: _("All workspaces, current first")
	}];
	windows_pref_group.add(buildDropDownAdw(settings, "current-workspace-only", options, _("Workspaces"), _("Switch between windows on current or on all workspaces")));
	windows_pref_group.add(buildSwitcherAdw(settings, "switch-per-monitor", _("Current Monitor"), _("Switch between windows on current monitor")));

	let icon_pref_group = new Adw.PreferencesGroup({
		title: _("Icon"),
	});
	icon_pref_group.add(buildRadioAdw(settings, "icon-style", [_("Classic"), _("Overlay")], _("Application Icon Style")));
	icon_pref_group.add(buildRangeAdw(settings, "overlay-icon-size", [0, 1024, 1, [32, 64, 128, 256, 512]], _("Overlay Icon Size"), _("Set the overlay icon size in pixels."), true));
	icon_pref_group.add(buildRangeAdw(settings, "overlay-icon-opacity", [0, 1, 0.001, [0.25, 0.5, 0.75]], _("Overlay Icon Opacity"), _("Set the overlay icon opacity."), true));
	icon_pref_group.add(buildSwitcherAdw(settings, "icon-has-shadow", _("Icon Shadow")));

	let window_size_pref_group = new Adw.PreferencesGroup({
		title: _("Window Size")
	});
	window_size_pref_group.add(buildRangeAdw(settings, "preview-to-monitor-ratio", [0, 1, 0.001, [0.250, 0.500, 0.750]], _("Window Preview Size to Monintor Size Ratio"), _("Maximum ratio of window preview size to monitor size."), true));
	window_size_pref_group.add(buildRangeAdw(settings, "preview-scaling-factor", [0, 1, 0.001, [0.250, 0.500, 0.800]], _("Off-center Size Factor"), _("Factor by which to successively shrink previews off to the side"), true));

	let background_pref_group = new Adw.PreferencesGroup({
		title: _('Background'),
	});
	background_pref_group.add(buildRangeAdw(settings, "dim-factor", [0, 1, 0.001, [0.25, 0.5, 0.75]], _("Background Dim-factor"), _("Smaller means darker."), true));

	let keybinding_pref_group = new Adw.PreferencesGroup({
		title: _("Keybindings"),
	});
	keybinding_pref_group.add(buildSwitcherAdw(settings, "bind-to-switch-windows", _("Bind to 'switch-windows'")));
	keybinding_pref_group.add(buildSwitcherAdw(settings, "bind-to-switch-applications", _("Bind to 'switch-applications'")));

	general_page.add(switcher_pref_group);
	general_page.add(animation_pref_group);
	general_page.add(icon_pref_group);
	general_page.add(windows_pref_group);
	general_page.add(window_size_pref_group);
	general_page.add(behavior_pref_group);
	general_page.add(background_pref_group);
	general_page.add(keybinding_pref_group);


	let pcorrection_pref_group = new Adw.PreferencesGroup({
		title: _("Perspective Correction")
	})
	pcorrection_pref_group.add(buildDropDownAdw(settings, "perspective-correction-method", [
		{ id: "None", name:_("None") },
		{ id: "Move Camera", name: _("Move Camera") },
		{ id: "Adjust Angles", name: _("Adjust Angles")}],
		_("Perspective Correction"), ("Method to make off-center switcher look centered.")));

	let highlight_mouse_over_pref_group = new Adw.PreferencesGroup({
		title: _("Highlight Window Under Mouse"),
	});
	highlight_mouse_over_pref_group.add(buildSwitcherAdw(settings, "highlight-mouse-over", _("Highlight Window Under Mouse"), _("Draw embelishment on window under the mouse to know the effects of clicking.")));
	highlight_mouse_over_pref_group.add(buildSwitcherAdw(settings, "raise-mouse-over", _("Raise Window Under Mouse"), _("Raise the window under the mouse above all others.")));

	let tweaks_page = new Adw.PreferencesPage({
		title: _('Tweaks'),
		icon_name: 'applications-symbolic',
	});
	tweaks_page.add(pcorrection_pref_group);
	tweaks_page.add(highlight_mouse_over_pref_group);

	let appearance_page = new Adw.PreferencesPage({
		title: _("Appearance"),
		icon_name: 'dash-symbolic',
	});

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
		pixel_size: 128,
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
		label: getVersionString(),
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
		title: _("Support me with a Donation"),
		icon_name: "support-symbolic",
	})
	let donate_link = new Gtk.LinkButton({
		label: "Liberapay",
		uri: "https://liberapay.com/dsheeler/donate",
	});

	code_row.add_suffix(github_link);
	code_row.set_activatable_widget(github_link);
	donate_row.add_suffix(donate_link);
	donate_row.set_activatable_widget(donate_link);
	links_pref_group.add(code_row);
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
	window.add(tweaks_page)
	window.add(contribution_page);

	window.set_search_enabled(true);
}

function buildSwitcherAdw(settings, key, title, subtitle=null) {
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

	reset_button = makeResetButton();
	reset_button.connect("clicked", function(widget) {
		settings.reset(key);
		switcher.set_active(settings.get_boolean(key));
	})
	pref.add_suffix(reset_button);
	return pref;
}

function buildRangeAdw(settings, key, values, title, subtitle=null, draw_value=false) {
	let [min, max, step, defvs] = values;

	let pref = new Adw.ActionRow({
		title: title,
	});
	if (subtitle != null) {
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

	reset_button = makeResetButton();
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
	for (let button of buttons) {
		radio = new Gtk.ToggleButton({group: radio, label: button});
		if (getBaseString(button) == settings.get_string(key)) {
			radio.set_active(true);
		}
		radio_for_button[button] = radio;
		radio.connect('toggled', function(widget) {
			if (widget.get_active()) {
				settings.set_string(key, getBaseString(widget.get_label()));
			}
		});

		hbox.append(radio);
	};

	reset_button = makeResetButton();
	reset_button.connect("clicked", function(widget) {
		settings.reset(key);
		for (let button of buttons) {
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

	reset_button = makeResetButton();
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

	reset_button = makeResetButton();
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
