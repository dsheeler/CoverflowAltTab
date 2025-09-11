/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

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

/* CoverflowAltTab::Manager
 *
 * This class is a helper class to start the actual switcher.
 */
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Shell from 'gi://Shell';
import Gio from 'gi://Gio';


function sortWindowsByUserTime(win1, win2) {
    let t1 = win1.get_user_time();
    let t2 = win2.get_user_time();
    return (t2 > t1) ? 1 : -1;
}

function matchSkipTaskbar(win) {
    return !win.is_skip_taskbar();
}

function matchWmClass(win) {
    return win.get_wm_class() === this && !win.is_skip_taskbar();
}

function matchWorkspace(win) {
    return win.get_workspace() === this && !win.is_skip_taskbar();
}

function matchOtherWorkspace(win) {
    return win.get_workspace() !== this && !win.is_skip_taskbar();
}

export const Manager = class Manager {
    constructor(platform, keybinder, extensionObj) {
        this.platform = platform;
        this.keybinder = keybinder;
        this.extensionObj = extensionObj;
        this.logger = this.extensionObj.logger;
        this.switcher = null;
        this.exportedObject = null;

        if (global.workspace_manager && global.workspace_manager.get_active_workspace)
            this.workspace_manager = global.workspace_manager;
        else
            this.workspace_manager = global.screen;

        if (global.display && global.display.get_n_monitors)
            this.display = global.display;
        else
            this.display = global.screen;
    }

    enable() {
        this.platform.enable();
        this.keybinder.enable(this._startWindowSwitcher.bind(this), this.platform);
        // Just like a signal handler ID, the `Gio.bus_own_name()` function returns a
        // unique ID we can use to unown the name when we're done with it.
        this.ownerId = Gio.bus_own_name(
            Gio.BusType.SESSION,
            'org.gnome.Shell.Extensions.Coverflowalttab',
            Gio.BusNameOwnerFlags.NONE,
            this.onBusAcquired.bind(this),
            this.onNameAcquired.bind(this),
            this.onNameLost.bind(this));
    }

    disable() {
        // Note that `onNameLost()` is NOT invoked when manually unowning a name.
        Gio.bus_unown_name(this.ownerId);
        if (this.exportedObject) {
            this.exportedObject.flush();
            this.exportedObject.unexport();
            this.exportedObject = null;
        }

        if (this.switcher && !this.switcher.isDestroyed()) {
            this.switcher.destroy();
            this.switcher = null;
        }
        this.keybinder.disable();
        this.platform.disable();
        this.logger = null;
        this.extensionObj = null;
    }

    onBusAcquired(connection, name) {
        this.logger.log(`DBus Bus Acquired: ${name}`);
        const dBusInterfaceXml = new TextDecoder().decode(
            this.extensionObj.dir.get_child('dbus-interfaces').get_child('org.gnome.Shell.Extensions.Coverflowalttab.xml').load_contents(null)[1]);
        this.exportedObject = Gio.DBusExportedObject.wrapJSObject(dBusInterfaceXml, this);
        this.exportedObject.export(connection, '/org/gnome/Shell/Extensions/Coverflowalttab');
    }

    /**
     * Invoked when the name is acquired.
     *
     * On the other hand, if you were using something like GDBusObjectManager to
     * watch for interfaces, you could export your interfaces here.
     *
     * @param {Gio.DBusConnection} connection - the connection that acquired the name
     * @param {string} name - the name being owned
     */
    onNameAcquired(connection, name) {
        this.logger.log(`DBus Name Acquired: ${name}`);
    }

    /**
     * Invoked when the name is lost or @connection has been closed.
     *
     * Typically you won't see this callback invoked, but it might happen if you
     * try to own a name that was already owned by someone else.
     *
     * @param {Gio.DBusConnection|null} connection - the connection on which to
     *     acquire the name, or %null if the connection was disconnected
     * @param {string} name - the name being owned
     */
    onNameLost(connection, name) {
        this.logger.log(`DBus Name Lost: ${name}`);
    }

    activateSelectedWindow(win) {
        Main.activateWindow(win, global.get_current_time());
    }

    removeSelectedWindow(win) {
        win.delete(global.get_current_time());
    }

    _startWindowSwitcher(display, window, event, binding) {
        this._startWindowSwitcherInternal(display, window, binding.get_name(), binding.get_mask(), false);
    }

    _startWindowSwitcherInternal(display, window, bindingName, mask, dBus=false) {
        if (Main.actionMode  !== Shell.ActionMode.NORMAL) {
            this.logger.log(`Not starting switcher: action mode is ${Main.actionMode}, should be ${Shell.ActionMode.NORMAL}`);
            return;
        }

        let windows = [];
        let currentWorkspace = this.workspace_manager.get_active_workspace();
        let isApplicationSwitcher = false;

        // Construct a list with all windows
        let windowActors = global.get_window_actors();
        for (let windowActor of windowActors) {
            if (typeof windowActor.get_meta_window === "function") {
                windows.push(windowActor.get_meta_window());
            }
        }

        windowActors = null;

        let currentOnly = this.platform.getSettings().current_workspace_only;
        let focused = display.focus_window ? display.focus_window : windows[0];

        switch (bindingName) {
            case 'switch-group':
                // Switch between windows of same application from all workspaces
                windows = windows.filter(matchWmClass, focused.get_wm_class());
                windows.sort(sortWindowsByUserTime);
                break;

            case 'switch-applications':
            case 'switch-applications-backward':
            case 'coverflow-switch-applications':
            case 'coverflow-switch-applications-backward':
                isApplicationSwitcher = true;
            //eslint-disable-next-line no-fallthrough
            default:
                if (currentOnly === 'all-currentfirst') {
                    // Switch between windows of all workspaces, prefer
                    // those from current workspace
                    let wins1 = windows.filter(matchWorkspace, currentWorkspace);
                    let wins2 = windows.filter(matchOtherWorkspace, currentWorkspace);
                    // Sort by user time
                    wins1.sort(sortWindowsByUserTime);
                    wins2.sort(sortWindowsByUserTime);
                    windows = wins1.concat(wins2);
                    wins1 = [];
                    wins2 = [];
                } else {
                    let filter = currentOnly === 'current' ? matchWorkspace :
                          matchSkipTaskbar;
                    // Switch between windows of current workspace
                    windows = windows.filter(filter, currentWorkspace);
                    windows.sort(sortWindowsByUserTime);
                }
                break;
        }

        // filter by windows existing on the active monitor
        if (this.platform.getSettings().switch_per_monitor)
        {
            windows = windows.filter ( (win) =>
              win.get_monitor() === Main.layoutManager.currentMonitor.index );
        }

        if (windows.length) {
            const currentIndex = 0;
            let switcher_class = this.platform.getSettings().switcher_class;
            this.switcher = new switcher_class(windows, mask, currentIndex, this, null, isApplicationSwitcher, null, dBus);
        }
    }

    // DBus interface impl
    launch(type) {
        let actionName = null;
        const actionPrefix = "coverflow-switch-";
        if (type === "windows") {
            actionName = actionPrefix + "windows";
        } else if (type === "applications") {
            actionName = actionPrefix + "applications";
        }
        this.logger.log(`DBus Launch Action Name: ${actionName}`);
        if (actionName !== null) this._startWindowSwitcherInternal(this.display, null, actionName, 0, true);
        else this.logger.error(`DBus Can not Launch Switcher: Invalid Type: '${type}'`);
    }

    next() {
        try {
            this.logger.log(`DBus Next`);
            this.switcher._next();
        } catch(e) {
            this.logger.error(e);
        }
    }

    previous() {
        try {
            this.logger.log(`DBus Previous`);
            this.switcher._previous();
        } catch(e) {
            this.logger.error(e);
        }
    }

    select() {
        try {
            this.logger.log(`DBus Select`);
            this.switcher._activateSelected(true);
        } catch (e) {
            this.logger.error(e);
        }
    }
}



