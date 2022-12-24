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
 * Based on JustPerfection & dash2doc-lite
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

let settings;

function init() {
	settings = Lib.getSettings(SCHEMA);
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

function fillPreferencesWindow(window) {
	let general_page = new Adw.PreferencesPage({
		title: _('General'),
		icon_name: 'general-symbolic',
	});

	let switcher_pref_group = new Adw.PreferencesGroup({
		title: _('Switcher'),
	});
	switcher_pref_group.add(buildRadioAdw("switcher-style", [_("Coverflow"), _("Timeline")], _("Style"), _("Pick the type of switcher.")))
	switcher_pref_group.add(buildSpinAdw("offset", [-500, 500, 1, 10], _("Vertical Offset"), _("Positive value moves everything down, negative up.")));
	switcher_pref_group.add(buildRadioAdw("position", [_("Bottom"), _("Top")], _("Window Title Position"), _("Place window title above or below the switcher.")));
	switcher_pref_group.add(buildSwitcherAdw("enforce-primary-monitor", _("Enforce Primary Monitor"), _("Always show on the primary monitor, otherwise, show on the active monitor.")));

	let behavior_pref_group = new Adw.PreferencesGroup({
		title: _("Behavior"),
	});
	behavior_pref_group.add(buildSwitcherAdw("hide-panel", _("Hide Panel"), _("Hide panel when switching widnows.")));

	let animation_pref_group = new Adw.PreferencesGroup({
		title: _('Animation'),
	});

    animation_pref_group.add(buildDropDownAdw("easing-function", easing_options, "Easing Function", "Determine how windows move."));
    animation_pref_group.add(buildRangeAdw("animation-time", [0.01, 2, 0.001, [0.5, 1, 1.5]], _("Duration"), _("In seconds."), true));
	animation_pref_group.add(buildSwitcherAdw("randomize-animation-times", _("Randomize Durations"), _("Each animation duration assigned randomly between 0 and configured duration")));

	let windows_pref_group = new Adw.PreferencesGroup({
		title: _('Windows'),
	});
	options = [{
	    id: 'current', name: _("Current workspace only")
	}, {
	    id: 'all', name: _("All workspaces")
	}, {
	    id: 'all-currentfirst', name: _("All workspaces, current first")
	}];
	windows_pref_group.add(buildDropDownAdw("current-workspace-only", options, _("Workspaces"), _("Switch between windows on current or on all workspaces")));
	windows_pref_group.add(buildSwitcherAdw("switch-per-monitor", _("Current Monitor"), _("Switch between windows on current monitor")));

	let pcorrection_pref_group = new Adw.PreferencesGroup({
		title: _("Perspective Correction")
	})
	pcorrection_pref_group.add(buildDropDownAdw("perspective-correction-method", [
		{ id: "None", name:_("None") },
		{ id: "Move Camera", name: _("Move Camera") },
		{ id: "Adjust Angles", name: _("Adjust Angles")}],
		_("Perspective Correction"), ("Method to make off-center switcher look centered.")));

	let keybinding_pref_group = new Adw.PreferencesGroup({
		title: _("Keybindings"),
	});
	keybinding_pref_group.add(buildSwitcherAdw("bind-to-switch-windows", _("Bind to 'switch-windows' keybinding")));
	keybinding_pref_group.add(buildSwitcherAdw("bind-to-switch-applications", _("Bind to 'switch-applications' keybinding")));

	general_page.add(switcher_pref_group);
	general_page.add(animation_pref_group);
	general_page.add(behavior_pref_group);
	general_page.add(windows_pref_group);
	general_page.add(keybinding_pref_group);

	let highlight_mouse_over_pref_group = new Adw.PreferencesGroup({
		title: _("Highlight Window Under Mouse"),
	});
	highlight_mouse_over_pref_group.add(buildSwitcherAdw("highlight-mouse-over", _("Highlight Window Under Mouse"), _("Draw embelishment on window under the mouse to know the effects of clicking.")));
	highlight_mouse_over_pref_group.add(buildSwitcherAdw("raise-mouse-over", _("Raise Window Under Mouse"), _("Raise the window under the mouse above all others.")));

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

	let icon_pref_group = new Adw.PreferencesGroup({
		title: _("Icon"),
	});
	icon_pref_group.add(buildRadioAdw("icon-style", [_("Classic"), _("Overlay")], _("Application Icon Style")));
	icon_pref_group.add(buildRangeAdw("overlay-icon-size", [0, 1024, 1, [32, 64, 128, 256, 512]], _("Overlay Icon Size"), _("Set the overlay icon size in pixels."), true));
	icon_pref_group.add(buildRangeAdw("overlay-icon-opacity", [0, 1, 0.01, [0.25, 0.5, 0.75]], _("Overlay Icon Opacity"), _("Set the overlay icon opacity."), true));
	icon_pref_group.add(buildSwitcherAdw("icon-has-shadow", _("Draw Icon with a Shadow")));

	let window_pref_group = new Adw.PreferencesGroup({
		title: _("Window Size")
	});
	window_pref_group.add(buildRangeAdw("preview-to-monitor-ratio", [0, 1, 0.01, [0.250, 0.500, 0.750]], _("Preview to Monintor Ratio"), _("Maximum ratio of preview to monitor size."), true));
	window_pref_group.add(buildRangeAdw("preview-scaling-factor", [0, 1, 0.01, [0.250, 0.500, 0.800]], _("Off-center Size Factor"), _("Factor by which to shrink previews off to the sides."), true));

	let background_pref_group = new Adw.PreferencesGroup({
		title: _('Background'),
	});
	background_pref_group.add(buildRangeAdw("dim-factor", [0, 1, 0.01, [0.25, 0.5, 0.75]], _("Background Dim-factor"), _("Smaller means darker.")));

	appearance_page.add(icon_pref_group);
	appearance_page.add(window_pref_group);
	appearance_page.add(background_pref_group);

	window.add(general_page);
	window.add(appearance_page);
	window.add(tweaks_page)

	window.set_search_enabled(true);
}

function buildSwitcherAdw(key, title, subtitle=null) {
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
	return pref;
}

function buildRangeAdw(key, values, title, subtitle=null, draw_value=false) {
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
		log(key, slider.get_value());
		settings.set_double(key, slider.get_value());
	});

	pref.set_activatable_widget(range);
	pref.add_suffix(range)

	return pref;
}

function buildRadioAdw(key, buttons, title, subtitle=null) {
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

	for (let button of buttons) {
		radio = new Gtk.ToggleButton({group: radio, label: button});
		if (getBaseString(button) == settings.get_string(key)) {
			radio.set_active(true);
		}

		radio.connect('toggled', function(widget) {
			if (widget.get_active()) {
				settings.set_string(key, getBaseString(widget.get_label()));
			}
		});

		hbox.append(radio);
	};
	pref.set_activatable_widget(hbox);
	pref.add_suffix(hbox);
	return pref;
};

function buildSpinAdw(key, values, title, subtitle=null) {
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
	return pref;
}

function buildDropDownAdw(key, values, title, subtitle=null) {
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
    	print(key, values[idx].id);
        settings.set_string(key, values[idx].id);
    });
	pref.set_activatable_widget(chooser);
	pref.add_suffix(chooser);
	return pref;
}



function buildPrefsWidget() {
	let frame = new Gtk.Box({
		orientation: Gtk.Orientation.VERTICAL,
		'margin-top': 20,
		'margin-bottom': 20,
		'margin-start': 20,
		'margin-end': 20,
		spacing: 10
	});

	frame.append(buildSwitcher("hide-panel", _("Hide panel during Coverflow")));
	frame.append(buildSwitcher("enforce-primary-monitor", _("Always show the switcher on the primary monitor")));
	frame.append(buildRadio("switcher-style", [_("Coverflow"), _("Timeline")], _("Switcher style")));
	frame.append(buildComboBox("easing-function", easing_options, _("Easing for animations")));
	frame.append(buildRange("animation-time", [0.01, 2, 0.001, [0.5, 1, 1.5]], _("Animation speed (smaller means faster)")));
	frame.append(buildSwitcher("randomize-animation-times", _("Randomize durations of animations")));
	frame.append(buildRange("dim-factor", [0, 1, 0.01, [0.25, 0.5, 0.75]], _("Background dim-factor (smaller means darker)")));
	frame.append(buildRadio("position", [_("Bottom"), _("Top")], _("Window title box position")));
	frame.append(buildRadio("icon-style", [_("Classic"), _("Overlay")], _("Application icon style")));
	frame.append(buildSwitcher("icon-has-shadow", _("Draw icon shadow")));
	frame.append(buildRange("overlay-icon-size", [0, 1024, 1, [32, 64, 128, 256, 512]], _("Overlay icon size")));
	frame.append(buildRange("overlay-icon-opacity", [0, 1, 0.01, [0.25, 0.5, 0.75]], _("Overlay icon opacity")));
	frame.append(buildSpin("offset", [-500, 500, 1, 10], _("Vertical offset (positive value moves everything up, negative down)")));
	frame.append(buildRange("preview-to-monitor-ratio", [0, 1, 0.01, [0.250, 0.500, 0.750]], _("Ratio of preview to monitor size")));
	frame.append(buildRange("preview-scaling-factor", [0, 1, 0.01, [0.250, 0.500, 0.800]], _("Factor by which to shrink previews off to the sides")));
	options = [{
	    id: 'current', name: _("Current workspace only")
	}, {
	    id: 'all', name: _("All workspaces")
	}, {
	    id: 'all-currentfirst', name: _("All workspaces, current first")
	}]
	frame.append(buildComboBox("current-workspace-only", options, _("Show windows from current or all workspaces")));
	frame.append(buildSwitcher("switch-per-monitor", _("Only switch between windows on current monitor")));
	frame.append(buildSwitcher("bind-to-switch-applications", _("Bind to switch-applications keybinding")));
	frame.append(buildSwitcher("bind-to-switch-windows", _("Bind to switch-windows keybinding")));
	frame.append(buildComboBox("perspective-correction-method", [
		{ id: "None", name:_("None") },
		{ id: "Move Camera", name: _("Move Camera") },
		{ id: "Adjust Angles", name: _("Adjust Angles")}],
		_("How to Make an Off-Center Monitor Look Centered")));
	frame.append(buildSwitcher("highlight-mouse-over", _("Highlight Window Under Mouse")));
	frame.append(buildSwitcher("raise-mouse-over", _("Raise Window Under Mouse")));
	return frame;
}

function buildSwitcher(key, labeltext, tooltip) {
	let hbox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, spacing: 10 });

	let label = new Gtk.Label({label: labeltext, xalign: 0 });

	let switcher = new Gtk.Switch({active: settings.get_boolean(key)});

	switcher.connect('notify::active', function(widget) {
		settings.set_boolean(key, widget.active);
	});

	label.expand = true;

	hbox.append(label);
	hbox.append(switcher);

	return hbox;
}

function buildRange(key, values, labeltext, tooltip) {
	let [min, max, step, defvs] = values;
	let hbox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 10 });

	let label = new Gtk.Label({label: labeltext, xalign: 0 });

	let range = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, min, max, step);
	range.set_value(settings.get_double(key));
	range.set_draw_value(true);
	range.set_value_pos(Gtk.PositionType.RIGHT)
	for (let defv of defvs) {
		range.add_mark(defv, Gtk.PositionType.BOTTOM, null);
	}
	range.set_size_request(200, -1);

	range.connect('value-changed', function(slider) {
		settings.set_double(key, slider.get_value());
	});

	hbox.append(label);
	hbox.append(range);

	return hbox;
}

function buildRadio(key, buttons, labeltext) {
	let hbox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 10 });

	let label = new Gtk.Label({label: labeltext, xalign: 0 });
	hbox.append(label)

	let radio = new Gtk.ToggleButton();

	for (let button of buttons) {
		radio = new Gtk.ToggleButton({group: radio, label: button});
		if (getBaseString(button) == settings.get_string(key)) {
			radio.set_active(true);
		}

		radio.connect('toggled', function(widget) {
			if (widget.get_active()) {
				settings.set_string(key, getBaseString(widget.get_label()));
			}
		});

		hbox.append(radio);
	};

	return hbox;
};

function buildSpin(key, values, labeltext) {
	let [min, max, step, page] = values;
	let hbox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 10 });

	let label = new Gtk.Label({label: labeltext, xalign: 0 });

	let spin = new Gtk.SpinButton();
	spin.set_range(min, max);
	spin.set_increments(step, page);
	spin.set_value(settings.get_int(key));

	spin.connect('value-changed', function(widget) {
		settings.set_int(key, widget.get_value());
	});

	hbox.append(label);
	hbox.append(spin);

	return hbox;
}

function buildComboBox(key, values, labeltext) {

    let hbox = new Gtk.Box({
		orientation: Gtk.Orientation.HORIZONTAL,
        margin_top: 5
	});

    let setting_label = new Gtk.Label({
		label: labeltext + '  ',
        xalign: 0
	});

	let setting_enum = new Gtk.ComboBoxText({
		tooltip_text: labeltext
	});

	for (let i = 0; i < values.length; i++) {
		let item = values[i];
		setting_enum.append(item.id, item.name);

		if (item.id == settings.get_string(key)) {
			setting_enum.set_active_id(item.id);
		}
	}

    setting_enum.connect('changed', function(entry) {
        let id = setting_enum.get_active_id();

        settings.set_string(key, id);
    });

	hbox.append(setting_label);
    hbox.append(setting_enum);

    return hbox;
}