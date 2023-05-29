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

/* CoverflowAltTab::TimelineSwitcher:
 *
 * Extends CoverflowAltTab::Switcher, switching tabs using a timeline
 */

const Config = imports.misc.config;
const Clutter = imports.gi.Clutter;

const ExtensionImports = imports.misc.extensionUtils.getCurrentExtension().imports;

const BaseSwitcher = ExtensionImports.switcher.Switcher;

const {
    Preview,
    Placement,
    Direction,
    findUpperLeftFromCenter
} = ExtensionImports.preview;

let TRANSITION_TYPE;
let IN_BOUNDS_TRANSITION_TYPE;
const TILT_ANGLE = 24;

var TimelineSwitcher = class TimelineSwitcher extends BaseSwitcher {
    constructor(...args) {
        super(...args);
        TRANSITION_TYPE = 'userChoice';
        IN_BOUNDS_TRANSITION_TYPE = 'easeInOutQuint';
    }

    _createPreviews() {
        let monitor = this._updateActiveMonitor();
        let currentWorkspace = this._manager.workspace_manager.get_active_workspace();

        this._previewsCenterPosition = {
            x: this.actor.width / 2,
            y: this.actor.height / 2 + this._settings.offset
        };

        for (let windowActor of global.get_window_actors()) {
            let metaWin = windowActor.get_meta_window();
            let compositor = metaWin.get_compositor_private();
            if (compositor) {
                let texture = compositor.get_texture();
                let width, height;
                if (texture.get_size) {
                    [width, height] = texture.get_size()
                } else {
                    let preferred_size_ok;
                    [preferred_size_ok, width, height] = texture.get_preferred_size();
                }

                let previewScale = this._settings.preview_to_monitor_ratio;
                let scale = 1.0;
                let previewWidth = this.actor.width * previewScale;
                let previewHeight = this.actor.height * previewScale;
                if (width > previewWidth || height > previewHeight)
                    scale = Math.min(previewWidth / width, previewHeight / height);

                let preview = new Preview(metaWin, {
                    opacity: (!metaWin.minimized && metaWin.get_workspace() == currentWorkspace || metaWin.is_on_all_workspaces()) ? 255: 0,
                    source: texture.get_size ? texture : compositor,
                    reactive: true,
                    name: metaWin.title,
                    x: (metaWin.minimized ? -(compositor.x + compositor.width / 2) :
                        compositor.x) - monitor.x,
                    y: (metaWin.minimized ? -(compositor.y + compositor.height / 2) :
                        compositor.y) - monitor.y,
                    rotation_angle_y: 0,
                });

                preview.connect('button-press-event', this._previewButtonPressEvent.bind(this, preview));
                preview.target_width = width;
                preview.target_height = height;
                preview.scale = scale;
                preview.target_width_side = preview.target_width * 2/3;
                preview.target_height_side = preview.target_height;

                preview.target_x = findUpperLeftFromCenter(preview.target_width * preview.scale,
                    this._previewsCenterPosition.x);
                preview.target_y = findUpperLeftFromCenter(preview.target_height,
                    this._previewsCenterPosition.y);

                preview.set_pivot_point_placement(Placement.LEFT);

                if (this._windows.includes(metaWin)) {
                    this._previews[this._windows.indexOf(metaWin)] = preview;
                }
                this._allPreviews.push(preview);
                this.previewActor.add_actor(preview);

                preview.make_bottom_layer(this.previewActor);
            }
        }
    }

    _previewNext() {
        this._currentIndex = (this._currentIndex + 1) % this._windows.length;
        this._updatePreviews(false, 1);
    }

    _previewPrevious() {
        this._currentIndex = (this._windows.length + this._currentIndex - 1) % this._windows.length;
        this._updatePreviews(false, -1);
    }

    _updatePreviews(reorder_only=false, direction=0) {
        if (this._previews == null || this._previews.length == 0)
            return;

        let monitor = this._updateActiveMonitor();
        let animation_time = this._settings.animation_time * (this._settings.randomize_animation_times ? this._getRandomArbitrary(0.25, 1) : 1);

        if (this._previews.length == 1) {
            if (reorder_only) return;
            let preview = this._previews[0];
            this._manager.platform.tween(preview, {
                x: preview.target_x,
                y: preview.target_y,
                scale_x: preview.scale,
                scale_y: preview.scale,
                scale_z: preview.scale,
                time: animation_time / 2,
                transition: TRANSITION_TYPE,
                rotation_angle_y: TILT_ANGLE,
            });
            this._manager.platform.tween(preview, {
                opacity: 255,
                time: animation_time / 2,
                transition: IN_BOUNDS_TRANSITION_TYPE,
                onComplete: () => {
                    preview.set_reactive(true);
                }
            });
            return;
        }
 
        // preview windows
        for (let [i, preview] of this._previews.entries()) {
            preview.make_bottom_layer(this.previewActor);
            if (reorder_only) continue;
            animation_time = this._settings.animation_time * (this._settings.randomize_animation_times ? this._getRandomArbitrary(0.0001, 1) : 1);
            let distance = (this._currentIndex > i) ? this._previews.length - this._currentIndex + i : i - this._currentIndex;
            if (distance === this._previews.length - 1 && direction > 0) {
                preview.__looping = true;
                this._manager.platform.tween(preview, {
                    x: preview.target_x + 200,
                    y: preview.target_y + 100,
                    scale_x: preview.scale,
                    scale_y: preview.scale,
                    scale_z: preview.scale,
                    time: animation_time / 2,
                    transition: TRANSITION_TYPE,
                    rotation_angle_y: TILT_ANGLE,
                    onCompleteParams: [preview, distance, animation_time],
                    onComplete: this._onFadeForwardComplete,
                    onCompleteScope: this,
                });
                this._manager.platform.tween(preview, {
                    opacity: 0,
                    time: animation_time / 2,
                    transition: IN_BOUNDS_TRANSITION_TYPE,
                });
            } else if (distance === 0 && direction < 0) {
                preview.__looping = true;
                this._manager.platform.tween(preview, {
                    time: animation_time / 2,
                    transition: IN_BOUNDS_TRANSITION_TYPE,
                    onCompleteParams: [preview, distance, animation_time],
                    onComplete: this._onFadeBackwardsComplete,
                    onCompleteScope: this,
                    opacity: 0,
                });
            } else {
                let scale = preview.scale * Math.pow(this._settings.preview_scaling_factor, distance);//Math.max(preview.scale * ((20 - 2 * distance) / 20), 0);
                let tweenparams = {
                    x: preview.target_x - Math.sqrt(distance) * 150,
                    y: preview.target_y - Math.sqrt(distance) * 100,
                    scale_x: scale,
                    scale_y: scale,
                    scale_z: scale,
                    time: animation_time,
                    rotation_angle_y: TILT_ANGLE,
                    transition: TRANSITION_TYPE,
                    onComplete: () => { preview.set_reactive(true); },

                };
                let opacitytweenparams = {
                    opacity: 255,
                    time: animation_time,
                    transition: IN_BOUNDS_TRANSITION_TYPE,
                };
                if (preview.__looping || preview.__finalTween)
                    preview.__finalTween = [tweenparams, opacitytweenparams];
                else
                    this._manager.platform.tween(preview, tweenparams);
                    this._manager.platform.tween(preview, opacitytweenparams);
            }
        }
    }

    _onFadeBackwardsComplete(preview, distance, animation_time) {
        preview.__looping = false;
        preview.make_top_layer(this.previewActor);

        preview.x = preview.target_x + 200;
        preview.y =  preview.target_y + 100;
        preview.scale_x = preview.scale;
        preview.scale_y = preview.scale;
        preview.scale_z = preview.scale;

        this._manager.platform.tween(preview, {
            x: preview.target_x,
            y: preview.target_y,
            time: animation_time / 2,
            transition: TRANSITION_TYPE,
            onCompleteParams: [preview],
            onComplete: this._onFinishMove,
            onCompleteScope: this,
        });
        this._manager.platform.tween(preview, {
            opacity: 255,
            time: animation_time / 2,
            transition: IN_BOUNDS_TRANSITION_TYPE,
        });
    }

    _onFadeForwardComplete(preview, distance, animation_time) {
        preview.__looping = false;
        preview.make_bottom_layer(this.previewActor);

        preview.x = preview.target_x - Math.sqrt(distance) * 150;
        preview.y = preview.target_y - Math.sqrt(distance) * 100;
        let scale = Math.max(preview.scale * ((20 - 2 * distance) / 20), 0);
        preview.scale_x = scale;
        preview.scale_y = scale;
        preview.scale_z = scale;
        this._manager.platform.tween(preview, {
            x: preview.x + 50,
            y: preview.y + 50,
            time: animation_time / 2,
            transition: TRANSITION_TYPE,
            onCompleteParams: [preview],
            onComplete: this._onFinishMove,
            onCompleteScope: this,
        });
        this._manager.platform.tween(preview, {
            opacity: 255,
            time: animation_time / 2,
            transition: IN_BOUNDS_TRANSITION_TYPE,
        });
    }

    _onFinishMove(preview) {
        if (preview.__finalTween) {
            for (let tween of preview.__finalTween) {
                this._manager.platform.tween(preview, tween);
            }
            preview.__finalTween = null;
        }
    }
};
