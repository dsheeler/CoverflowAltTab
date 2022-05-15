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
 */

const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;
const Config = imports.misc.config;

const Gettext = imports.gettext.domain('coverflow');
const _ = Gettext.gettext;

const ExtensionImports = imports.misc.extensionUtils.getCurrentExtension().imports;
const Lib = ExtensionImports.lib;

const SCHEMA = "org.gnome.shell.extensions.coverflowalttab";

let settings;

function init() {
	settings = Lib.getSettings(SCHEMA);
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
		let options = [{
		id: 'ease-out-cubic', name: "easeOutCubic"
	}, {
		id: 'ease-in-out-cubic', name: "easeInOutCubic"
	}, {
		id: 'ease-out-quad', name: "easeOutQuad"
	}, {
		id: 'ease-in-out-quad', name: "easeInOutQuad"
	}, {
		id: 'ease-out-quint', name: "easeOutQuint"
	}, {
		id: 'ease-in-out-quint', name: "easeInOutQuint"
	}, {
		id: 'ease-out-circ', name: "easeOutCirc"
	}, {
		id: 'ease-in-out-circ', name: "easeInOutCirc"
	}, {
		id: 'ease-out-back', name: "easeOutBack"
	}, {
		id: 'ease-in-out-back', name: "easeInOutBack"
	}, {
		id: 'ease-out-elastic', name: "easeOutElastic"
	}, {
		id: 'ease-in-out-elastic', name: "easeInOutElastic"
	}, {
		id: 'ease-out-bounce', name: "easeOutBounce"
	}, {
		id: 'ease-in-out-bounce', name: "easeInOutBounce"
	}]
	frame.append(buildComboBox("easing-function", options, _("Easing for Coverflow animations")));
	frame.append(buildRange("animation-time", [50, 4000, 10, [250, 500, 1000, 2000, 4000]], _("Animation speed (smaller means faster)")));
	frame.append(buildRange("dim-factor", [0, 10, 1, [3]], _("Background dim-factor (smaller means darker)")));
	frame.append(buildRadio("position", [_("Bottom"), _("Top")], _("Window title box position")));
	frame.append(buildRadio("icon-style", [_("Classic"), _("Overlay")], _("Application icon style")));
	frame.append(buildSpin("offset", [-500, 500, 1, 10], _("Vertical offset (positive value moves everything up, negative down)")));
	options = [{
	    id: 'current', name: _("Current workspace only")
	}, {
	    id: 'all', name: _("All workspaces")
	}, {
	    id: 'all-currentfirst', name: _("All workspaces, current first")
	}]
	frame.append(buildComboBox("current-workspace-only", options, _("Show windows from current or all workspaces")));
	frame.append(buildSwitcher("switch-per-monitor", _("Only switch between windows on current monitor")));

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
	range.set_value(settings.get_int(key));
	range.set_draw_value(false);
	for (let defv of defvs) {
		range.add_mark(defv, Gtk.PositionType.BOTTOM, null);
	}
	range.set_size_request(200, -1);

	range.connect('value-changed', function(slider) {
		settings.set_int(key, slider.get_value());
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
