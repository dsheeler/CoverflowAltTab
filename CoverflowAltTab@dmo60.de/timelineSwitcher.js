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
const PREVIEW_SCALE = 0.5;

var TimelineSwitcher = class TimelineSwitcher extends BaseSwitcher {
    constructor(...args) {
        super(...args);
        TRANSITION_TYPE = 'easeOutCubic';
    }

    _createPreviews() {
        let monitor = this._updateActiveMonitor();
        let currentWorkspace = this._manager.workspace_manager.get_active_workspace();

        this._previewsCenterPosition = {
            x: monitor.width / 2,
            y: monitor.height / 2 + this._settings.offset
        };

        for (let metaWin of this._windows) {
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

                    rotation_angle_y: 12,
                });

                preview.target_width = Math.round(width * scale);
                preview.target_height = Math.round(height * scale);
                preview.target_width_side = preview.target_width * 2/3;
                preview.target_height_side = preview.target_height;

                preview.target_x = findUpperLeftFromCenter(preview.target_width,
                    this._previewsCenterPosition.x);
                preview.target_y = findUpperLeftFromCenter(preview.target_height,
                    this._previewsCenterPosition.y);

                preview.set_pivot_point_placement(Placement.LEFT);

                this._previews.push(preview);
                this.previewActor.add_actor(preview);

                preview.make_bottom_layer(this.previewActor);
            }
        }
    }

    _previewNext() {
        this._currentIndex = (this._currentIndex + 1) % this._windows.length;
        this._updatePreviews(1);
    }

    _previewPrevious() {
        this._currentIndex = (this._windows.length + this._currentIndex - 1) % this._windows.length;
        this._updatePreviews(-1);
    }

    _updatePreviews(direction) {
        if (this._previews.length == 0)
            return;

        let monitor = this._updateActiveMonitor();
        let animation_time = this._settings.animation_time;

        if (this._previews.length == 1) {
            let preview = this._previews[0];
            this._manager.platform.tween(preview, {
                opacity: 255,
                x: preview.target_x,
                y: preview.target_y,
                width: preview.target_width,
                height: preview.target_height,
                time: animation_time / 2,
                transition: TRANSITION_TYPE
            });
            return;
        }

        // preview windows
        for (let [i, preview] of this._previews.entries()) {
            let distance = (this._currentIndex > i) ? this._previews.length - this._currentIndex + i : i - this._currentIndex;

            if (distance === this._previews.length - 1 && direction > 0) {
                preview.__looping = true;
                this._manager.platform.tween(preview, {
                    opacity: 0,
                    x: preview.target_x + 200,
                    y: preview.target_y + 100,
                    width: preview.target_width,
                    height: preview.target_height,
                    time: animation_time / 2,
                    transition: TRANSITION_TYPE,
                    onCompleteParams: [preview, distance, animation_time],
                    onComplete: this._onFadeForwardComplete,
                    onCompleteScope: this,
                });
            } else if (distance === 0 && direction < 0) {
                preview.__looping = true;
                this._manager.platform.tween(preview, {
                    opacity: 0,
                    time: animation_time / 2,
                    transition: TRANSITION_TYPE,
                    onCompleteParams: [preview, distance, animation_time],
                    onComplete: this._onFadeBackwardsComplete,
                    onCompleteScope: this,
                });
            } else {
                let tweenparams = {
                    opacity: 255,
                    x: preview.target_x - Math.sqrt(distance) * 150,
                    y: preview.target_y - Math.sqrt(distance) * 100,
                    width: Math.max(preview.target_width * ((20 - 2 * distance) / 20), 0),
                    height: Math.max(preview.target_height * ((20 - 2 * distance) / 20), 0),
                    time: animation_time,
                    transition: TRANSITION_TYPE,
                };
                if (preview.__looping || preview.__finalTween)
                    preview.__finalTween = tweenparams;
                else
                    this._manager.platform.tween(preview, tweenparams);
            }
        }
    }

    _onFadeBackwardsComplete(preview, distance, animation_time) {
        preview.__looping = false;
        preview.make_top_layer(this.previewActor);

        preview.x = preview.target_x + 200;
        preview.y =  preview.target_y + 100;
        preview.width = preview.target_width;
        preview.height = preview.target_height;

        this._manager.platform.tween(preview, {
            opacity: 255,
            x: preview.target_x,
            y: preview.target_y,
            width: preview.target_width,
            height: preview.target_height,
            time: animation_time / 2,
            transition: TRANSITION_TYPE,
            onCompleteParams: [preview],
            onComplete: this._onFinishMove,
            onCompleteScope: this,
        });
    }

    _onFadeForwardComplete(preview, distance, animation_time) {
        preview.__looping = false;
        preview.make_bottom_layer(this.previewActor);

        preview.x = preview.target_x - Math.sqrt(distance) * 150;
        preview.y = preview.target_y - Math.sqrt(distance) * 100;
        preview.width = Math.max(preview.target_width * ((20 - 2 * distance) / 20), 0);
        preview.height = Math.max(preview.target_height * ((20 - 2 * distance) / 20), 0);

        this._manager.platform.tween(preview, {
            opacity: 255,
            time: animation_time / 2,
            transition: TRANSITION_TYPE,
            onCompleteParams: [preview],
            onComplete: this._onFinishMove,
            onCompleteScope: this,
        });
    }

    _onFinishMove(preview) {
        if (preview.__finalTween) {
            this._manager.platform.tween(preview, preview.__finalTween);
            preview.__finalTween = null;
        }
    }
};
