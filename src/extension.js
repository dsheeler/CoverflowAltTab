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

/*
 * Gnome Shell extension specific routines.
 *
 * Create the correct manager and enable/disable it.
 */

import * as Manager from './manager.js';
import * as Platform from './platform.js';
import * as Keybinder from './keybinder.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {CoverflowLogger} from './logger.js';

export default class CoverflowAltTabExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this.manager = null;
        this.logger = null;
    }

    enable() {
        if (this.logger === null) {
            this.logger = new CoverflowLogger(this.getSettings());
        }
        this.logger.log("Enabling");
        this.logger.increaseIndent();
        if (!this.manager) {
            this.logger.log("Creating New Manager");
            this.manager = new Manager.Manager(
                new Platform.PlatformGnomeShell(this.getSettings(), this.logger),
                new Keybinder.Keybinder330Api(this.getSettings()),
                this
            );
            this.logger.log("Creating New Manager DONE");
        }
        this.manager.enable();
        this.logger.decreaseIndent();
        this.logger.log("Enabling DONE");
    }

    disable() {
        this.logger.log("Disabling");
        this.logger.increaseIndent();
        if (this.manager) {
            this.manager.disable();
            this.manager = null;
        }
        this.logger.decreaseIndent();
        this.logger.log("Disabling DONE");
        this.logger = null;
    }
}
