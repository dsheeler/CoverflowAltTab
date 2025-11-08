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

import {Switcher} from  './switcher.js';
import {Preview, Placement, findUpperLeftFromCenter} from './preview.js'

let TRANSITION_TYPE;
let IN_BOUNDS_TRANSITION_TYPE;
const TILT_ANGLE = 45;
const ALPHA = 1.0;

export class TimelineSwitcher extends Switcher {
    constructor(...args) {
        super(...args);
        TRANSITION_TYPE = 'userChoice';
        IN_BOUNDS_TRANSITION_TYPE = 'easeOutQuad';
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

            let texture = windowActor.get_texture();
            let width, height;
            if (texture.get_size) {
                [width, height] = texture.get_size()
            } else {
                let _preferred_size_ok;
                [_preferred_size_ok, width, height] = texture.get_preferred_size();
            }
            let previewScale = this._settings.preview_to_monitor_ratio;
            let scale = 1.0;
            let previewWidth = this.actor.width * previewScale;
            let previewHeight = this.actor.height * previewScale;
            if (width > previewWidth || height > previewHeight)
                scale = Math.min(previewWidth / width, previewHeight / height);

            let preview = new Preview(metaWin, this, {
                opacity: ALPHA * (!metaWin.minimized && metaWin.get_workspace() === currentWorkspace || metaWin.is_on_all_workspaces()) ? 255: 0,
                source: texture.get_size ? texture : windowActor,
                reactive: true,
                name: metaWin.title,
                x: metaWin.minimized ? 0:
                    windowActor.x - monitor.x,
                y: metaWin.minimized ? -height/2:
                    windowActor.y - monitor.y,
                rotation_angle_y: 0,
                width: width,
                height: height,
                scale_x: metaWin.minimized ? 0 : 1,
                scale_y: metaWin.minimized ? 0 : 1,
                scale_z: metaWin.minimized ? 0 : 1,
            });

            preview.scale = scale;

            preview.target_x = findUpperLeftFromCenter(preview.width * preview.scale,
                this._previewsCenterPosition.x);
            preview.target_y = findUpperLeftFromCenter(preview.height,
                this._previewsCenterPosition.y);

            preview.set_pivot_point_placement(Placement.LEFT);

            if (this._windows.includes(metaWin)) {
                this._previews[this._windows.indexOf(metaWin)] = preview;
            }
            this._allPreviews.push(preview);
            this.previewActor.add_child(preview);

            preview.make_bottom_layer(this.previewActor);

        }
    }

    _previewNext() {
        this._setCurrentIndex((this._currentIndex + 1) % this._windows.length);
        this._updatePreviews(false, 1);
    }

    _previewPrevious() {
        this._setCurrentIndex((this._windows.length + this._currentIndex - 1) % this._windows.length);
        this._updatePreviews(false, -1);
    }

    _updatePreviews(reorder_only=false, direction=0) {
        if (this._previews === null || this._previews.length === 0)
            return;

        let animation_time = this._getRandomTime();

        if (this._previews.length === 1) {
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
                opacity: ALPHA * 255,
                time: animation_time / 2,
                transition: IN_BOUNDS_TRANSITION_TYPE,
                onComplete: () => {
                    preview.set_reactive(true);
                }
            });
            return;
        }

        for (let i = Math.round(this._currentIndex); i < this._currentIndex + this._previews.length; i++) {
            this._previews[i%this._previews.length].make_bottom_layer(this.previewActor);
        }
        if (reorder_only) return;
        // preview windows
        for (let [i, preview] of this._previews.entries()) {
            animation_time = this._getRandomTime();
            let distance = (this._currentIndex > i) ? this._previews.length - this._currentIndex + i : i - this._currentIndex;
            if (distance === this._previews.length - 1 && direction > 0) {
                preview.__looping = true;
                animation_time = this._settings.animation_time;
                preview.make_top_layer(this.previewActor);
                this._raiseIcons();
                let scale = preview.scale * Math.pow(this._settings.preview_scaling_factor, -1);
                this._manager.platform.tween(preview, {
                    x: preview.target_x + 150,
                    y: preview.target_y,
                    time: animation_time / 2,
                    transition: TRANSITION_TYPE,
                    rotation_angle_y: TILT_ANGLE,
                    onCompleteParams: [preview, distance, animation_time],
                    onComplete: this._onFadeForwardComplete,
                    onCompleteScope: this,
                });
                this._manager.platform.tween(preview, {
                    opacity: 0,
                    scale_x: scale,
                    scale_y: scale,
                    scale_z: scale,
                    time: animation_time / 2,
                    transition: IN_BOUNDS_TRANSITION_TYPE,
                });
            } else if (distance === 0 && direction < 0) {
                preview.__looping = true;
                animation_time = this._settings.animation_time;
                let scale = preview.scale * Math.pow(this._settings.preview_scaling_factor, this._previews.length);
                preview.make_bottom_layer(this.previewActor);
                this._manager.platform.tween(preview, {
                    time: animation_time / 2,
                    x: preview.target_x - Math.sqrt(this._previews.length) * 150,
                    y: preview.target_y,
                    transition: TRANSITION_TYPE,
                    rotation_angle_y: TILT_ANGLE,
                    onCompleteParams: [preview, distance, animation_time],
                    onComplete: this._onFadeBackwardsComplete,
                    onCompleteScope: this,
                });
                this._manager.platform.tween(preview, {
                    time: animation_time / 2,
                    transition: IN_BOUNDS_TRANSITION_TYPE,
                    scale_x: scale,
                    scale_y: scale,
                    opacity: 0,
                });
            } else {
                let scale = preview.scale * Math.pow(this._settings.preview_scaling_factor, distance);//Math.max(preview.scale * ((20 - 2 * distance) / 20), 0);
                let tweenparams = {
                    x: preview.target_x - Math.sqrt(distance) * 150,
                    y: preview.target_y,
                    scale_x: scale,
                    scale_y: scale,
                    scale_z: scale,
                    time: this.gestureInProgress ? 0 : animation_time,
                    rotation_angle_y: TILT_ANGLE,
                    transition: TRANSITION_TYPE,
                    onComplete: () => { preview.set_reactive(true); },

                };
                let opacitytweenparams = {
                    opacity: ALPHA * 255,
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
        this._raiseIcons();
        preview.x = preview.target_x + 150;
        preview.y =  preview.target_y;
        let scale_start = preview.scale * Math.pow(this._settings.preview_scaling_factor, -1);
        preview.scale_x = scale_start;
        preview.scale_y = scale_start;
        preview.scale_z = scale_start;

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
            opacity: ALPHA * 255,
            scale_x: preview.scale,
            scale_y: preview.scale,
            scale_z: preview.scale,
            time: animation_time / 2,
            transition: IN_BOUNDS_TRANSITION_TYPE,
        });
    }

    _onFadeForwardComplete(preview, distance, animation_time) {
        preview.__looping = false;
        preview.make_bottom_layer(this.previewActor);

        preview.x = preview.target_x - Math.sqrt(distance + 1) * 150;
        preview.y = preview.target_y;
        let scale_start = preview.scale * Math.pow(this._settings.preview_scaling_factor, distance + 1);
        preview.scale_x = scale_start;
        preview.scale_y = scale_start;
        preview.scale_z = scale_start;
        this._manager.platform.tween(preview, {
            x: preview.target_x - Math.sqrt(distance) * 150,
            y: preview.target_y,
            time: animation_time / 2,
            transition: TRANSITION_TYPE,
            onCompleteParams: [preview],
            onComplete: this._onFinishMove,
            onCompleteScope: this,
        });
        let scale_end = preview.scale * Math.pow(this._settings.preview_scaling_factor, distance);
        this._manager.platform.tween(preview, {
            opacity: ALPHA * 255,
            scale_x: scale_end,
            scale_y: scale_end,
            scale_z: scale_end,
            time: animation_time / 2,
            transition: IN_BOUNDS_TRANSITION_TYPE,
        });
    }

    _onFinishMove(preview) {
        this._updatePreviews(true)

        if (preview.__finalTween) {
            for (let tween of preview.__finalTween) {
                this._manager.platform.tween(preview, tween);
            }
            preview.__finalTween = null;
        }
    }
};
