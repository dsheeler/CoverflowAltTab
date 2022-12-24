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

const Clutter = imports.gi.Clutter;
const Config = imports.misc.config;
const St = imports.gi.St;
const Meta = imports.gi.Meta;
const Mainloop = imports.mainloop;
const Main = imports.ui.main;
const Pango = imports.gi.Pango;

const INITIAL_DELAY_TIMEOUT = 150;
const CHECK_DESTROYED_TIMEOUT = 100;
const ICON_SIZE = 64;
const ICON_SIZE_BIG = 128;
const ICON_TITLE_SPACING = 10;

const ExtensionImports = imports.misc.extensionUtils.getCurrentExtension().imports;

const {
    Preview,
    Placement,
    Direction,
    findUpperLeftFromCenter
} = ExtensionImports.preview;

const {__ABSTRACT_METHOD__} = ExtensionImports.lib;

var Switcher = class Switcher {
    constructor(windows, mask, currentIndex, manager) {
        this._manager = manager;
        this._settings = manager.platform.getSettings();
        this._windows = windows;
        this._windowTitle = null;
        this._icon = null;
        this._modifierMask = null;
        this._currentIndex = currentIndex;
        this._haveModal = false;
        this._tracker = manager.platform.getWindowTracker();
        this._windowManager = global.window_manager;
        this._lastTime = 0;
        this._checkDestroyedTimeoutId = 0;
        this._requiresUpdate = false;
        this._previews = [];
        this._numPreviewsComplete = 0
        this._dcid = this._windowManager.connect('destroy', this._windowDestroyed.bind(this));
        this._mcid = this._windowManager.connect('map', this._activateSelected.bind(this));
        manager.platform.switcher = this;
        manager.platform.initBackground();

        // create a container for all our widgets
        let widgetClass = manager.platform.getWidgetClass();
        this.actor = new widgetClass({ visible: true, reactive: true, });
        this.actor.hide();
        this.previewActor = new widgetClass({ visible: true, reactive: true});
        this.actor.add_actor(this.previewActor);

        Main.uiGroup.add_actor(this.actor);

        this.grab = Main.pushModal(this.actor)
        if (!this.grab) {
            this._activateSelected();
            return;
        }

        this._haveModal = true;

        this.actor.connect('key-press-event', this._keyPressEvent.bind(this));
        this.actor.connect('key-release-event', this._keyReleaseEvent.bind(this));
        this.actor.connect('scroll-event', this._scrollEvent.bind(this));

        this._modifierMask = manager.platform.getPrimaryModifier(mask);

        let [x, y, mods] = global.get_pointer();
        if (!(mods & this._modifierMask)){
    			// There's a race condition; if the user released Alt before
    			// we got the grab, then we won't be notified. (See
    			// https://bugzilla.gnome.org/show_bug.cgi?id=596695 for
    			// details) So we check now. (Have to do this after updating
    			// selection.)
    			this._activateSelected();
    			return;
        }

        this._initialDelayTimeoutId = Mainloop.timeout_add(INITIAL_DELAY_TIMEOUT, this.show.bind(this));
    }

    show() {
        let monitor = this._updateActiveMonitor();
        this.actor.set_position(monitor.x, monitor.y);
        this.actor.set_size(monitor.width, monitor.height);
        // create previews
        this._createPreviews();

        for (let preview of this._previews) {
            preview.switcher = this;
            preview.set_reactive(false);
            preview.connect('button-press-event', this._previewButtonPressEvent.bind(this, preview));
        }

        // hide windows and show Coverflow actors
        global.window_group.hide();
        this.actor.show();
        this._enablePerspectiveCorrection();


        //this._manager.platform.dimBackground();

        this._initialDelayTimeoutId = 0;

        this._next();
    }

    _createPreviews() { __ABSTRACT_METHOD__(this, this._createPreviews) }
    _updatePreviews() { __ABSTRACT_METHOD__(this, this._updatePreviews) }

    _previewNext() { __ABSTRACT_METHOD__(this, this._previewNext) }
    _previewPrevious() { __ABSTRACT_METHOD__(this, this._previewPrevious) }

    _checkSwitchTime() {
        let t = new Date().getTime();
        // remove this check because of #96
        // in theory we could remove this whole method but it's better
        // to wait a while to check nothing bad happens because of that
        // if (t - this._lastTime < 150)
        //     return false;
        this._lastTime = t;
        return true;
    }

    _next() {
        this._manager.platform.dimBackground();
        this._destroying = false;
        if (this._windows.length <= 1) {
            this._currentIndex = 0;
            this._updatePreviews(false, 1);
        } else {
            this.actor.set_reactive(false);
            this._previewNext();
            this.actor.set_reactive(true);
        }
        this._setCurrentWindowTitle(this._windows[this._currentIndex]);
    }

    _previous() {
        this._manager.platform.dimBackground();
        this._destroying = false;
        if (this._windows.length <= 1) {
            this._currentIndex = 0;
            this._updatePreviews(false, -1);
        } else {
            this.actor.set_reactive(false);
            this._previewPrevious();
            this.actor.set_reactive(true);
        }
        this._setCurrentWindowTitle(this._windows[this._currentIndex]);
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

    _setCurrentWindowTitle(window, initially_opaque=false) {
        let animation_time = this._settings.animation_time;
        let overlay_icon_size = this._settings.overlay_icon_size;
        let preview = this._previews[this._currentIndex];

        let monitor = this._updateActiveMonitor();

        let app_icon_size;
        let label_offset;
        if (this._settings.icon_style == "Classic") {
            app_icon_size = this._settings.text_scaling_factor * ICON_SIZE ;
            label_offset = this._settings.text_scaling_factor * (ICON_SIZE + ICON_TITLE_SPACING);
        } else {
            app_icon_size = this._settings.text_scaling_factor * overlay_icon_size;
            label_offset = 0;
        }

        // window title label
        if (this._windowTitle) {
            this.actor.remove_actor(this._windowTitle);
        }

        this._windowTitle = new St.Label({
            style_class: 'switcher-list',
            text: this._windows[this._currentIndex].get_title(),
            opacity: 0
        });

        // ellipsize if title is too long
        let font_size = 14 * this._settings.text_scaling_factor;
        this._windowTitle.set_style("max-width:" + (monitor.width - 200) + "px;font-size: " + font_size + "px;font-weight: bold; padding: " + font_size + "px;");
        this._windowTitle.clutter_text.ellipsize = Pango.EllipsizeMode.END;

        this.actor.add_actor(this._windowTitle);
        this._manager.platform.tween(this._windowTitle, {
            opacity: 255,
            time: animation_time,
            transition: 'easeInOutQuint',
        });

        let cx = Math.round((monitor.width + label_offset) / 2);
        let cy = Math.round(monitor.height * this._settings.title_position / 8 + this._settings.offset);

        this._windowTitle.x = cx - Math.round(this._windowTitle.get_width()/2);
        this._windowTitle.y = cy - Math.round(this._windowTitle.get_height()/2);

        // window icon
        if (this._applicationIconBox) {
            this.actor.remove_actor(this._applicationIconBox);
        }

        let app = this._tracker.get_window_app(this._windows[this._currentIndex]);
        this._icon = app ? app.create_icon_texture(app_icon_size) : null;

        if (!this._icon) {
            this._icon = new St.Icon({
                icon_name: 'applications-other',
                icon_size: app_icon_size
            });
        }

        if (this._settings.icon_has_shadow) {
            this._icon.add_style_class_name("icon-dropshadow");
        }

        if (this._settings.icon_style == "Classic") {
            this._applicationIconBox = new St.Bin({
                style_class: 'window-iconbox',
                opacity: 0,
                width: app_icon_size,
                height: app_icon_size,
                x: Math.round(this._windowTitle.x - app_icon_size - ICON_TITLE_SPACING),
                y: Math.round(cy - app_icon_size/2)
            });
        } else {
            this._applicationIconBox = new St.Bin({
                style_class: 'window-iconbox',
                width: app_icon_size * 1.25,
                height: app_icon_size * 1.25,
                opacity: (initially_opaque ? 255 * this._settings.overlay_icon_opacity : 0),
                x: (monitor.width - app_icon_size * 1.25) / 2,
                y: (monitor.height - app_icon_size * 1.25) / 2 + this._settings.offset,
            });
        }

        this._applicationIconBox.add_actor(this._icon);
        this.actor.add_actor(this._applicationIconBox);
        let alpha = 1;
        if (this._settings.icon_style !== "Classic") {
            alpha = this._settings.overlay_icon_opacity;
        }

        this._manager.platform.tween(this._applicationIconBox, {
            opacity: 255 * alpha,
            time: animation_time,
            transition: 'easeInOutQuint',
        });
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

            case Clutter.KEY_Right:
            case Clutter.KEY_Down:
            case Clutter.Right:
            case Clutter.Down:
                // Right/Down -> navigate to next preview
                if (this._checkSwitchTime())
                    this._next();
                return true;

            case Clutter.KEY_Left:
            case Clutter.KEY_Up:
            case Clutter.Left:
            case Clutter.Up:
                // Left/Up -> navigate to previous preview
                if (this._checkSwitchTime())
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
            case Meta.KeyBindingAction.SWITCH_PANELS:
                if (this._checkSwitchTime()) {
                    // shift -> backwards
                    if (event_state & Clutter.ModifierType.SHIFT_MASK)
                        this._previous();
                    else
                        this._next();
                }
                return true;
            case Meta.KeyBindingAction.SWITCH_APPLICATIONS_BACKWARD:
            case Meta.KeyBindingAction.SWITCH_GROUP_BACKWARD:
            case Meta.KeyBindingAction.SWITCH_WINDOWS_BACKWARD:
            case Meta.KeyBindingAction.SWITCH_PANELS_BACKWARD:
                if (this._checkSwitchTime())
                    this._previous();
                return true;
        }

        return true;
    }

    _keyReleaseEvent(actor, event) {
        let [x, y, mods] = global.get_pointer();
        let state = mods & this._modifierMask;

        if (state == 0 && !this._destroying) {
            if (this._initialDelayTimeoutId !== 0)
                this._currentIndex = (this._currentIndex + 1) % this._windows.length;
            this._activateSelected();
        }

        return true;
    }

    // allow navigating by mouse-wheel scrolling
    _scrollEvent(actor, event) {
        switch (event.get_scroll_direction()) {
        	case Clutter.ScrollDirection.LEFT:
        	case Clutter.ScrollDirection.UP:
              this._previous();
              return true;

        	case Clutter.ScrollDirection.RIGHT:
        	case Clutter.ScrollDirection.DOWN:
              this._next();
              return true;
        }
        return true;
    }

    _windowDestroyed(wm, actor) {
		this._removeDestroyedWindow(actor.meta_window);
    }

    _checkDestroyed(window) {
        this._checkDestroyedTimeoutId = 0;
        this._removeDestroyedWindow(window);
    }

    _removeDestroyedWindow(window) {
        for (let i in this._windows) {
            if (window == this._windows[i]) {
                if (this._windows.length === 1)
                    this.destroy();
                else {
                    this._windows.splice(i, 1);
                    this._previews[i].destroy();
                    this._previews.splice(i, 1);
                    this._currentIndex = (i < this._currentIndex) ? this._currentIndex - 1 :
                        this._currentIndex % this._windows.length;
                    this._updatePreviews(false, 0);
                    this._setCurrentWindowTitle(this._windows[this._currentIndex]);
                }
                return;
            }
        }
    }

    _previewButtonPressEvent(preview) {
        for (let [i, p] of this._previews.entries()) {
            if (preview == p) {
                this._currentIndex = i;
                this._activateSelected(true);
                break;
            }
        }
    }

    _activateSelected(reset_current_window_title) {
        let preview = this._previews[this._currentIndex];
        if (preview) {
            preview.remove_highlight();
        }
        let win = this._windows[this._currentIndex];
        if (win) {
            this._manager.activateSelectedWindow(win);
            if (reset_current_window_title) this._setCurrentWindowTitle(win, true);
        }
        this.destroy();
    }

    _showDesktop() {
        for (let window of this._windows) {
            if (!window.minimized) {
                window.minimize();
            }
        }
        this.destroy();
    }

    _getRandomArbitrary(min, max) {
        return Math.random() * (max - min) + min;
    }

    _onDestroy(transition) {
        this._destroying = true;
        let monitor = this._updateActiveMonitor();
        if (this._initialDelayTimeoutId === 0) {
            // window title and icon
            this._windowTitle.hide();
            if (this._settings.icon_style == 'Classic') {
                this._applicationIconBox.hide();
            } else {
                this._manager.platform.tween(this._applicationIconBox, {
                    time: this._settings.animation_time,
                    opacity: 0,
                    transition: 'easeInOutQuint',
                });
            }
            this._manager.platform.lightenBackground();


            // preview windows
            let currentWorkspace = this._manager.workspace_manager.get_active_workspace();
            this._destroying = true;
            for (let [i, preview] of this._previews.entries()) {
                let metaWin = this._windows[i],
                compositor = metaWin.get_compositor_private();

                let animation_time = this._settings.animation_time * (this._settings.randomize_animation_times ? this._getRandomArbitrary(0.0001, 1) : 1)
                // Move all non-activated windows behind the activated one
                if (i !== this._currentIndex) {
                    preview.make_bottom_layer(this.previewActor);
                } else {
                    preview.make_top_layer(this.previewActor);
                    animation_time = this._settings.animation_time;
                }
                if (!metaWin.minimized && metaWin.get_workspace().active) {
                    let rect = metaWin.get_buffer_rect();
                    this._manager.platform.tween(preview, {
                        x: rect.x - monitor.x,
                        y: rect.y - monitor.y,
                        translation_x: 0,
                        scale_x: 1,
                        scale_y: 1,
                        scale_z: 1,
                        rotation_angle_y: 0.0,
                        onComplete: this._onPreviewDestroyComplete.bind(this, false),
                        time: animation_time,
                        transition: transition,
                    });
                } else {
                    let pivot_point = preview.get_pivot_point_placement(Placement.CENTER);
                    this._manager.platform.tween(preview, {
                        x: 0,
                        y: 0,
                        opacity:  0,
                        translation_x: 0,
                        scale_x: 0,
                        scale_y: 0,
                        scale_z: 0,
                        pivot_point: pivot_point,
                        rotation_angle_y: 0.0,
                        onComplete: this._onPreviewDestroyComplete.bind(this, false),
                        time: this._settings.animation_time,
                        transition: 'easeLinear'
                    });
                }
            }
        } else {
            this._onPreviewDestroyComplete(true);
        }
    }

    _onPreviewDestroyComplete(force) {
        if (!force) this._numPreviewsComplete += 1;
        if (this._previews != null && this._numPreviewsComplete >= this._previews.length || force) {
            if (this._haveModal) {
               Main.popModal(this.grab);
                this._haveModal = false;
            }

            if (this._initialDelayTimeoutId !== 0) {
                Mainloop.source_remove(this._initialDelayTimeoutId);
            }

            if (this._checkDestroyedTimeoutId !== 0) {
                Mainloop.source_remove(this._checkDestroyedTimeoutId);
            }

            this._windows = null;
            this._windowTitle = null;
            this._icon = null;
            this._applicationIconBox = null;
            this._previews = null;
            this._initialDelayTimeoutId = null;
            this._checkDestroyedTimeoutId = null;
            this._windowManager.disconnect(this._dcid);
            this._windowManager.disconnect(this._mcid);

            this._manager.platform.removeBackground();

            this._disablePerspectiveCorrection();
            Main.uiGroup.remove_actor(this.actor);
            // show all window actors
            global.window_group.show();
            this._numPreviewsComplete = 0
        }
    }

    destroy() {
        this._onDestroy('userChoice');
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

            cameraX = this._activeMonitor.x + this._activeMonitor.width / 2;
            cameraY = this._activeMonitor.y + this._activeMonitor.height / 2;

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

            this._inhibitCulling(this.actor)
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

            this._uninhibitCulling(this.actor)
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
    }
}
