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
const ExtensionImports = imports.misc.extensionUtils.getCurrentExtension().imports;

const BaseSwitcher = ExtensionImports.switcher.Switcher;

const {
    Preview,
    Placement,
    Direction,
    findUpperLeftFromCenter,
} = ExtensionImports.preview;

const SIDE_ANGLE = 60;
const BLEND_OUT_ANGLE = 30;
const PREVIEW_SCALE = 0.5;

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
            x: monitor.width / 2,
            y: monitor.height / 2 + this._settings.offset
        };
        this._xOffsetLeft = monitor.width * 0.1;
        this._xOffsetRight = monitor.width - this._xOffsetLeft;

        for (let metaWin of this._windows) {
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
                let previewWidth = monitor.width * PREVIEW_SCALE;
                let previewHeight = monitor.height * PREVIEW_SCALE;
                if (width > previewWidth || height > previewHeight)
                    scale = Math.min(previewWidth / width, previewHeight / height);

                let preview = new Preview({
                    opacity: (!metaWin.minimized && metaWin.get_workspace() == currentWorkspace || metaWin.is_on_all_workspaces()) ? 255 : 0,
                    source: texture.get_size ? texture : compositor,
                    reactive: true,
                    x: (metaWin.minimized ? -(compositor.x + compositor.width / 2) :
                        compositor.x) - monitor.x,
                    y: (metaWin.minimized ? -(compositor.y + compositor.height / 2) :
                        compositor.y) - monitor.y,

                    translation_x: 0,
                    scale_x: 1,
                    scale_y: 1,
                    rotation_angle_y: 0,
                });

                preview.target_width = Math.round(width * scale);
                preview.target_height = Math.round(height * scale);

                preview.set_pivot_point_placement(Placement.CENTER);

                preview.center_position = {
                    x: findUpperLeftFromCenter(preview.target_width,
                        this._previewsCenterPosition.x),
                    y: findUpperLeftFromCenter(preview.target_height,
                        this._previewsCenterPosition.y)
                };

                this._previews.push(preview);
                this.previewActor.add_actor(preview);
            }
        }
    }

    _previewNext() {
        if (this._currentIndex == this._windows.length - 1) {
            this._currentIndex = 0;
            this._flipStack(Direction.TO_LEFT);
        } else {
            this._currentIndex = this._currentIndex + 1;
            this._updatePreviews();
        }
    }

    _previewPrevious() {
        if (this._currentIndex == 0) {
            this._currentIndex = this._windows.length-1;
            this._flipStack(Direction.TO_RIGHT);
        } else {
            this._currentIndex = this._currentIndex - 1;
            this._updatePreviews();
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
            this._animatePreviewToSide(preview, i, xOffset, {
                opacity: 0,
                rotation_angle_y: angle,
                time: animation_time,
                transition: 'easeOutCubic',
                onComplete: this._onFlipIn,
                onCompleteScope: this,
                onCompleteParams: [preview, i, direction],
            }, false);
        }
    }

    _onFlipIn(preview, index, direction) {
        let xOffsetStart, xOffsetEnd, angleStart, angleEnd;
        this._updateActiveMonitor();

        if (direction === Direction.TO_LEFT) {
            xOffsetStart = this._activeMonitor.width + this._xOffsetLeft;
            xOffsetEnd = this._xOffsetRight;
            angleStart = -BLEND_OUT_ANGLE;
            angleEnd = -SIDE_ANGLE;
        } else {
            xOffsetStart = -this._xOffsetLeft;
            xOffsetEnd = this._xOffsetLeft;
            angleStart = BLEND_OUT_ANGLE;
            angleEnd = SIDE_ANGLE;
        }

        let animation_time = this._settings.animation_time * 2/3;

        if (direction === Direction.TO_RIGHT) {
            preview.translation_x = xOffsetStart - (this._previewsCenterPosition.x
                - preview.target_width / 2) + 50 * (index - this._currentIndex);
        } else {
            preview.translation_x = xOffsetStart - (this._previewsCenterPosition.x
                + preview.target_width / 2) + 50 * (index - this._currentIndex);
        }
        preview.rotation_angle_y = angleStart;
        let lastExtraParams = {
            transition: 'easeOutCubic',
            onCompleteParams: [direction],
            onComplete: this._onFlipComplete,
            onCompleteScope: this
        };

        if (index == this._currentIndex) {
        	preview.make_top_layer(this.previewActor);
            let extraParams = preview._cfIsLast ? lastExtraParams :  {transition: 'easeOutCubic'};
            this._animatePreviewToMid(preview, animation_time, extraParams);
        } else {
            if (direction === Direction.TO_RIGHT) {
                preview.make_top_layer(this.previewActor);
                } else {
                preview.make_bottom_layer(this.previewActor);
                }

            let extraParams = {
                opacity: 255,
                rotation_angle_y: angleEnd,
                time: animation_time,
                transition: 'easeOutCubic'
            };

            if (preview._cfIsLast)
                appendParams(extraParams, lastExtraParams);
            this._animatePreviewToSide(preview, index, xOffsetEnd, extraParams);
        }
    }

    _onFlipComplete(direction) {
        this._looping = false;
        if (this._requiresUpdate === true) {
            this._requiresUpdate = false;
            this._updatePreviews();
        }
    }
    // TODO: Remove unused direction variable
    _animatePreviewToMid(preview, animation_time, extraParams = []) {
        preview.make_top_layer(this.previewActor);

        let tweenParams = {
            opacity: 255,
            x: preview.center_position.x,
            y: preview.center_position.y,
            width: preview.target_width,
            height: preview.target_height,
            translation_x: 0,
            scale_x: 1,
            scale_y: 1,
            rotation_angle_y: 0.0,
            time: animation_time,
            transition: 'userChoice',
        };

        appendParams(tweenParams, extraParams);

        this._manager.platform.tween(preview, tweenParams);
    }

    _animatePreviewToSide(preview, index, xOffset, extraParams, toChangePivotPoint = true) {
        if (toChangePivotPoint) {
            if (index < this._currentIndex) {
                preview.set_pivot_point_placement(Placement.LEFT);
            } else if (index > this._currentIndex) {
                preview.set_pivot_point_placement(Placement.RIGHT);
            }
        }

        let tweenParams = {
            x: preview.center_position.x,
            y: preview.center_position.y,
            width: preview.target_width,
            height: preview.target_height,

            scale_x: 0.4 - 0.07 * Math.abs(index - this._currentIndex),
            scale_y: 1 - 0.07 * Math.abs(index - this._currentIndex)
        };

        if (index < this._currentIndex) {
            tweenParams.translation_x = xOffset - (this._previewsCenterPosition.x
                - preview.target_width / 2) + 50 * (index - this._currentIndex);
        } else if (index > this._currentIndex) {
            tweenParams.translation_x = xOffset - (this._previewsCenterPosition.x
                + preview.target_width / 2) + 50 * (index - this._currentIndex);
        }
        appendParams(tweenParams, extraParams);

        this._manager.platform.tween(preview, tweenParams);
    }

    _updatePreviews() {
        if(this._looping) {
            this._requiresUpdate = true;
            return;
        }

        this._updateActiveMonitor();
        let animation_time = this._settings.animation_time;

        // preview windows
        for (let [i, preview] of this._previews.entries()) {
            if (i === this._currentIndex) {
                this._animatePreviewToMid(preview, animation_time);
            } else if (i < this._currentIndex) {
                preview.make_top_layer(this.previewActor);
                this._animatePreviewToSide(preview, i, this._xOffsetLeft, {
                    opacity: 255,
                    rotation_angle_y: SIDE_ANGLE,
                    time: animation_time,
                    transition: 'userChoice'
                });
            } else /* i > this._currentIndex */ {
                preview.make_bottom_layer(this.previewActor);
                this._animatePreviewToSide(preview, i, this._xOffsetRight, {
                    opacity: 255,
                    rotation_angle_y: -SIDE_ANGLE,
                    time: animation_time,
                    transition: 'userChoice'
                });
            }
        }
    }
};
