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

const Main = imports.ui.main;
const Mainloop = imports.mainloop;

function sortWindowsByUserTime(win1, win2) {
    let t1 = win1.get_user_time();
    let t2 = win2.get_user_time();
    return (t2 > t1) ? 1 : -1;
}

function matchSkipTaskbar(win) {
    return !win.is_skip_taskbar();
}

function matchWmClass(win) {
    return win.get_wm_class() == this && !win.is_skip_taskbar();
}

function matchWorkspace(win) {
    return win.get_workspace() == this && !win.is_skip_taskbar();
}

function matchOtherWorkspace(win) {
    return win.get_workspace() != this && !win.is_skip_taskbar();
}

var Manager = class Manager {
    constructor(platform, keybinder) {
        this.platform = platform;
        this.keybinder = keybinder;

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
        this.keybinder.enable(this._startWindowSwitcher.bind(this));
    }

    disable() {
        this.platform.disable();
        this.keybinder.disable();
    }

    activateSelectedWindow(win) {
        Main.activateWindow(win, global.get_current_time());
    }

    removeSelectedWindow(win) {
        win.delete(global.get_current_time());
    }

    _startWindowSwitcher(display, window, binding) {
        let windows = [];
        let currentWorkspace = this.workspace_manager.get_active_workspace();

        // Construct a list with all windows
        let windowActors = global.get_window_actors();
        for (let windowActor of windowActors) {
            if (typeof windowActor.get_meta_window === "function") {
                windows.push(windowActor.get_meta_window());
            }
        }

        windowActors = null;

        switch (binding.get_name()) {
            case 'switch-panels':
                // Switch between windows of all workspaces
                windows = windows.filter(matchSkipTaskbar);
                break;

            case 'switch-group':
                // Switch between windows of same application from all workspaces
                let focused = display.focus_window ? display.focus_window : windows[0];
                windows = windows.filter(matchWmClass, focused.get_wm_class());
                break;

            default:
                let currentOnly = this.platform.getSettings().current_workspace_only;
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
              	}
                break;
        }

        // filter by windows existing on the active monitor
        if(this.platform.getSettings().switch_per_monitor)
        {
            windows = windows.filter ( (win) =>
              win.get_monitor() == Main.layoutManager.currentMonitor.index );
        }

        // Sort by user time
        windows.sort(sortWindowsByUserTime);

        if (windows.length) {
            let mask = binding.get_mask();
            let currentIndex = windows.indexOf(display.focus_window);

            let switcher_class = this.platform.getSettings().switcher_class;
            let switcher = new switcher_class(windows, mask, currentIndex, this);
        }
    }
}
