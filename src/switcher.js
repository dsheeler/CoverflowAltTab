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

/* CoverflowAltTab::Switcher:
 *
 * The implementation of the switcher UI. Handles keyboard events.
 */
import Clutter from 'gi://Clutter';
import Shell from 'gi://Shell';
import St from 'gi://St';
import Meta from 'gi://Meta';
import Pango from 'gi://Pango';
import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {ColorEffect} from './effects/color_effect.js';
import {GlitchEffect} from './effects/glitch_effect.js';
import {Placement, Direction} from './preview.js';
import {MySwipeTracker} from './swipeTracker.js';

import {__ABSTRACT_METHOD__} from './lib.js';

const INITIAL_DELAY_TIMEOUT = 150;
const ICON_SIZE = 64;
const ICON_TITLE_SPACING = 10;

let CloseReason = class CloseReason {}
CloseReason.ACTIVATE_SELECTED = 1;
CloseReason.NO_ACTIVATION = 2;

export class Switcher {
    _createPreviews() { __ABSTRACT_METHOD__(this, this._createPreviews) }
    _updatePreviews() { __ABSTRACT_METHOD__(this, this._updatePreviews) }

    _previewNext() { __ABSTRACT_METHOD__(this, this._previewNext) }
    _previewPrevious() { __ABSTRACT_METHOD__(this, this._previewPrevious) }

    constructor(windows, mask, currentIndex, manager, activeMonitor=null, isAppSwitcher=false, parent=null, x_in, y_in, width_in, height_in) {
        this._manager = manager;
        this._settings = manager.platform.getSettings();
        this._windows = [...windows];
        this._modifierMask = null;
        this._currentIndex = currentIndex;
        this._haveModal = false;
        this._tracker = manager.platform.getWindowTracker();
        this._windowManager = global.window_manager;
        this._previews = [];
        this._allPreviews = [];
        this._numPreviewsComplete = 0;
        this._isAppSwitcher = isAppSwitcher;
        this._appWindowsMap = new Map();
        this._x = x_in;
        this._y = y_in;
        this._width = width_in;
        this._height = height_in;
        this._parent = parent;
        this._subSwitchers = new Map();
        this._backgroundColor = null;
        this._windowTitles = [];
        this._windowIconBoxes = [];
        this._toSubSwitcher = null;
        this._fromSubSwitcher = null;
        this._grab = null;
        this._animatingClosed = false;

        if (activeMonitor !== null)
            this._activeMonitor = activeMonitor;

        let monitor = this._updateActiveMonitor();
        
        this._dcid = this._windowManager.connect('destroy', this._windowDestroyed.bind(this));
        this._mcid = this._windowManager.connect('map', this._activateSelected.bind(this));
        manager.platform.switcher = this;
        if (this._parent === null) manager.platform.initBackground();

        // create a container for all our widgets
        let widgetClass = manager.platform.getWidgetClass();
        this.actor = new widgetClass({ visible: true, reactive: true, });
        this.actor.hide();
        this.previewActor = new widgetClass({ visible: true, reactive: true});
        this.actor.add_child(this.previewActor);
        Main.uiGroup.add_child(this.actor);
        
        this.gestureInProgress = false;

        const swipeTracker = new MySwipeTracker(this.actor,
            Clutter.Orientation.HORIZONTAL,
            0,
            { allowDrag: true, allowScroll: true },
            this._settings.invert_swipes);
        swipeTracker.allowLongSwipes = true;
        swipeTracker.connect('begin', this._gestureBegin.bind(this));
        swipeTracker.connect('update', this._gestureUpdate.bind(this));
        swipeTracker.connect('end', this._gestureEnd.bind(this));
        this._swipeTracker = swipeTracker;

        if (this._parent == null) {
            this._grabModal();
        }
        
        if (this._parent === null) {
            this.actor.set_size(monitor.width, monitor.height);
            this.actor.set_position(monitor.x, monitor.y);
        } else {
            this.actor.set_size(this._width, this._height);
            this.actor.set_position(this._x, this._y);
        }



        this._modifierMask = manager.platform.getPrimaryModifier(mask);

        if (this._isAppSwitcher) {
            // Find all the apps and associated windows
            for (let metaWin of this._windows) {
                let app = this._tracker.get_window_app(metaWin);
                if (this._appWindowsMap.has(app)) {
                    this._appWindowsMap.get(app).push(metaWin);
                } else {
                    this._appWindowsMap.set(app, [metaWin]);
                }
            }
            /* If only one app, then just switch between the windows of
               that app. */
            if (Array.from(this._appWindowsMap.keys()).length === 1) {
                this._isAppSwitcher = false;
            } else {
                // For each app, display the first window only
                this._windows = [];
                for (let app of this._appWindowsMap.keys()) {
                    let window = this._appWindowsMap.get(app)[0]
                    this._windows.push(window);
                    if (this._appWindowsMap.get(app).length > 1) {
                        let switcher_class = this._manager.platform.getSettings().switcher_class;
                        this._subSwitchers.set(window, new switcher_class(this._appWindowsMap.get(app), this._modifierMask, 0, this._manager, this._activeMonitor, false, this,
                            this.actor.x, this.actor.y, this.actor.width, this.actor.height));
                    }
                }
            }
        }

        let [x, y, mods] = global.get_pointer();
        if (!(mods & this._modifierMask)) {
            // There's a race condition; if the user released Alt before
            // we got the grab, then we won't be notified. (See
            // https://bugzilla.gnome.org/show_bug.cgi?id=596695 for
            // details) So we check now. (Have to do this after updating
            // selection.)
            this._activateSelected();
            return;
        }

        if (this._parent == null) this._initialDelayTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, INITIAL_DELAY_TIMEOUT, this.show.bind(this));
    }

    show() {
        let monitor = this._updateActiveMonitor();

        // create previews
        this._createPreviews();
        for (let i = 0; i < this._windows.length; i++) {
            this._getWindowTitle(i);
        }

        for (let preview of this._allPreviews) {
            preview.set_reactive(false);
            if (this._parent === null && this._settings.icon_style == "Attached" && this._previews.includes(preview)) {
                preview.addIcon();
            }
            preview.connect('button-press-event', this._previewButtonPressEvent.bind(this, preview));
        }

        // hide windows and showcd  Coverflow actors
        if (this._parent === null) global.window_group.hide();
        
        if (this._parent === null) this.actor.show();
        if (this._parent !== null) {
            this.previewActor.set_scale(0, 0);
            this.previewActor.set_scale_z(0);

            this._updateWindowTitle();
            this._updatePreviews(false);
           
        }
        this._enablePerspectiveCorrection();
        this._initialDelayTimeoutId = 0;
        for (let preview of this._allPreviews) {
            if (!this._previews.includes(preview)) {
                if (this._parent !== null) {
                    preview.opacity = 0;
                    preview.x = 0;
                    preview.y = 0;
                    preview.scale_x = 0;
                    preview.scale_y = 0;
                    preview.scale_z = 0;
                }
            }
        }
        if (this._parent == null) {
            for (let switcher of this._subSwitchers.values()) {
                switcher.show();
            }
            this._next();
        }
        this._getSwitcherBackgroundColor();

    }
    
    _gestureBegin(tracker) {
        const baseDistance = 400;
        const progress = this._currentIndex;
        const points = [];
        for (let i = 0; i < this._previews.length; i++) {
            points.push(i);
        }

        const cancelProgress = Math.round(progress);
        tracker.confirmSwipe(baseDistance, points, progress, cancelProgress);
        this.gestureInProgress = true;
    }

    _gestureUpdate(tracker, progress) {
        if (this._currentIndex <= Math.round(this._currentIndex) && Math.round(this._currentIndex) < progress) {
            this._showSubswitcher(Direction.TO_RIGHT);
        } else if (this._currentIndex >= Math.round(this._currentIndex) && Math.round(this._currentIndex) > progress) {
            this._showSubswitcher(Direction.TO_LEFT);
        }
        this._setCurrentIndex(progress);

        this._updateSubSwitcher();
        this._updateWindowTitle();
        this._updatePreviews(false);
    }

    _gestureEnd(tracker, duration, endProgress) {
        this.gestureInProgress = false;
        this._setCurrentIndex(endProgress);
        if (endProgress != this._toIndex) {
            if (this._direction == Direction.TO_RIGHT) {
                this._showSubswitcher(Direction.TO_LEFT);
            } else {
                this._showSubswitcher(Direction.TO_RIGHT);
            }
        } else {
            this._showSubswitcher(this._direction);
        }
        this._updateWindowTitle();
        this._updatePreviews(false);
    }

    _ungrabModal() {
        if (this._haveModal) {
            this.actor.disconnect(this._key_press_handler_id);
            this.actor.disconnect(this._key_release_handler_id);
            Main.popModal(this._grab);
            this._haveModal = false;
        }
    }

    _grabModal() {
        if (this._haveModal) return;
        this._key_press_handler_id = this.actor.connect('key-press-event', this._keyPressEvent.bind(this));
        this._key_release_handler_id = this.actor.connect('key-release-event', this._keyReleaseEvent.bind(this));
        this._grab = Main.pushModal(this.actor)
        if (!this._grab) {
            this._activateSelected();
            return;
        }
        this._haveModal = true;
    }

    _addBackgroundEffects() {
        for (let preview of this._previews) {
            if (this._settings.use_glitch_effect) {
                if (preview.get_effect('glitch-effect') === null) {
                    let glitchEffect = new GlitchEffect({});
                    preview.add_effect_with_name('glitch-effect', glitchEffect);
                }
                preview.get_effect('glitch-effect').set_enabled(true);
                preview._effectCounts['glitch'] += 1;
            }
            if (this._settings.use_tint) {
                let c = this._settings.tint_color;
                let b = this._settings.tint_blend;
                preview.addEffect(ColorEffect, { color: [c[0], c[1], c[2], 0] }, 'tint', 'blend', 0.0, b, this._settings.animation_time);
            }
            
            preview.addEffect(Clutter.DesaturateEffect, { factor:  0.0 }, 'desaturate', 'factor', 0.0, this._settings.desaturate_factor, this._settings.animation_time);
            preview.addEffect(Shell.BlurEffect, { radius: 0.0 }, 'blur', 'radius', 0.0,  this._settings.blur_radius, this._settings.animation_time);
        }
    }

    _removeBackgroundEffects() {
        if (this._previews !== null) {
            for (let preview of this._previews) {
                preview.removeEffect('blur', 'radius', 0.0, this._settings.animation_time);
                preview.removeEffect('desaturate', 'factor', 0.0, this._settings.animation_time);
                preview.removeEffect('tint', 'blend', 0.0, this._settings.animation_time);
                if (preview._effectCounts['glitch'] > 0) {
                    preview._effectCounts['glitch'] -= 1;
                    if (preview._effectCounts['glitch'] == 0) {
                        preview.get_effect('glitch-effect').set_enabled(false);
                    }
                }
            }
        }
    }



    _stopClosing() {
        this._animatingClosed = false;
        this._swipeTracker.enabled = true;
        for (let preview of this._allPreviews) {
            if (!this._previews.includes(preview)) {
                if (this._parent === null) {
                    let monitor = Main.layoutManager.monitors[preview.metaWin.get_monitor()];
                    preview.set_pivot_point_placement(Placement.TOP_LEFT);
                    this._manager.platform.tween(preview, {
                        x: monitor.x - this.actor.x,
                        y: monitor.y - this.actor.y,
                        scale_x: 0,
                        scale_y: 0,
                        scale_z: 0,
                        opacity: 0,
                        time: this._getRandomTime(),
                        transition: 'easeInOutQuint',
                    });
                } else {
                    preview.opacity = 0;
                    preview.x = 0;
                    preview.y = 0;
                    preview.scale_x = 0;
                    preview.scale_y = 0;
                    preview.scale_z = 0;
                }
            }
        }
    }

    _showSubswitcher(direction) {
        if (this._isAppSwitcher) {
            this._direction = direction;
            
            let from_index = Math.round(this._currentIndex);
            let to_index = Math.round(this._currentIndex + this._windows.length + (direction == Direction.TO_RIGHT ? 1 : -1)) % this._windows.length;
            if (!this.gestureInProgress) {
                to_index = this._currentIndex;
                from_index = (this._currentIndex + this._windows.length + (direction == Direction.TO_RIGHT ? - 1 : 1)) % this._windows.length; 
            }
            
            this._fromIndex = from_index;
            this._toIndex = to_index;

            this._fromSubSwitcher = this._numberOfWindows(from_index) > 1 ? this._subSwitchers.get(this._windows[from_index]) : null;
            this._toSubSwitcher = this._numberOfWindows(to_index) > 1 ? this._subSwitchers.get(this._windows[to_index]) : null;
            
            if (this._toSubSwitcher != null) {
                this._toSubSwitcher.actor.show();
                this._addBackgroundEffects();
                let current_index = direction == Direction.TO_RIGHT ? 0 : this._toSubSwitcher._windows.length - 1;
                this._toSubSwitcher._setCurrentIndex(current_index);
                this._toSubSwitcher._updateWindowTitle();
                this._toSubSwitcher._updatePreviews(false);
                if (!this.gestureInProgress) {
                    this._toSubSwitcher._grabModal();
                }
            } else {
                this._removeBackgroundEffects();
            }
            if (this._fromSubSwitcher != null) {
                this._fromSubSwitcher._ungrabModal();
                this._removeBackgroundEffects();
            }

            this._updateSubSwitcher();
        }
    }

    _getWindowsAtIndex(index) {
        return this._appWindowsMap.get(this._tracker.get_window_app(this._windows[index]));
    }

    _numberOfWindows(index) {
        return this._getWindowsAtIndex(index).length;
    }

    _updateSubSwitcher() {
        if (this._isAppSwitcher) {        
            let scale = 1, x = 0;
            let progress = 1;
            let to_index = this._toIndex;
            let from_index = this._fromIndex;
            progress = (this._currentIndex - from_index) / (to_index - from_index);
            let is_appswitcher_at_to_index = this._numberOfWindows(to_index) > 1;
            let to_scale = is_appswitcher_at_to_index ? 0.25 : 1;
            let is_appswitcher_at_from_index = this._numberOfWindows(from_index) > 1;
            let from_scale = is_appswitcher_at_from_index ? 0.25 : 1;
            scale = from_scale + progress * (to_scale - from_scale);
            let from_x = is_appswitcher_at_from_index ? 0.375 * this.actor.width : 0;
            let to_x = is_appswitcher_at_to_index ? 0.375 * this.actor.width : 0;
            x = from_x + progress * (to_x - from_x);
            
            this._manager.platform.tween(this.previewActor, {
                scale_x: scale,
                scale_y: scale,
                scale_z: scale,
                opacity: 255, 
                x: x,
                time: this.gestureInProgress ? 0 : this._settings.animation_time,
                transition: 'easeInOutQuint',
            });
            for (let switcher of this._subSwitchers.values()) {
                if (switcher !== this._toSubSwitcher && switcher !== this._fromSubSwitcher) {
                    this._manager.platform.tween(switcher.previewActor, {
                        scale_x: 0,
                        scale_y: 0,
                        scale_z: 0,
                        opacity: 0,
                        time: this._settings.animation_time,
                        transition: 'easeInOutQuint',
                    });
                }
            }
            if (this._toSubSwitcher !== null && !this._toSubSwitcher._animatingClosed) {
                this._manager.platform.tween(this._toSubSwitcher.previewActor, {
                    scale_x: this.gestureInProgress ? progress : 1,
                    scale_y: this.gestureInProgress ? progress : 1,
                    scale_z: this.gestureInProgress ? progress : 1,
                    opacity: this.gestureInProgress ? 255 * progress : 255,
                    time: this.gestureInProgress ? 0 : this._settings.animation_time,
                    transition: 'easeInOutQuint',
                });
            }
            if (this._fromSubSwitcher !== null && !this._fromSubSwitcher._animatingClosed) {
                this._manager.platform.tween(this._fromSubSwitcher.previewActor, {
                    scale_x: this.gestureInProgress ? 1-progress : 0,
                    scale_y: this.gestureInProgress ? 1-progress : 0,
                    scale_z: this.gestureInProgress ? 1-progress : 0,
                    opacity: this.gestureInProgress ? 255 * (1 - progress) : 0,
                    time: this.gestureInProgress ? 0 : this._settings.animation_time,
                    transition: 'easeInOutQuint',
                    onComplete: () => {
                        if (!this.gestureInProgress) this._fromSubSwitcher.actor.hide();
                    },
                });
            }
        }
    }

    _setCurrentIndex(value) {
        this._currentIndex = value;
    }

    _next() {
        if (this._parent === null) this._manager.platform.dimBackground();
        this._stopClosing();
        if (this._windows.length <= 1) {
            this._setCurrentIndex(0);
            this._updatePreviews(false, 1);
        } else {
            this.actor.set_reactive(false);
            if (this._parent && this._currentIndex == this._previews.length - 1) {
                this._parent._next();
            } else {
                this._previewNext();
            }
            this._showSubswitcher(Direction.TO_RIGHT);

            this.actor.set_reactive(true);
        }
        this._updateWindowTitle();
    }

    _previous() {
        if (this._parent === null) this._manager.platform.dimBackground();
        this._stopClosing();
        if (this._windows.length <= 1) {
            this._setCurrentIndex(0);
            this._updatePreviews(false, -1);
        } else {
            this.actor.set_reactive(false);
            if (this._parent && this._currentIndex == 0) {
                this._parent._previous();
            } else {
                this._previewPrevious();
            }
            this._showSubswitcher(Direction.TO_LEFT);
            this.actor.set_reactive(true);
        }
        this._updateWindowTitle();
    }

    _getSwitcherBackgroundColor() {
        if (this._backgroundColor === null) {
            let widgetClass = this._manager.platform.getWidgetClass();
            let parent = new widgetClass({ visible: false, reactive: false, style_class: 'switcher-list'});
            let actor = new widgetClass({ visible: false, reactive: false, style_class: 'item-box' });
            parent.add_child(actor);
            actor.add_style_pseudo_class('selected');
            Main.uiGroup.add_child(parent);
            this._backgroundColor = actor.get_theme_node().get_background_color();
            Main.uiGroup.remove_child(parent);
            parent = null;
            let color = new GLib.Variant("(ddd)", [this._backgroundColor.red/255, this._backgroundColor.green/255, this._backgroundColor.blue/255]);
            this._manager.platform._extensionSettings.set_value("switcher-background-color", color);
        }
        return this._backgroundColor;
    }

    _updateActiveMonitor() {
        // Always return the original monitor, otherwise, previews ease to the
        // wrong monitor on destroy if you move the mouse to a different monitor.
        if (!this._activeMonitor) {
            if (!this._settings.enforce_primary_monitor)
                this._activeMonitor = Main.layoutManager.currentMonitor;
            else
                this._activeMonitor = Main.layoutManager.primaryMonitor;
        }
        this.num_monitors = global.display.get_n_monitors();
        this.monitors_ltr = [];
        for (let m of Main.layoutManager.monitors) {
            this.monitors_ltr.push(m);
        }

        this.monitors_ltr.sort(function compareFn(A, B) {
            return A.x - B.x;
        });

        this.monitor_number = this._activeMonitor.index;
        return this._activeMonitor;
    }

    _raiseIcons() {
        for (let i = 0; i < this._windows.length; i++) {
            this.previewActor.set_child_above_sibling(this._windowTitles[i], null);
            this.previewActor.set_child_above_sibling(this._windowIconBoxes[i], null);
        }
        
    }

    _getWindowTitle(index) {
        let overlay_icon_size = this._settings.overlay_icon_size;
        let window_title = new St.Label({
            style_class: 'switcher-list',
            text: this._windows[index].get_title(),
            opacity: 0
        });
        this.previewActor.add_child(window_title);
        let app_icon_size;
        let label_offset;
        if (this._settings.icon_style == "Classic") {
            app_icon_size = this._settings.text_scaling_factor * ICON_SIZE ;
            label_offset = this._settings.text_scaling_factor * (ICON_SIZE + ICON_TITLE_SPACING);
        } else {
            app_icon_size = this._settings.text_scaling_factor * overlay_icon_size;
            label_offset = 0;
        } 
        // ellipsize if title is too long
        let font_size = 14 * this._settings.text_scaling_factor;
        window_title.set_style("max-width:" + (this.actor.width - 200) + "px;font-size: " + font_size + "px;font-weight: bold; padding: " + font_size + "px;");
        window_title.clutter_text.ellipsize = Pango.EllipsizeMode.END;

        let cx = Math.round((this.actor.width + label_offset) / 2);
        let cy = Math.round(this.actor.height * this._settings.title_position / 8 + this._settings.offset);

        window_title.x = cx - Math.round(window_title.get_width()/2);
        window_title.y = cy - Math.round(window_title.get_height()/2);
        this._windowTitles[index] = window_title;

        let app = this._tracker.get_window_app(this._windows[index]);
        let icon = app ? app.create_icon_texture(app_icon_size) : null;

        if (!icon) {
            icon = new St.Icon({
                icon_name: 'applications-other',
                icon_size: app_icon_size
            });
        }

        if (this._settings.icon_has_shadow) {
            icon.add_style_class_name("icon-dropshadow");
        }
        let application_icon_box;
        if (this._settings.icon_style == "Classic") {
            application_icon_box = new St.Bin({
                style_class: 'window-iconbox',
                opacity: 0,
                width: app_icon_size,
                height: app_icon_size,
                x: Math.round(this._windowTitles[index].x - app_icon_size - ICON_TITLE_SPACING),
                y: Math.round(cy - app_icon_size/2)
            });
        } else {
            application_icon_box = new St.Bin({
                style_class: 'window-iconbox',
                width: app_icon_size * 1.25,
                height: app_icon_size * 1.25,
                opacity: 0,
                x: (this.actor.width - app_icon_size * 1.25) / 2,
                y: (this.actor.height - app_icon_size * 1.25) / 2 + this._settings.offset,
            });
        }

        application_icon_box.set_child(icon);
        this.previewActor.add_child(application_icon_box);
        this._windowIconBoxes[index] = application_icon_box;
    }

    _updateWindowTitle() {
        let idx_low = Math.floor(this._currentIndex);
        let idx_high = Math.ceil(this._currentIndex);

        if (idx_low == idx_high) {
            for (let window_title of this._windowTitles) {
                this._manager.platform.tween(window_title, {
                    opacity: 0,
                    time: this.gestureInProgress ? 0 : this._settings.animation_time,
                    transition: 'easeInOutQuint',
                });
            }
            
            let window_title = this._windowTitles[idx_low];
            this._manager.platform.tween(window_title, {
                opacity: 255,
                time: this.gestureInProgress ? 0 : this._settings.animation_time,
                transition: 'easeInOutQuint',
            });
            
            for (let icon_box of this._windowIconBoxes) {
                this._manager.platform.tween(icon_box, {
                    opacity: 0,
                    time: this.gestureInProgress ? 0 : this._settings.animation_time,
                    transition: 'easeInOutQuint',
                });
            }
            let alpha = 1;
            if (this._settings.icon_style === "Attached") {
                alpha = 0;
            } else if (this._settings.icon_style === "Overlay") {
                alpha = this._settings.overlay_icon_opacity;
            }

            if ((this._parent == null && !this._isAppSwitcher) || (!this._settings.attach_overlay_icons && this._parent == null)) {
                let icon_box = this._windowIconBoxes[idx_low];
                this._manager.platform.tween(icon_box, {
                    opacity: alpha * 255,
                    time: this.gestureInProgress ? 0 : this._settings.animation_time,
                    transition: 'easeInOutQuint',
                });
            }
        } else {

            let window_title_low = this._windowTitles[idx_low];
            let window_title_high = this._windowTitles[idx_high];

            let progress = this._currentIndex - idx_low;
            window_title_low.opacity = 255 * (1 - progress);
            window_title_high.opacity = 255 * progress;

            let icon_box_low = this._windowIconBoxes[idx_low];
            let icon_box_high = this._windowIconBoxes[idx_high];

            let alpha = 1;
            if (this._settings.icon_style === "Attached") {
                alpha = 0;
            } else if (this._settings.icon_style === "Overlay") {
                alpha = this._settings.overlay_icon_opacity;
            }

            icon_box_low.opacity = alpha * 255 * (1 - progress);
            icon_box_high.opacity = alpha * 255 * progress;

        }
    }

    _keyPressEvent(actor, event) {
        switch(event.get_key_symbol()) {

            case Clutter.KEY_Escape:
            case Clutter.Escape:
                // Esc -> close CoverFlow
                this._activateSelected();
                return true;

            case Clutter.KEY_q:
            case Clutter.KEY_Q:
            case Clutter.KEY_F4:
            case Clutter.q:
            case Clutter.Q:
            case Clutter.F4:
                // Q -> Close window
                this._manager.removeSelectedWindow(this._windows[this._currentIndex]);
                return true;

            case Clutter.KEY_Down:
            case Clutter.Down:
                this._showSubswitcher(Direction.TO_RIGHT);
                return true;

            case Clutter.KEY_Right:
            case Clutter.Right:
                // Right/Down -> navigate to next preview
                this._next();
                return true;

            case Clutter.KEY_Left:
            case Clutter.Left:
                // Left/Up -> navigate to previous preview
                this._previous();
                return true;

            case Clutter.KEY_d:
            case Clutter.KEY_D:
            case Clutter.d:
            case Clutter.D:
                // D -> Show desktop
                this._showDesktop();
                return true;
        }
        // default alt-tab
        let event_state = event.get_state();
        let action = global.display.get_keybinding_action(event.get_key_code(), event_state);
        switch(action) {
            case Meta.KeyBindingAction.SWITCH_APPLICATIONS:
            case Meta.KeyBindingAction.SWITCH_GROUP:
            case Meta.KeyBindingAction.SWITCH_WINDOWS:
            case this._manager.platform.getAction("coverflow-switch-windows"):
            case this._manager.platform.getAction("coverflow-switch-applications"):
                
                // shift -> backwards
                if (event_state & Clutter.ModifierType.SHIFT_MASK) {
                    this._previous();
                } else {
                    this._next();
                }
                
                return true;
            case Meta.KeyBindingAction.SWITCH_APPLICATIONS_BACKWARD:
            case Meta.KeyBindingAction.SWITCH_GROUP_BACKWARD:
            case Meta.KeyBindingAction.SWITCH_WINDOWS_BACKWARD:
            case this._manager.platform.getAction("coverflow-switch-windows-backward"):
            case this._manager.platform.getAction("coverflow-switch-applications-backward"):

                this._previous();
                return true;
        }

        return true;
    }

    _keyReleaseEvent(actor, event) {
        let [x, y, mods] = global.get_pointer();
        let state = mods & this._modifierMask;
        if (state == 0 && !this._animatingClosed) {
            if (this._initialDelayTimeoutId !== 0)
                this._setCurrentIndex((this._currentIndex + 1) % this._windows.length);
            this._activateSelected();
        }

        return true;
    }
    _windowDestroyed(wm, actor) {
		this._removeDestroyedWindow(actor.meta_window);
    }

    _checkDestroyed(window) {
        this._removeDestroyedWindow(window);
    }

    _removeDestroyedWindow(window) {
        for (let i in this._windows) {
            if (window == this._windows[i]) {
                if (this._windows.length === 1)
                    this.destroy(CloseReason.ACTIVATE_SELECTED);
                else {
                    this._windows.splice(i, 1);
                    this._previews[i].destroy();
                    this._previews.splice(i, 1);
                    this._setCurrentIndex((i < this._currentIndex) ? this._currentIndex - 1 :
                        this._currentIndex % this._windows.length);
                    this._updatePreviews(false, 0);
                    this._updateWindowTitle();
                }
                return;
            }
        }
    }

    _previewButtonPressEvent(preview) {
        for (let [i, p] of this._previews.entries()) {
            if (preview == p) {
                this._setCurrentIndex(i);
                this._activateSelected(true);
                break;
            }
        }
    }

    _activateSelected(reset_current_window_title) {
        this._swipeTracker.enabled = false;
        let preview = this._previews[this._currentIndex];
        if (preview) {
            preview.remove_highlight();
        }
        let win = this._windows[this._currentIndex];
        if (win) {
            this._manager.activateSelectedWindow(win);
            if (reset_current_window_title) this._updateWindowTitle();
        }
        if (this._parent) {
            this._parent.animateClosed(CloseReason.NO_ACTIVATION);
        }
        this.animateClosed(CloseReason.ACTIVATE_SELECTED);
    }

    _showDesktop() {
        for (let window of this._windows) {
            if (!window.minimized) {
                window.minimize();
            }
        }
        this.animateClosed(CloseReason.ACTIVATE_SELECTED);
    }

    _getRandomArbitrary(min, max) {
        return Math.random() * (max - min) + min;
    }

    _getRandomTime() {
        return this._settings.animation_time * (this._settings.randomize_animation_times ? this._getRandomArbitrary(0.5, 1) : 1);
    }

    _hide(reason) {
        this.actor.hide();
    }


    _onPreviewAnimationComplete() {
        this._numPreviewsComplete += 1;
        if (this._previews !== null && this._numPreviewsComplete >= this._previews.length) {
            this.destroy();
        }
    }

    destroy() {
        if (this._haveModal) {
            Main.popModal(this._grab);
            this._haveModal = false;
        }

        if (this._isAppSwitcher) {
            if (this._subSwitchers != null) { 
                for (let switcher of this._subSwitchers.values()) {
                    switcher.destroy();
                }
            }
        }

        if (this._initialDelayTimeoutId !== 0) {
            GLib.Source.remove(this._initialDelayTimeoutId);
        }

        if (this._swipeTracker) {
            this._swipeTracker.destroy();
        }
        this._swipeTracker = null;
        this._windows = null;
        this._appWindowsMap = null;
        this._subSwitchers = null;
        this._windowTitles = null;
        this._windowIconBoxes = null;
        this._previews = null;
        this._allPreviews = null;
        this._initialDelayTimeoutId = null;
        this._windowManager.disconnect(this._dcid);
        this._windowManager.disconnect(this._mcid);

        if (this._parent === null) { global.window_group.show() };
        if (this._parent === null) this._manager.platform.removeBackground();

        this._disablePerspectiveCorrection();
        Main.uiGroup.remove_child(this.actor);
    }

    animateClosed(reason=CloseReason.ACTIVATE_SELECTED) {
        if (this._animatingClosed) return;
        this._animatingClosed = true;
        let transition = 'userChoice';
        if (this._parent) {
            this._ungrabModal();
        }
        if (this._initialDelayTimeoutId === 0) {
            // window title and icon
            for (let window_title of this._windowTitles) {
                this._manager.platform.tween(window_title, {
                    time: this._settings.animation_time,
                    opacity: 0,
                    transition: 'easeInOutQuint',
                });
            }
            for (let icon_box of this._windowIconBoxes) {
                this._manager.platform.tween(icon_box, {
                    time: this._settings.animation_time,
                    opacity: 0,
                    transition: 'easeInOutQuint',
                });
            }

            this._removeBackgroundEffects();

            if (this._parent === null) this._manager.platform.lightenBackground();

            // preview windows
            let currentWorkspace = this._manager.workspace_manager.get_active_workspace();
            if (reason === CloseReason.ACTIVATE_SELECTED) {
                for (let [i, preview] of this._previews.entries()) {
                    let metaWin = preview.metaWin;

                    let animation_time = this._getRandomTime();
                    if (i == this._currentIndex) {
                        animation_time = this._settings.animation_time;
                    }
                    preview.removeIcon(animation_time);
                    if (!metaWin.minimized && metaWin.get_workspace() === currentWorkspace) {
                        let rect = metaWin.get_buffer_rect();
                        this._manager.platform.tween(preview, {
                            x: rect.x - this.actor.x,
                            y: rect.y - this.actor.y,
                            translation_x: 0,
                            scale_x: 1,
                            scale_y: 1,
                            scale_z: 1,
                            opacity: 255,
                            rotation_angle_y: 0.0,
                            onComplete: this._onPreviewAnimationComplete.bind(this),
                            time: animation_time,
                            transition: transition,
                        });
                    } else {
                        let monitor = Main.layoutManager.monitors[preview.metaWin.get_monitor()];
                        let pivot_point = preview.get_pivot_point_placement(Placement.TOP_LEFT);
                        preview.make_bottom_layer(this.previewActor);
                        let animation_time = this._getRandomTime();
                        this._manager.platform.tween(preview, {
                            x: monitor.x - this.actor.x,
                            y: monitor.y - this.actor.y,
                            translation_x: 0,
                            pivot_point: pivot_point,
                            rotation_angle_y: 0.0,
                            onComplete: this._onPreviewAnimationComplete.bind(this),
                            time: animation_time,
                            transition: transition,
                        });
                        this._manager.platform.tween(preview, {
                            scale_x: 0,
                            scale_y: 0,
                            scale_z: 0,
                            opacity: 0,
                            time: 0.95 * animation_time,
                            transition: 'easeInOutQuint'
                        });
                    }
                }
                for (let preview of this._allPreviews) {
                    preview.make_top_layer(this.previewActor);
                    let transient_for_window = preview.metaWin.get_transient_for();
                    if (transient_for_window !== null) {
                        for (let p of this._allPreviews) {
                            if (p.metaWin == transient_for_window) {
                                this.previewActor.set_child_above_sibling(preview, p);
                            }
                        }
                    }
                    if (!this._previews.includes(preview) && preview.metaWin.get_workspace() == currentWorkspace && !preview.metaWin.minimized) {
                        let rect = preview.metaWin.get_buffer_rect();
                        let atime = this._getRandomTime();
                        this._manager.platform.tween(preview, {
                            x: rect.x - this.actor.x,
                            y: rect.y - this.actor.y,
                            translation_x: 0,
                            rotation_angle_y: 0.0,
                            time: atime,
                            transition: 'userChoice',
                        });
                        this._manager.platform.tween(preview, {
                            scale_x: 1,
                            scale_y: 1,
                            scale_z: 1,
                            opacity: 255,
                            time: 0.5 * atime,
                            transition: 'easeInOutQuint',
                        });
                    }
                }
                let current_preview = this._previews[Math.round(this._currentIndex)];
                let current_preview_transient = current_preview.metaWin.get_transient_for() 
                if (current_preview_transient !== null) {
                    for (let p of this._allPreviews) {
                        if (p.metaWin == current_preview_transient) {
                            p.make_top_layer(this.previewActor);
                            break;
                        }
                    }
                }
                current_preview.make_top_layer(this.previewActor);
                for (let p of this._allPreviews) {
                    if (p.metaWin.get_transient_for() == current_preview.metaWin) {
                        this.previewActor.set_child_above_sibling(p, current_preview);
                    }
                }
                this._raiseIcons();
            } else {
                let monitor = this._updateActiveMonitor();
                this._manager.platform.tween(this.actor, {
                    x: monitor.x,
                    y: monitor.y,
                    scale_x: 0,
                    scale_y: 0,
                    scale_z: 0,
                    opacity: 0,
                    time: 0.99*this._settings.animation_time,
                    transition: 'easeInOutQuint',
                    onComplete: this.destroy.bind(this),
                });
            }
        } else {
            this.destroy();
        }
    }

    /* Code that ensures redrawing even if the compositor thinks there 
    should be clipping. Necessary because nmoving the camera does 
    not move the clipping pov so the compositor thinks some things don't need
    redrawing because they are blocked by other things, but that's only 
    true from the perspective of the centered camera. For some reason this
    works better than the inhibitCulling method which doesn't seem to work. 

    Code stolen from the blur my shell extension, blur-my-shell@aunetx.*/
    /// Add the Clutter debug flag.
    _disable_clipped_redraws() {
        Meta.add_clutter_debug_flags(
            null, Clutter.DrawDebugFlag.DISABLE_CLIPPED_REDRAWS, null
        );
    }

    /// Remove the Clutter debug flag.
    _reenable_clipped_redraws() {
        Meta.remove_clutter_debug_flags(
            null, Clutter.DrawDebugFlag.DISABLE_CLIPPED_REDRAWS, null
        );
    }

    /*
     *
     * The following code that centers the camera on an off-center monitor
     * is taken from the Desktop Cube extension.
     * https://github.com/Schneegans/Desktop-Cube/blob/fa07fba3016ede5049eace2c028a7ba34dae12ef/extension.js#L1032-L1174
     *
     */

    // Calls inhibit_culling on the given actor and recursively on all mapped children.
    _inhibitCulling(actor) {
        if (actor.mapped) {
            actor.inhibit_culling();
            actor._culling_inhibited = true;
            actor.get_children().forEach(c => this._inhibitCulling(c));
        }
    };

    // Calls uninhibit_culling on the given actor and recursively on all children. It will
    // only call uninhibit_culling() on those actors which were inhibited before.
    _uninhibitCulling(actor) {
        if (actor._culling_inhibited) {
            delete actor._culling_inhibited;
            actor.uninhibit_culling();
            actor.get_children().forEach(c => this._uninhibitCulling(c));
        }
    };
    // Usually, GNOME Shell uses one central perspective for all monitors combined. This
    // results in a somewhat sheared appearance of the cube on multi-monitor setups where
    // the primary monitor is not in the middle (or cubes are shown on multiple monitors).
    // With the code below, we modify the projection and view matrices for each monitor so
    // that each monitor uses its own central perspective. This seems to be possible on
    // Wayland only. On X11, there's only one set of projection and view matrices for all
    // monitors combined, so we tweak them so that the projection center is in the middle of
    // the primary monitor. So it will at least only look bad on X11 if the cube is shown on
    // all monitors...
    _enablePerspectiveCorrection() {
        if (this._settings.perspective_correction_method != "Move Camera") return;
        if (this._parent != null) return;
        this._disable_clipped_redraws();
        this._stageBeforeUpdateID = global.stage.connect('before-update', (stage, view) => {
            // Do nothing if neither overview or desktop switcher are shown.
            if (!this.actor.visible) {
                return;
            }

            // Usually, the virtual camera is positioned centered in front of the stage. We will
            // move the virtual camera around. These variables will be the new stage-relative
            // coordinates of the virtual camera.
            let cameraX, cameraY;

            const activeMonitorRect =
              global.display.get_monitor_geometry(this._activeMonitor);

            cameraX = this.actor.x + this.actor.width / 2;
            cameraY = this.actor.y + this.actor.height / 2;

            // This is the offset to the original, centered camera position. Y is flipped due to
            // some negative scaling at some point in Mutter.
            const camOffsetX = stage.width / 2 - cameraX;
            const camOffsetY = cameraY - stage.height / 2;

            const z_near = stage.perspective.z_near;
            const z_far  = stage.perspective.z_far;

            // The code below is copied from Mutter's Clutter.
            // https://gitlab.gnome.org/GNOME/mutter/-/blob/main/clutter/clutter/clutter-stage.c#L2255
            const A = 0.57735025882720947265625;
            const B = 0.866025388240814208984375;
            const C = 0.86162912845611572265625;
            const D = 0.00872653536498546600341796875;

            const z_2d = z_near * A * B * C / D + z_near;

            // The code below is copied from Mutter's Clutter as well.
            // https://gitlab.gnome.org/GNOME/mutter/-/blob/main/clutter/clutter/clutter-stage.c#L2270
            const top    = z_near * Math.tan(stage.perspective.fovy * Math.PI / 360.0);
            const left   = -top * stage.perspective.aspect;
            const right  = top * stage.perspective.aspect;
            const bottom = -top;

            const left_2d_plane   = left / z_near * z_2d;
            const right_2d_plane  = right / z_near * z_2d;
            const bottom_2d_plane = bottom / z_near * z_2d;
            const top_2d_plane    = top / z_near * z_2d;

            const width_2d_start  = right_2d_plane - left_2d_plane;
            const height_2d_start = top_2d_plane - bottom_2d_plane;

            const width_scale  = width_2d_start / stage.width;
            const height_scale = height_2d_start / stage.height;
            // End of the copy-paste code.

            // Compute the required offset of the frustum planes at the near plane. This
            // basically updates the projection matrix according to our new camera position.
            const offsetX = camOffsetX * width_scale / z_2d * z_near;
            const offsetY = camOffsetY * height_scale / z_2d * z_near;

            // Set the new frustum.
            view.get_framebuffer().frustum(left + offsetX, right + offsetX, bottom + offsetY,
                                           top + offsetY, z_near, z_far);

            // Translate the virtual camera. This basically updates the view matrix according to
            // our new camera position.
            view.get_framebuffer().push_matrix();
            view.get_framebuffer().translate(camOffsetX * width_scale,
                                             camOffsetY * height_scale, 0);

            this._inhibitCulling(this.actor);
        });

        // Revert the matrix changes before the update,
        this._stageAfterUpdateID = global.stage.connect('after-update', (stage, view) => {
            // Nothing to do if neither overview or desktop switcher are shown.
            if (!this.actor.visible) {
                return;
            }

            view.get_framebuffer().pop_matrix();
            view.get_framebuffer().perspective(stage.perspective.fovy, stage.perspective.aspect,
                                               stage.perspective.z_near,
                                               stage.perspective.z_far);
            this._uninhibitCulling(this.actor);
        });
    }

    // Reverts the changes done with the method above.
    _disablePerspectiveCorrection() {
        if (this._stageBeforeUpdateID) {
            global.stage.disconnect(this._stageBeforeUpdateID);
            this._stageBeforeUpdateID = 0;
        }

        if (this._stageAfterUpdateID) {
            global.stage.disconnect(this._stageAfterUpdateID);
            this._stageAfterUpdateID = 0;
        }
        this._reenable_clipped_redraws();
    }
}
