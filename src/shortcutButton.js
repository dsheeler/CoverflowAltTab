/*This code is based on code in Night Theme Switcher:
  https://gitlab.com/rmnvgr/nightthemeswitcher-gnome-shell-extension/-/blob/34aeb19fdc097a8c1be33476ddb49e176188a57e/src/data/ui/ShortcutButton.ui
  https://gitlab.com/rmnvgr/nightthemeswitcher-gnome-shell-extension/-/blob/34aeb19fdc097a8c1be33476ddb49e176188a57e/src/preferences/ShortcutButton.js*/

import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Gdk from 'gi://Gdk';
import Adw from 'gi://Adw';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'

export class ShortcutButton extends Gtk.Stack {
    static {
        GObject.registerClass({
            GTypeName: 'CoverflowShortcutButton',
            Properties: {
                keybinding: GObject.ParamSpec.string(
                    'keybinding',
                    'Keybinding',
                    'Key sequence',
                    GObject.ParamFlags.READWRITE,
                    null
                ),
            },
        }, this);
    }

    constructor(settings, params, actionName) {
        super(params);
        this.settings = settings;
        this.dialog = null;
        this.valign = Gtk.Align.CENTER;
        this.actionName = actionName;

        this.chooseButton = new Gtk.Button({
            label: _("Choose..."),
        });

        this.editBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
        });
        this.editBox.add_css_class("linked");

        this.changeButton = new Gtk.Button({
            tooltip_text: _("Change keyboard shortcut"),
        })

        this.clearButton = new Gtk.Button({
            label: _("Clear"),
        })
        this.clearButton.add_css_class("destructive-action");

        this.editBox.append(this.changeButton);
        this.editBox.append(this.clearButton);
        this.keybinding = this.settings.get_strv(this.actionName)[0];
        this.shortcutLabel = new Gtk.ShortcutLabel({
            accelerator: this.keybinding,
        });

        //this.settings.connect("changed::gravatar-ondemand-keybinding", this.shortcutLabel, "accelerator", Gio.SettingsBindFlags.DEFAULT);
        this.bind_property("keybinding", this.shortcutLabel, "accelerator", Gio.SettingsBindFlags.DEFAULT);
        this.changeButton.set_child(this.shortcutLabel);

        this.chooseButton.connect("clicked", this.onChooseButtonClicked.bind(this, this.chooseButton));
        this.changeButton.connect("clicked", this.onChangeButtonClicked.bind(this, this.changeButton));
        this.clearButton.connect("clicked", this.onClearButtonClicked.bind(this, this.clearButton));

        this.add_child(this.chooseButton);
        this.add_child(this.editBox);
        this.connect("notify::keybinding", this.onKeybindingChanged.bind(this));
        console.log("shortcutbutton constructor", this.keybinding);
        this.visible_child = this.keybinding ? this.editBox : this.chooseButton;
    }

    vfunc_mnemonic_activate() {
        this.activate();
    }

    activate() {
        if (this.keybinding)
            return this.editBox.get_first_child().activate();
        else
            return this.chooseButton.activate();
    }

    openDialog() {
        if (this.dialog === null) {
            this.statusPage = new Adw.StatusPage({
                title: _("Press your keyboard shortcut..."),
                icon_name: "preferences-desktop-keyboard-shortcuts-symbolic",
                vexpand: true,
            })
            this.overlay = new Gtk.Overlay({
                child: this.statusPage,
            });
            let box = new Gtk.Box();
            this.headerBar = new Adw.HeaderBar({
                title_widget: box,
                valign: Gtk.Align.START,
            });
            this.headerBar.add_css_class("flat");
            this.overlay.add_overlay(this.headerBar);
            this.windowHandle = new Gtk.WindowHandle({
                vexpand: true,
                hexpand: true,
                child: this.overlay,
            })

            this.dialog = new Adw.Window({
                modal: true,
                default_width: 440,
                hide_on_close: true,
                content: this.windowHandle,
            });

            this.eventControllerKey = new Gtk.EventControllerKey({
            });
            this.eventControllerKey.connect("key-pressed", this.onKeyPressed.bind(this))
            this.dialog.add_controller(this.eventControllerKey);

        }
        this.dialog.transient_for = this.get_root();
        this.dialog.present();
    }

    onKeybindingChanged() {
        this.visible_child = this.keybinding ? this.editBox : this.chooseButton;
    }

    onChooseButtonClicked(_button) {
        console.log("onchoosebutton");
        this.openDialog();
    }

    onChangeButtonClicked(_button) {
        this.openDialog();
    }

    onClearButtonClicked(_button) {
        this.keybinding = '';
    }

    onKeyPressed(_widget, keyval, keycode, state) {
        let mask = state & Gtk.accelerator_get_default_mod_mask();
        mask &= ~Gdk.ModifierType.LOCK_MASK;

        if (mask === 0 && keyval === Gdk.KEY_Escape) {
            this.dialog.close();
            return Gdk.EVENT_STOP;
        }

        if (
            !isBindingValid({ mask, keycode, keyval }) ||
            !isAccelValid({ mask, keyval })
        )
            return Gdk.EVENT_STOP;

        this.keybinding = Gtk.accelerator_name_with_keycode(
            null,
            keyval,
            keycode,
            mask
        );

        this.dialog.close();
        return Gdk.EVENT_STOP;
    }
}


/**
 * Check if the given keyval is forbidden.
 *
 * @param {number} keyval The keyval number.
 * @returns {boolean} `true` if the keyval is forbidden.
 */
function isKeyvalForbidden(keyval) {
    const forbiddenKeyvals = [
        Gdk.KEY_Home,
        Gdk.KEY_Left,
        Gdk.KEY_Up,
        Gdk.KEY_Right,
        Gdk.KEY_Down,
        Gdk.KEY_Page_Up,
        Gdk.KEY_Page_Down,
        Gdk.KEY_End,
        Gdk.KEY_Tab,
        Gdk.KEY_KP_Enter,
        Gdk.KEY_Return,
        Gdk.KEY_Mode_switch,
    ];
    return forbiddenKeyvals.includes(keyval);
}

/**
 * Check if the given key combo is a valid binding
 *
 * @param {{mask: number, keycode: number, keyval:number}} combo An object
 * representing the key combo.
 * @returns {boolean} `true` if the key combo is a valid binding.
 */
// eslint-disable-next-line complexity
function isBindingValid({ mask, keycode, keyval }) {
    if ((mask === 0 || mask === Gdk.SHIFT_MASK) && keycode !== 0) {
        if (
            (keyval >= Gdk.KEY_a && keyval <= Gdk.KEY_z) ||
            (keyval >= Gdk.KEY_A && keyval <= Gdk.KEY_Z) ||
            (keyval >= Gdk.KEY_0 && keyval <= Gdk.KEY_9) ||
            (keyval >= Gdk.KEY_kana_fullstop && keyval <= Gdk.KEY_semivoicedsound) ||
            (keyval >= Gdk.KEY_Arabic_comma && keyval <= Gdk.KEY_Arabic_sukun) ||
            (keyval >= Gdk.KEY_Serbian_dje && keyval <= Gdk.KEY_Cyrillic_HARDSIGN) ||
            (keyval >= Gdk.KEY_Greek_ALPHAaccent && keyval <= Gdk.KEY_Greek_omega) ||
            (keyval >= Gdk.KEY_hebrew_doublelowline && keyval <= Gdk.KEY_hebrew_taf) ||
            (keyval >= Gdk.KEY_Thai_kokai && keyval <= Gdk.KEY_Thai_lekkao) ||
            (keyval >= Gdk.KEY_Hangul_Kiyeog && keyval <= Gdk.KEY_Hangul_J_YeorinHieuh) ||
            (keyval === Gdk.KEY_space && mask === 0) ||
            isKeyvalForbidden(keyval)
        )
            return false;
    }
    return true;
}

/**
 * Check if the given key combo is a valid accelerator.
 *
 * @param {{mask: number, keyval:number}} combo An object representing the key
 * combo.
 * @returns {boolean} `true` if the key combo is a valid accelerator.
 */
function isAccelValid({ mask, keyval }) {
    return Gtk.accelerator_valid(keyval, mask) || (keyval === Gdk.KEY_Tab && mask !== 0);
}
