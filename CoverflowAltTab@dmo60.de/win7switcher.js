/* CoverflowAltTab::Win7Switcher:
 *
 * Extends CoverflowAltTab::Switcher, making it look like Windows 7.
 */

const Lang = imports.lang;

const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;

const ExtensionImports = imports.ui.extensionSystem.extensions["CoverflowAltTab@dmo60.de"];
const BaseSwitcher = ExtensionImports.switcher;

function Switcher() {
    this._init.apply(this, arguments);
}

Switcher.prototype = {
    __proto__: BaseSwitcher.Switcher.prototype,

    _init: function() {
        BaseSwitcher.Switcher.prototype._init.apply(this, arguments);
    },

    show: function() {
        let monitor = this.updateActiveMonitor();
        this.actor.set_position(monitor.x, monitor.y);
        this.actor.set_size(monitor.width, monitor.height);

        // create previews
        let currentWorkspace = global.screen.get_active_workspace();
        this._previews = [];
        for (i in this._windows) {
            let metaWin = this._windows[i];
            let compositor = this._windows[i].get_compositor_private();
            if (compositor) {
                let texture = compositor.get_texture();
                let [width, height] = texture.get_size();

                let scale = 1.0;
                let previewWidth = monitor.width * this._settings.preview_scale;
                let previewHeight = monitor.height * this._settings.preview_scale;
                if (width > previewWidth || height > previewHeight)
                    scale = Math.min(previewWidth / width, previewHeight / height);

                let clone = new Clutter.Clone({
                    opacity: (!metaWin.minimized && metaWin.get_workspace() == currentWorkspace || metaWin.is_on_all_workspaces()) ? 255 : 0,
                    source: texture,
                    reactive: true,
                    anchor_gravity: Clutter.Gravity.WEST,
                    rotation_angle_y: 12,
                    x: ((metaWin.minimized) ? 0 : compositor.x + compositor.width / 2) - monitor.x,
                    y: ((metaWin.minimized) ? 0 : compositor.y + compositor.height / 2) - monitor.y
                });

                clone.target_width = Math.round(width * scale);
                clone.target_height = Math.round(height * scale);
                clone.target_width_side = clone.target_width * 2/3;
                clone.target_height_side = clone.target_height;

                clone.target_x = Math.round(monitor.width * 0.3);
                clone.target_y = Math.round(monitor.height * 0.5) - this._settings.offset;

                this._previews.push(clone);
                this.actor.add_actor(clone);
                clone.lower_bottom();
            }
        }

        // hide windows and show Coverflow actors
        global.window_group.hide();
        this.actor.show();
        this._background.show();

        let panels = this.getPanels();
        panels.forEach(function(panel) { panel.actor.set_reactive(false); });

        if (this._settings.hide_panel) {
            panels.forEach(function(panel) {
                Tweener.addTween(panel.actor, {
                    opacity: 0,
                    time: this._settings.animation_time,
                    transistion: 'easeOutQuad'
                });
            }, this);
        }

        Tweener.addTween(this._background, {
            dim_factor: this._settings.dim_factor,
            time: this._settings.animation_time,
            transition: 'easeOutQuad'
        });

        this._initialDelayTimeoutId = 0;

        this._next();
    },

    // If next() is called on the last window, we want to
    // trigger a loop animation: calling previous() until we
    // are back on the first window and accelerate animations.
    // If there are only two windows, we don't need a loop, we
    // can do a simple previous().
    //
    // @loop: indicating whether we're currently doing a loop
    _next: function(loop) {
        this.actor.set_reactive(false);
        this._currentIndex = (this._currentIndex + 1) % this._windows.length;
        this._updateCoverflow("next")
        this.actor.set_reactive(true);
    },

    // The same here like in next(),
    // but of course the other way around
    _previous: function(loop) {
        this.actor.set_reactive(false);
        this._currentIndex = (this._windows.length + this._currentIndex - 1) % this._windows.length;
        this._updateCoverflow("previous")
        this.actor.set_reactive(true);
    },
    
    _updateCoverflowPreviews: function(direction, loop, animation_time, transition_type, monitor) {
        if(this._previews.length == 0)
            return;
        
        if(this._previews.length == 1) {
            let preview = this._previews[0];
            Tweener.addTween(preview, {
                opacity: 255,
                x: preview.target_x,
                y: preview.target_y,
                width: preview.target_width,
                height: preview.target_height,
                time: animation_time / 2,
                transition: transition_type
            });
            return;
        }
        
        // preview windows
        for (let i in this._previews) {
            let preview = this._previews[i];
            i = parseInt(i);
            let distance = (this._currentIndex > i) ? this._previews.length - this._currentIndex + i : i - this._currentIndex;

            if (distance == this._previews.length - 1 && direction == "next") {
                preview.__looping = true;
                Tweener.addTween(preview, {
                    opacity: 0,
                    x: preview.target_x + 200,
                    y: preview.target_y + 100,
                    width: preview.target_width,
                    height: preview.target_height,
                    time: animation_time / 2,
                    transition: transition_type,
                    onCompleteParams: [preview, distance, animation_time, transition_type],
                    onComplete: this._onFadeForwardComplete,
                    onCompleteScope: this,
                });
            } else if (distance == 0 && direction == "previous") {
                preview.__looping = true;
                Tweener.addTween(preview, {
                    opacity: 0,
                    time: animation_time / 2,
                    transition: transition_type,
                    onCompleteParams: [preview, distance, animation_time, transition_type],
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
                    transition: transition_type,
                };
                if(preview.__looping || preview.__finalTween)
                    preview.__finalTween = tweenparams;
                else
                    Tweener.addTween(preview, tweenparams);
            }
        }
    },

    _onFadeBackwardsComplete: function(preview, distance, animation_time, transition_type) {
        preview.__looping = false;
        preview.raise_top();
        
        preview.x = preview.target_x + 200;
        preview.y =  preview.target_y + 100;
        preview.width = preview.target_width;
        preview.height = preview.target_height;

        Tweener.addTween(preview, {
            opacity: 255,
            x: preview.target_x,
            y: preview.target_y,
            width: preview.target_width,
            height: preview.target_height,
            time: animation_time / 2,
            transition: transition_type,
            onCompleteParams: [preview],
            onComplete: this._onFinishMove,
            onCompleteScope: this,
        });
    },
                
    _onFadeForwardComplete: function(preview, distance, animation_time, transition_type) {
        preview.__looping = false;
        preview.lower_bottom();

        preview.x = preview.target_x - Math.sqrt(distance) * 150;
        preview.y = preview.target_y - Math.sqrt(distance) * 100;
        preview.width = Math.max(preview.target_width * ((20 - 2 * distance) / 20), 0);
        preview.height = Math.max(preview.target_height * ((20 - 2 * distance) / 20), 0);

        Tweener.addTween(preview, {
            opacity: 255,
            time: animation_time / 2,
            transition: transition_type,
            onCompleteParams: [preview],
            onComplete: this._onFinishMove,
            onCompleteScope: this,
        });
    },
    
    _onFinishMove: function(preview) {
        if(preview.__finalTween) {
            Tweener.addTween(preview, preview.__finalTween);
            preview.__finalTween = null;
        }
    }

};
