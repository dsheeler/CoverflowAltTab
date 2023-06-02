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

const Config = imports.misc.config;

const Clutter = imports.gi.Clutter;
const Graphene = imports.gi.Graphene;
const ExtensionImports = imports.misc.extensionUtils.getCurrentExtension().imports;

const BaseSwitcher = ExtensionImports.switcher.Switcher;

const {
    Preview,
    Placement,
    Direction,
    findUpperLeftFromCenter,
} = ExtensionImports.preview;
const SIDE_ANGLE = 90;
const BLEND_OUT_ANGLE = 30;
const ALPHA = 1;

function appendParams(base, extra) {
    for (let key in extra) {
        base[key] = extra[key];
    }
}

var CoverflowSwitcher = class CoverflowSwitcher extends BaseSwitcher {
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
        this._xOffsetLeft = this.actor.width * 0.1;
        this._xOffsetRight = this.actor.width - this._xOffsetLeft;

        for (let windowActor of global.get_window_actors()) {
            let metaWin = windowActor.get_meta_window();
            let compositor = metaWin.get_compositor_private();
            if (compositor) {
                let texture = compositor.get_texture();
                let width, height;
                if (texture.get_size) {
                    [width, height] = texture.get_size();
                } else {
                    // TODO: Check this OK!
                    let preferred_size_ok;
                    [preferred_size_ok, width, height] = texture.get_preferred_size();
                }

                let scale = 1.0;
                let previewScale = this._settings.preview_to_monitor_ratio;
                let previewWidth = this.actor.width * previewScale;
                let previewHeight = this.actor.height * previewScale;
                if (width > previewWidth || height > previewHeight)
                     scale = Math.min(previewWidth / width, previewHeight / height);

                let preview = new Preview(metaWin, {
                    name: metaWin.title,
                    opacity: ALPHA * (!metaWin.minimized && metaWin.get_workspace() == currentWorkspace || metaWin.is_on_all_workspaces()) ? 255 : 0,
                    source: texture.get_size ? texture : compositor,
                    reactive: true,
                    x: metaWin.minimized ? 0 :
                        compositor.x - monitor.x,
                    y: metaWin.minimized ? 0 :
                        compositor.y - monitor.y,
                    translation_x: 0,
                    width: width,
                    height: height,
                    scale_x: metaWin.minimized ? 0 : 1,
                    scale_y: metaWin.minimized ? 0 : 1,
                    scale_z: metaWin.minimized ? 0 : 1,
                    rotation_angle_y: 0,
                });
                preview.scale = scale;
                preview.set_pivot_point_placement(Placement.CENTER);
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
                
                this.previewActor.add_actor(preview);
            }
        }
    }

    _usingCarousel() {
        return (this._parent === null && this._settings.switcher_looping_method == "Carousel");
    }

    _previewNext() {
        if (this._currentIndex == this._windows.length - 1) {
            this._currentIndex = 0;
            if (this._usingCarousel()) {
                this._updatePreviews(false)
            } else {
                this._flipStack(Direction.TO_LEFT);
            }
        } else {
            this._currentIndex = this._currentIndex + 1;
            this._updatePreviews(false);
        }
    }

    _previewPrevious() {
        if (this._currentIndex == 0) {
            this._currentIndex = this._windows.length-1;
            if (this._usingCarousel()) {
                this._updatePreviews(false)
            } else {
                this._flipStack(Direction.TO_RIGHT);
            }
        } else {
            this._currentIndex = this._currentIndex - 1;
            this._updatePreviews(false);
        }
    }

    _flipStack(direction) {
        this._looping = true;

        let xOffset, angle;
        this._updateActiveMonitor();

        if (direction === Direction.TO_LEFT) {
            xOffset = -this._xOffsetLeft;
            angle = BLEND_OUT_ANGLE;
        } else {
            xOffset = this._activeMonitor.width + this._xOffsetLeft;
            angle = -BLEND_OUT_ANGLE;
        }

        let animation_time = this._settings.animation_time * 2/3;

        for (let [i, preview] of this._previews.entries()) {
            preview._cfIsLast = (i === this._windows.length - 1);
            let params = {
                onComplete: this._onFlipIn,
                onCompleteScope: this,
                onCompleteParams: [preview, i, direction],
                transition: 'easeInOutQuint',
                opacity: 0,
                x: 0,
                y: 0,
                scale_x: 0,
                scale_y: 0,
                scale_z: 0,
                rotation_angle_y: 0,
                time: animation_time * (direction === Direction.TO_RIGHT ? (i / this._previews.length) : (1 - i / this._previews.length)),
            };

            this._manager.platform.tween(preview, params);
        }
    }

    _onFlipIn(preview, index, direction) {
        let xOffsetStart, xOffsetEnd, angleStart, angleEnd;
        this._updateActiveMonitor();

        if (direction === Direction.TO_LEFT) {
            xOffsetStart = this.actor.width + this._xOffsetLeft;
            xOffsetEnd = this._xOffsetRight;
            angleStart = -BLEND_OUT_ANGLE;
            angleEnd = -SIDE_ANGLE + this._getPerspectiveCorrectionAngle(1);
        } else {
            xOffsetStart = -this._xOffsetLeft;
            xOffsetEnd = this._xOffsetLeft;
            angleStart = BLEND_OUT_ANGLE;
            angleEnd = SIDE_ANGLE + this._getPerspectiveCorrectionAngle(0);
        }

        let animation_time = this._settings.animation_time * 2/3;

        if (direction === Direction.TO_RIGHT) {
            preview.translation_x = xOffsetStart - (this._previewsCenterPosition.x
                - preview.width / 2) + 50 * (index - this._currentIndex);
        } else {
            preview.translation_x = xOffsetStart - (this._previewsCenterPosition.x
                + preview.width / 2) + 50 * (index - this._currentIndex);
        }
        let lastExtraParams = {
            transition: 'userChoice',
            onCompleteParams: [direction],
            onComplete: this._onFlipComplete,
            onCompleteScope: this
        };
        this._manager.platform.tween(preview, {
            transition: 'easeInOutQuint',
            opacity: ALPHA * 255,
            time: animation_time,
        });
        preview.make_top_layer(this.previewActor);
        if (index == this._currentIndex) {
            preview.make_top_layer(this.previewActor);
            let extraParams = preview._cfIsLast ? lastExtraParams :  {transition: 'userChoice'};
            this._animatePreviewToMid(preview, animation_time, extraParams);
        } else {
            let extraParams = {
                rotation_angle_y: angleEnd,
                time: animation_time,
                transition: 'userChoice'
            };
            if (preview._cfIsLast)
                appendParams(extraParams, lastExtraParams);
            this._animatePreviewToSide(preview, index, xOffsetEnd, extraParams);
        }
        super._updatePreviews();
    }

    _onFlipComplete(direction) {
        this._looping = false;
        this._updatePreviews(true);
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
                pivot_point = preview.get_pivot_point_placement(Placement.LEFT);
            } else {
                pivot_point = preview.get_pivot_point_placement(Placement.RIGHT);
            }
        }

        let scale = Math.pow(this._settings.preview_scaling_factor, Math.abs(index - pivot_index));
        scale = scale * preview.scale;
        let tweenParams = {
            time: this._settings.animation_time,
            x: findUpperLeftFromCenter(preview.width, this._previewsCenterPosition.x),
            y: findUpperLeftFromCenter(preview.height, this._previewsCenterPosition.y),
            scale_x: scale,
            scale_y: scale,
            scale_z: scale,
            pivot_point: pivot_point,
        };
        if (index < pivot_index) {
            tweenParams.translation_x = xOffset - (this._previewsCenterPosition.x
                - preview.width / 2) + 50 * (index - pivot_index);
        } else {
            tweenParams.translation_x = xOffset - (this._previewsCenterPosition.x
                + preview.width / 2) + 50 * (index - pivot_index);
        }
        appendParams(tweenParams, extraParams);
        this._manager.platform.tween(preview, tweenParams);
    }

    _getPerspectiveCorrectionAngle(side) {
        if (this._settings.perspective_correction_method != "Adjust Angles") return 0;
        if (this.num_monitors == 1) {
            return 0;
        } else if (this.num_monitors == 2) {
            if (this.monitor_number == this.monitors_ltr[0].index) {
                if (side == 0) return 508/1000 * 90;
                else return 508/1000 *90;
            } else {
                if (side == 0) return -508/1000 * 90;
                else return -508/1000 * 90;
            }
        } else if (this.num_monitors == 3) {
            if (this.monitor_number == this.monitors_ltr[0].index) {
                if (side == 0) return (666)/1000 * 90;
                else return 750/1000 * 90;
            } else if (this.monitor_number == this.monitors_ltr[1].index) {
                return 0;
            } else {
                if (side == 0) return (-750)/1000 * 90;
                else return -666/1000 * 90;
            }
        }
    }

    _updatePreviews(reorder_only=false) {
        if(this._looping) {
            this._requiresUpdate = true;
            return;
        }
        this._updateActiveMonitor();
        // preview windows
        if (this._previews == null) return;
   
        let previews = [];
        let half_length = Math.floor(this._previews.length / 2);
        for (let [i, preview] of this._previews.entries()) {
            let idx = (this._usingCarousel()) ?
             (i - this._currentIndex + half_length + this._previews.length) % this._previews.length :
             i;
            previews.push([i, idx, preview]);
        }
        previews.sort((a, b) => a[1] - b[1]);
        
        let pivot_index = (this._usingCarousel()) ?
         half_length : this._currentIndex;

        let zeroIndexPreview = null;
        for (let item of previews) {
            let preview = item[2]; 
            let i = item[0];
            let idx = item[1];
            let animation_time = this._settings.animation_time * (this._settings.randomize_animation_times ? this._getRandomArbitrary(0.0001, 1) : 1);
            if (this._usingCarousel() && idx == 0) {
                zeroIndexPreview = preview;
            }
            if (i == this._currentIndex) {
                preview.make_top_layer(this.previewActor);
                if (!reorder_only) {
                    this._animatePreviewToMid(preview, this._settings.animation_time);
                }
            } else if (idx < pivot_index) {
                preview.make_top_layer(this.previewActor);
                if (!reorder_only) {
                    this._animatePreviewToSide(preview, idx, this._xOffsetLeft, {
                        rotation_angle_y: SIDE_ANGLE + this._getPerspectiveCorrectionAngle(0),
                        time: animation_time,
                        transition: 'userChoice',
                    });
                }
            } else /* i > this._currentIndex */ {
                preview.make_bottom_layer(this.previewActor);
                if (!reorder_only) {
                    this._animatePreviewToSide(preview, idx, this._xOffsetRight, {
                        rotation_angle_y: -SIDE_ANGLE + this._getPerspectiveCorrectionAngle(1),
                        time: animation_time,
                        transition: 'userChoice',
                    });
                }
            }
            this._manager.platform.tween(preview, {
                opacity: ALPHA * 255,
                time: this._settings.animation_time,
                transition: 'easeInOutQuint',
                onComplete: () => {
                    preview.set_reactive(true);
                }
            });
        }
        if (zeroIndexPreview != null) zeroIndexPreview.make_bottom_layer(this.previewActor);
        super._updatePreviews();
    }
};
