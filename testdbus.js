#!/usr/bin/gjs -m

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';


try {
    /* 1. Packing the method arguments
     *
     *    Note that calling methods directly in this way will require you to
     *    find documentation or introspect the interface. D-Spy can help here.
     */
  

    /* 2. Calling the method
     *
     *    To call a method directly, you will need to know the well-known name,
     *    object path and interface name. You will also need to know whether
     *    the service is on the session bus or the system bus.
     */
    Gio.DBus.session.call(
        'org.gnome.shell.extensions.coverflowalttab',
        '/org/gnome/shell/extensions/coverflowalttab',
        'org.gnome.shell.extensions.coverflowalttab',
        'dBusLaunch',
        null,
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null,
        null);

    /* 3. Unpacking the method reply
     *
     *    The reply of a D-Bus method call is always a tuple. If the
     *    method has no return value the tuple will be empty, otherwise
     *    it will be a packed variant.
     */

    // Our method call has a reply, so we will extract it by getting the
    // first child of the tuple, which is the actual method return value.
   
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
