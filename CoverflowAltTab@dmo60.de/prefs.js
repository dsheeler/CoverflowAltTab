/* CoverflowAltTab
 *
 * Preferences dialog for gnome-shell-extensions-prefs tool
 */

const Gtk = imports.gi.Gtk;
const Config = imports.misc.config;

const CoverflowAltTab = imports.misc.extensionUtils.getCurrentExtension();
const Lib = CoverflowAltTab.imports.lib;

const SCHEMA = "org.gnome.shell.extensions.coverflowalttab";

const PACKAGE_VERSION = Config.PACKAGE_VERSION;

let settings;

function init() {
	settings = Lib.getSettings(SCHEMA);
}

function buildPrefsWidget() {
	let frame = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, border_width: 10, spacing: 10});

    if(PACKAGE_VERSION <= "3.4.0") {
        let label = new Gtk.Label({label: "<b>Please restart Gnome-Shell to apply changes! (Hit Alt+F2, type 'r' and press Enter)\n</b>"});
        label.set_use_markup(true);
        frame.add(label);
    }
	frame.add(buildSwitcher("hide-panel", "Hide panel during Coverflow"));
	frame.add(buildSwitcher("enforce-primary-monitor", "Always show the switcher on the primary monitor"));
	frame.add(buildRadio("switcher-style", ["Coverflow", "Timeline"], "Switcher style"));
	frame.add(buildRange("animation-time", [100, 400, 10, 250], "Animation speed (smaller means faster)"));
	frame.add(buildRange("dim-factor", [0, 10, 1, 3], "Background dim-factor (smaller means darker)"));
	frame.add(buildRadio("position", ["Bottom", "Top"], "Window title box position"));
	frame.add(buildRadio("icon-style", ["Classic", "Overlay"], "Application icon style"));
	frame.add(buildSpin("offset", [-500, 500, 1, 10], "Vertical offset (positive value moves everything up, negative down)"));

	frame.show_all();

	return frame;
}

function buildSwitcher(key, labeltext, tooltip) {
	let hbox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, spacing: 10 });

	let label = new Gtk.Label({label: labeltext, xalign: 0 });

	let switcher = new Gtk.Switch({active: settings.get_boolean(key)});

	switcher.connect('notify::active', function(widget) {
		settings.set_boolean(key, widget.active);
	});

	hbox.pack_start(label, true, true, 0);
	hbox.add(switcher);

	return hbox;
}

function buildRange(key, values, labeltext, tooltip) {
	let [min, max, step, defv] = values;
	let hbox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 10 });

	let label = new Gtk.Label({label: labeltext, xalign: 0 });

	let range = Gtk.HScale.new_with_range(min, max, step);
	range.set_value(settings.get_int(key));
	range.set_draw_value(false);
	range.add_mark(defv, Gtk.PositionType.BOTTOM, null);
	range.set_size_request(200, -1);

	range.connect('value-changed', function(slider) {
		settings.set_int(key, slider.get_value());
	});

	hbox.pack_start(label, true, true, 0);
	hbox.add(range);

	return hbox;
};

function buildRadio(key, buttons, labeltext) {
	let hbox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 10 });

	let label = new Gtk.Label({label: labeltext, xalign: 0 });
	hbox.pack_start(label, true, true, 0);

	let radio = new Gtk.RadioButton();
	for (let i in buttons) {
		radio = new Gtk.RadioButton({group: radio, label: buttons[i]});
		if (buttons[i] == settings.get_string(key)) {
			radio.set_active(true);
		}

		radio.connect('toggled', function(widget) {
			if (widget.get_active()) {
				settings.set_string(key, widget.get_label());
			}
		});

		hbox.add(radio);
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

	hbox.pack_start(label, true, true, 0);
	hbox.add(spin);

	return hbox;

};