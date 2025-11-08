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

/* CoverflowAltTab::CoverflowSwitcher:
 *
 * Extends CoverflowAltTab::Switcher, switching tabs using a cover flow.
 */


import Graphene from 'gi://Graphene';

import {Switcher} from './switcher.js';
const BaseSwitcher = Switcher;
import {Preview, Placement, Direction, findUpperLeftFromCenter} from './preview.js'

const ALPHA = 1;

function appendParams(base, extra) {
    for (let key in extra) {
        base[key] = extra[key];
    }
}

export class CoverflowSwitcher extends BaseSwitcher {
    constructor(...args) {
        super(...args);
    }

    _createPreviews() {
        // TODO: Shouldn't monitor be set once per coverflow state?
        let monitor = this._updateActiveMonitor();
        let currentWorkspace = this._manager.workspace_manager.get_active_workspace();

        this._previewsCenterPosition = {
            x: this.actor.width / 2,
            y: this.actor.height / 2 + this._settings.offset
        };
        let ratio = this._settings.preview_to_monitor_ratio;
        this._xOffsetLeft = this.actor.width * (0.5 * (1 - ratio) - 0.1 * ratio);
        this._xOffsetRight = this.actor.width - this._xOffsetLeft;

        for (let windowActor of global.get_window_actors()) {
            let metaWin = windowActor.get_meta_window();
            let texture = windowActor.get_texture();
            let width, height, _;
            if (texture.get_size) {
                [width, height] = texture.get_size();
            } else {
                // TODO: Check this OK!
                [_, width, height] = texture.get_preferred_size();
            }

            let scale = 1.0;
            let previewScale = this._settings.preview_to_monitor_ratio;
            let previewWidth = this.actor.width * previewScale;
            let previewHeight = this.actor.height * previewScale;
            if (width > previewWidth || height > previewHeight)
                    scale = Math.min(previewWidth / width, previewHeight / height);

            const sourceActor = texture.get_size ? texture : windowActor;

            let preview = new Preview(metaWin, this, {
                name: metaWin.title,
                opacity: ALPHA * (!metaWin.minimized && metaWin.get_workspace() === currentWorkspace || metaWin.is_on_all_workspaces()) ? 255 : 0,
                source: sourceActor,
                reactive: true,
                x: metaWin.minimized ? 0 :
                    windowActor.x - monitor.x,
                y: metaWin.minimized ? 0 :
                    windowActor.y - monitor.y,
                translation_x: 0,
                width: width,
                height: height,
                scale_x: metaWin.minimized ? 0 : 1,
                scale_y: metaWin.minimized ? 0 : 1,
                scale_z: metaWin.minimized ? 0 : 1,
                rotation_angle_y: 0,
            });

            preview.scale = scale;
            preview.set_pivot_point_placement(Placement.TOP_LEFT);
            preview.center_position = {
                x: findUpperLeftFromCenter(width,
                    this._previewsCenterPosition.x),
                y: findUpperLeftFromCenter(height,
                    this._previewsCenterPosition.y)
            };

            if (this._windows.includes(metaWin)) {
                this._previews[this._windows.indexOf(metaWin)] = preview;
            }
            this._allPreviews.push(preview);

            this.previewActor.add_child(preview);
        }
    }

    _usingCarousel() {
        return (this._settings.switcher_looping_method === "Carousel");
    }

    _previewNext() {
        if (this._currentIndex === this._windows.length - 1) {
            this._setCurrentIndex(0);
            if (this._usingCarousel()) {
                this._updatePreviews(false)
            } else {
                this._flipStack(Direction.TO_LEFT);
            }
        } else {
            this._setCurrentIndex(this._currentIndex + 1);
            this._updatePreviews(false);
        }
    }

    _previewPrevious() {
        if (this._currentIndex === 0) {
            this._setCurrentIndex(this._windows.length-1);
            if (this._usingCarousel()) {
                this._updatePreviews(false)
            } else {
                this._flipStack(Direction.TO_RIGHT);
            }
        } else {
            this._setCurrentIndex(this._currentIndex - 1);
            this._updatePreviews(false);
        }
    }

    _flipStack(direction) {
        for (let [i, preview] of this._previews.entries()) {
            this._onFlipIn(preview, i, direction);
        }
    }

    _onFlipIn(preview, index, direction) {
        let zeroIndexPreview = null;
        this._updateActiveMonitor();

        let animation_time = this._settings.animation_time * 2 * (direction === Direction.TO_RIGHT ? ((index + 1) / this._previews.length) : (1 - index / this._previews.length));
        this._updatePreview(index, zeroIndexPreview, preview, index, false, animation_time);
        this._manager.platform.tween(preview, {
            transition: 'easeInOutQuint',
            opacity: ALPHA * 255,
            time: animation_time,
        });
        this._raiseIcons();
        return;
    }

    _onFlipComplete(_direction) {
        this._looping = false;
        this._updatePreviews(false);
    }

    // TODO: Remove unused direction variable
    _animatePreviewToMid(preview, animation_time, extraParams = []) {
        let pivot_point = preview.get_pivot_point_placement(Placement.CENTER);
        let tweenParams = {
            x: findUpperLeftFromCenter(preview.width, this._previewsCenterPosition.x),
            y: findUpperLeftFromCenter(preview.height, this._previewsCenterPosition.y),
            scale_x: preview.scale,
            scale_y: preview.scale,
            scale_z: preview.scale,
            pivot_point: pivot_point,
            translation_x: 0,
            rotation_angle_y: 0,
            time: animation_time,
            transition: 'userChoice',
        };
        appendParams(tweenParams, extraParams);
        this._manager.platform.tween(preview, tweenParams);
    }

    _animatePreviewToSide(preview, index, xOffset, extraParams, toChangePivotPoint = true) {
        let [x, y] = preview.get_pivot_point();
        let pivot_point = new Graphene.Point({ x: x, y: y });
        let half_length = Math.floor(this._previews.length / 2);
        let pivot_index = (this._usingCarousel()) ?
                           half_length : this._currentIndex;
        if (toChangePivotPoint) {
            if (index < pivot_index) {
                let progress = pivot_index - index < 1 ? pivot_index - index : 1;
                pivot_point = new Graphene.Point({ x: 0.5 - 0.5 * progress, y: 0.5});
            } else {
                let progress = index - pivot_index < 1 ? index - pivot_index : 1;
                pivot_point = new Graphene.Point({ x: 0.5 + 0.5 * progress, y: 0.5});
            }
        }
        let scale = Math.pow(this._settings.preview_scaling_factor, Math.abs(index - pivot_index));
        scale = scale * preview.scale;
        let tweenParams = {
            x: findUpperLeftFromCenter(preview.width, this._previewsCenterPosition.x),
            y: findUpperLeftFromCenter(preview.height, this._previewsCenterPosition.y),
            scale_x: scale,
            scale_y: scale,
            scale_z: scale,
            pivot_point: pivot_point,
        };
        const window_offset_width = this._settings.coverflow_window_offset_width;
        if (index < pivot_index) {
            tweenParams.translation_x =  (xOffset - (this._previewsCenterPosition.x
                - preview.width / 2) +  window_offset_width * (index - pivot_index));
        } else {
            tweenParams.translation_x = (xOffset - (this._previewsCenterPosition.x
                + preview.width / 2) + window_offset_width  * (index - pivot_index));
        }
        appendParams(tweenParams, extraParams);
        this._manager.platform.tween(preview, tweenParams);
    }

    _getPerspectiveCorrectionAngle(side) {
        if (this._settings.perspective_correction_method !== "Adjust Angles") return 0;
        if (this.num_monitors === 1) {
            return 0;
        } else if (this.num_monitors === 2) {
            if (this.monitor_number === this.monitors_ltr[0].index) {
                if (side === 0) return 508/1000 * 90;
                else return 508/1000 *90;
            } else {
                if (side === 0) return -508/1000 * 90;
                else return -508/1000 * 90;
            }
        } else if (this.num_monitors === 3) {
            if (this.monitor_number === this.monitors_ltr[0].index) {
                if (side === 0) return (666)/1000 * 90;
                else return 750/1000 * 90;
            } else if (this.monitor_number === this.monitors_ltr[1].index) {
                return 0;
            } else {
                if (side === 0) return (-750)/1000 * 90;
                else return -666/1000 * 90;
            }
        }
        return 0;
    }

    _updatePreviews(reorder_only=false) {
        if (this._previews === null) return;
        let half_length = Math.floor(this._previews.length / 2);
        let previews = [];
        for (let [i, preview] of this._previews.entries()) {
            let idx = (this._usingCarousel()) ?
             (i - this._currentIndex + half_length + this._previews.length) % this._previews.length :
             i;
            previews.push([i, idx, preview]);
        }
        previews.sort((a, b) => a[1] - b[1]);

        let zeroIndexPreview = null;
        for (let item of previews) {
            let preview = item[2];
            let i = item[0];
            let idx = item[1];
            let animation_time = this._getRandomTime();
            zeroIndexPreview = this._updatePreview(idx, zeroIndexPreview, preview, i, reorder_only, animation_time);
            this._manager.platform.tween(preview, {
                opacity: ALPHA * 255,
                time: this._settings.animation_time,
                transition: 'easeOutQuad',
                onComplete: () => {
                    preview.set_reactive(true);
                }
            });
        }
        if (zeroIndexPreview !== null) zeroIndexPreview.make_bottom_layer(this.previewActor);
        this._raiseIcons();
    }

    _updatePreview(idx, zeroIndexPreview, preview, i, reorder_only, animation_time) {
        const  side_angle = this._settings.coverflow_window_angle;

        let half_length = Math.floor(this._previews.length / 2);
        let pivot_index = (this._usingCarousel()) ?
         half_length : this._currentIndex;
        if (this._usingCarousel() && idx === 0) {
            zeroIndexPreview = preview;
        }
        if (i === this._currentIndex) {
            preview.make_top_layer(this.previewActor);
            if (!reorder_only) {
                this._animatePreviewToMid(preview, this._settings.animation_time);
            }
        } else if (idx < pivot_index) {
            preview.make_top_layer(this.previewActor);
            if (!reorder_only) {
                let final_angle = side_angle + this._getPerspectiveCorrectionAngle(0);
                let progress = pivot_index - idx < 1 ? pivot_index - idx : 1;
                let center_offset = (this._xOffsetLeft + this._xOffsetRight) / 2;
                this._animatePreviewToSide(preview, idx, center_offset - preview.width / 2 - progress * (center_offset - preview.width / 2 - this._xOffsetLeft), {
                    rotation_angle_y: progress * final_angle,
                    time: this.gestureInProgress ? 0 : animation_time,
                    transition: 'userChoice',
                });
            }
        } else /* i > this._currentIndex */ {
            preview.make_bottom_layer(this.previewActor);
            if (!reorder_only) {
                let final_angle = -side_angle + this._getPerspectiveCorrectionAngle(1);
                let progress = idx - pivot_index < 1 ? idx - pivot_index : 1;
                let center_offset = (this._xOffsetLeft + this._xOffsetRight) / 2;
                this._animatePreviewToSide(preview, idx, center_offset + preview.width / 2 + progress * (this._xOffsetRight - center_offset - preview.width / 2), {
                    rotation_angle_y: progress * final_angle,
                    time: this.gestureInProgress ? 0 : animation_time,
                    transition: 'userChoice',
                });
            }
        }
        return zeroIndexPreview;
    }
};
