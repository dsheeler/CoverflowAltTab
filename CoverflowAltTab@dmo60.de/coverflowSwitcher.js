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

const Lang = imports.lang;
const Config = imports.misc.config;

const Clutter = imports.gi.Clutter;
const Tweener = imports.ui.tweener;

let Graphene;
if (!Clutter.Vertex)
    Graphene = imports.gi.Graphene;

let ExtensionImports;
if (Config.PACKAGE_NAME === "cinnamon")
    ExtensionImports = imports.ui.extensionSystem.extensions["CoverflowAltTab@dmo60.de"];
else
    ExtensionImports = imports.misc.extensionUtils.getCurrentExtension().imports;

const BaseSwitcher = ExtensionImports.switcher;

const Preview = ExtensionImports.preview.Preview;
const Placement = ExtensionImports.preview.Placement;
const Orientation = ExtensionImports.preview.Orientation;

let TRANSITION_TYPE;
const SIDE_ANGLE = 60;
const BLEND_OUT_ANGLE = 30;
const PREVIEW_SCALE = 0.5;

function appendParams(base, extra) {
    for (let key in extra) { base[key] = extra[key]; }
}

function Switcher() {
    this._init.apply(this, arguments);
}

Switcher.prototype = {
    __proto__: BaseSwitcher.Switcher.prototype,

    _init: function() {
        BaseSwitcher.Switcher.prototype._init.apply(this, arguments);
        if (this._settings.elastic_mode)
        	TRANSITION_TYPE = 'easeOutBack';
        else
        	TRANSITION_TYPE = 'easeOutCubic';
    },

    _createPreviews: function() {
        let monitor = this._updateActiveMonitor();
        let currentWorkspace = this._manager.workspace_manager.get_active_workspace();

        // TODO: Change these
        this._yOffset = monitor.height / 4 - this._settings.offset;
        this._xOffsetLeft = monitor.width * 0.1;
        this._xOffsetRight = monitor.width - this._xOffsetLeft;
        this._xOffsetCenter = monitor.width / 4;

        this._previews = [];
        for (let i in this._windows) {
            let metaWin = this._windows[i];
            let compositor = this._windows[i].get_compositor_private();
            if (compositor) {
                let texture = compositor.get_texture();
                let width, height
                if (texture.get_size) {
                    [width, height] = texture.get_size()
                } else {
                    let preferred_size_ok
                    [preferred_size_ok, width, height] = texture.get_preferred_size();
                }

                let scale = 1.0;
                let previewWidth = monitor.width * PREVIEW_SCALE;
                let previewHeight = monitor.height * PREVIEW_SCALE;
                if (width > previewWidth || height > previewHeight)
                    scale = Math.min(previewWidth / width, previewHeight / height);

                // TODO: Make them as set_* functions
                let preview = new Preview({
                    opacity: (!metaWin.minimized && metaWin.get_workspace() == currentWorkspace || metaWin.is_on_all_workspaces()) ? 255 : 0,
                    source: texture.get_size ? texture : compositor,
                    reactive: true,
                    // TODO: Fix these
                    x: (!(metaWin.minimized) ? 0 : compositor.x + compositor.width / 2) - monitor.x,
                    y: (!(metaWin.minimized) ? 0 : compositor.y + compositor.height / 2) - monitor.y
                });

                preview.target_width = Math.round(width * scale);
                preview.target_height = Math.round(height * scale);
                preview.target_width_side = preview.target_width * 2/3;
                preview.target_height_side = preview.target_height;

                preview.set_placement(Placement.CENTER);

                this._previews.push(preview);
                this.previewActor.add_actor(preview);
            }
        }
    },

    _previewNext: function() {
        if (this._currentIndex == this._windows.length - 1) {
            this._currentIndex = 0;
            this._flipStack(Orientation.TO_LEFT);
        } else {
            this._currentIndex = this._currentIndex + 1;
            this._updatePreviews(1);
        }
        TRANSITION_TYPE = 'easeOutCubic';
    },

    _previewPrevious: function() {
        if (this._currentIndex == 0) {
            this._currentIndex = this._windows.length - 1;
            this._flipStack(Orientation.TO_RIGHT);
        } else {
            this._currentIndex = this._currentIndex - 1;
            this._updatePreviews(-1);
        }
    },

    _flipStack: function(gravity) {
        this._looping = true;

        let xOffset, angle;
        this._updateActiveMonitor();

        if (gravity === Orientation.TO_LEFT) {
            xOffset = -this._xOffsetLeft;
            angle = BLEND_OUT_ANGLE;
        } else {
            xOffset = this._activeMonitor.width + this._xOffsetLeft;
            angle = -BLEND_OUT_ANGLE;
        }

        let animation_time = this._settings.animation_time * 2/3;

        for (let i in this._previews) {
            let preview = this._previews[i];
            preview._cfIsLast = (i == this._windows.length-1);
            this._animatePreviewToSide(preview, i, gravity, xOffset, {
                opacity: 0,
                rotation_angle_y: angle,
                time: animation_time,
                transition: TRANSITION_TYPE,
                onCompleteParams: [preview, i, gravity],
                onComplete: this._onFlipIn,
                onCompleteScope: this,
            });
        }
    },

    _onFlipIn: function(preview, index, gravity) {
        let xOffsetStart, xOffsetEnd, angleStart, angleEnd;
        this._updateActiveMonitor();

        if(gravity == Orientation.TO_LEFT) {
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

        preview.rotation_angle_y = angleStart;
        preview.x = xOffsetStart + 50 * (index - this._currentIndex);
        let lastExtraParams = {
            onCompleteParams: [],
            onComplete: this._onFlipComplete,
            onCompleteScope: this
        };
        let oppositeGravity = (gravity == Orientation.TO_LEFT) ? Orientation.TO_RIGHT : Orientation.TO_LEFT;

        if (index == this._currentIndex) {
        	if (preview.raise_top) {
                	preview.raise_top();
        	} else {
                	this.previewActor.set_child_above_sibling(preview, null);
        	}
            let extraParams = preview._cfIsLast ? lastExtraParams : null;
            this._animatePreviewToMid(preview, oppositeGravity, animation_time, extraParams);
        } else {
            if(gravity == Orientation.TO_RIGHT)
                preview.raise_top();
            else
                if (preview.lower_bottom) {
                        preview.lower_bottom();
                } else {
                        this.previewActor.set_child_below_sibling(preview, null);
                }

            let extraParams = {
                opacity: 255,
                rotation_angle_y: angleEnd,
                time: animation_time,
                transition: TRANSITION_TYPE
            };

            if (preview._cfIsLast)
                appendParams(extraParams, lastExtraParams);
            this._animatePreviewToSide(preview, index, oppositeGravity, xOffsetEnd, extraParams);
        }
    },

    _onFlipComplete: function() {
        this._looping = false;
        if(this._requiresUpdate == true) {
            this._requiresUpdate = false;
            this._updatePreviews();
        }
    },

    _animatePreviewToMid: function(preview, oldGravity, animation_time, extraParams) {
        if (preview.raise_top) {
                preview.raise_top();
        } else {
                this.previewActor.set_child_above_sibling(preview, null);
        }

        let tweenParams = {
            opacity: 255,
            x: this._xOffsetCenter,
            y: this._yOffset,
            width: preview.target_width,
            height: preview.target_height,
            rotation_angle_y: 0.0,
            time: animation_time,
            transition: TRANSITION_TYPE
        };

        if(extraParams)
            appendParams(tweenParams, extraParams);

        Tweener.addTween(preview, tweenParams);
    },

    _animatePreviewToSide: function(preview, index, gravity, xOffset, extraParams) {
        preview.set_placement(gravity);
        if (gravity === Placement.RIGHT) {
            preview.set_pivot_point(1, 0.5);
        } else if (gravity === Placement.LEFT) {
            preview.set_pivot_point(0, 0.5);
        }

        let tweenParams = {
            x: xOffset + 50 * (index - this._currentIndex),
            y: this._yOffset,
            width: Math.max(preview.target_width_side * (10 - Math.abs(index - this._currentIndex)) / 10, 0),
            height: Math.max(preview.target_height_side * (10 - Math.abs(index - this._currentIndex)) / 10, 0),
        };

        appendParams(tweenParams, extraParams);

        Tweener.addTween(preview, tweenParams);
    },

    _updatePreviews: function() {
        if (this._looping) {
            this._requiresUpdate = true;
            return;
        }

        let monitor = this._updateActiveMonitor();
        let animation_time = this._settings.animation_time;

        // preview windows
        for (let i in this._previews) {
            let preview = this._previews[i];

            if (i == this._currentIndex) {
                this._animatePreviewToMid(preview, preview.get_placement(), animation_time);
            } else if (i < this._currentIndex) {
        	if (preview.raise_top) {
                	preview.raise_top();
        	} else {
                	this.previewActor.set_child_above_sibling(preview, null);
        	}
                this._animatePreviewToSide(preview, i, Placement.LEFT, this._xOffsetLeft, {
                    opacity: 255,
                    rotation_angle_y: SIDE_ANGLE,
                    time: animation_time,
                    transition: TRANSITION_TYPE
                });
            } else if (i > this._currentIndex) {
                if (preview.lower_bottom) {
                        preview.lower_bottom();
                } else {
                        this.previewActor.set_child_below_sibling(preview, null);
                }
                this._animatePreviewToSide(preview, i, Placement.RIGHT, this._xOffsetRight, {
                    opacity: 255,
                    rotation_angle_y: -SIDE_ANGLE,
                    time: animation_time,
                    transition: TRANSITION_TYPE
                });
            }
        }
    },
};
