#!/usr/bin/gjs -m

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';


try {
    let command = ARGV[0];
    let argument = ARGV[1] === "applications" ? "applications" : "windows";
    Gio.DBus.session.call(
        'org.gnome.Shell.Extensions.Coverflowalttab',
        '/org/gnome/Shell/Extensions/Coverflowalttab',
        'org.gnome.Shell.Extensions.Coverflowalttab',
        command,
        command === "launch" ? new GLib.Variant('(s)', [argument]) : null,
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null,
        null);
} catch (e) {
    /* 4. Handling D-Bus errors
     *
     *    Errors returned by D-Bus may contain extra information we don't
     *    want to present to users. See the documentation for more
     *    information about `Gio.DBusError`.
     */
    if (e instanceof Gio.DBusError)
        Gio.DBusError.strip_remote_error(e);

    logError(e);
}
