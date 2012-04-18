/* -*0 mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -* */

/* CoverflowAltTab::Switcher:
 *
 * The implementation of the switcher UI. Handles keyboard events.
 */

const Lang = imports.lang;

const Clutter = imports.gi.Clutter;
const St = imports.gi.St;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Cinnamon;
//const Mainloop = imports.mainloop;
const AltTab = imports.ui.altTab;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;
const Pango = imports.gi.Pango;

const WINDOWPREVIEW_SCALE = 0.5;
const POSITION_TOP = 1;
const POSITION_BOTTOM = 7;

//const INITIAL_DELAY_TIMEOUT = 1000;


/*
 * SET POSITION OF ICON AND WINDOW TITLE HERE: possible values are: POSITION_TOP
 * or POSITION_BOTTOM --------------------------------------------------------
 */
const ICON_TITLE_POSITION = POSITION_BOTTOM;
/* -------------------------------------------------------- */


/*
 * SET ICON SIZE AND SPACING BETWEEN ICON AND WINDOW TITLE HERE:
 * --------------------------------------------------------
 */
const ICON_SIZE = 64;  // default: 64
const ICON_TITLE_SPACING = 10;  // default: 10
/* -------------------------------------------------------- */


/*
 * SET VERTICAL OFFSET HERE: Positive vlaue means moving everything up, negative
 * down. Default means previews are located in the middle of the screen.
 * --------------------------------------------------------
 */
const OFFSET = 0;  // default: 0
/* -------------------------------------------------------- */




function Switcher(windows, actions, mask, currentIndex) {
	this._init(windows, actions, mask, currentIndex);
}

Switcher.prototype = {
		_init: function(windows, actions, mask, currentIndex) {
			this._windows = windows;
			this._windowTitle = null;
			this._icon = null;
			this._modifierMask = null;
			this._currentIndex = currentIndex;
			this._actions = actions;
			this._haveModal = false;
			this._tracker = Shell.WindowTracker.get_default();
			this._shellwm =  global.window_manager;
			
			this._shellwm.connect('destroy', Lang.bind(this, this._windowDestroyed));
			this._shellwm.connect('map', Lang.bind(this, this._activateSelected));
			
			let monitor = Main.layoutManager.primaryMonitor;
			this.actor = new St.Group({ visible: true, reactive: true, });

			// background
			this._background = new St.Group({
				style_class: 'coverflow-switcher',
				visible: true,
				reactive: true,
				x: 0,
				y: 0,
				opacity: 0,
				width: monitor.width,
				height: monitor.height
			});
			// background gradient
			this._background.add_actor(new St.Bin({
				style_class: 'coverflow-switcher-gradient',
				visible: true,
				reactive: true,
				x: 0,
				y: monitor.height / 2,
				width: monitor.width,
				height: monitor.height / 2
			}));
			this.actor.add_actor(this._background);

			// create previews
			let currentWorkspace = global.screen.get_active_workspace();
			this._previewLayer = new St.Group({ visible: true, reactive: true });
			this._previews = [];
			for (i in windows) {
				let metaWin = windows[i];
				let compositor = windows[i].get_compositor_private();
				if (compositor) {
					let texture = compositor.get_texture();
					let [width, height] = texture.get_size();

					let scale = 1.0;
					if (width > monitor.width * WINDOWPREVIEW_SCALE ||
							height > monitor.height * WINDOWPREVIEW_SCALE) {
						scale = Math.min(monitor.width * WINDOWPREVIEW_SCALE / width, monitor.height * WINDOWPREVIEW_SCALE / height);
					}

					let clone = new Clutter.Clone({
						opacity: (!metaWin.minimized && metaWin.get_workspace() == currentWorkspace || metaWin.is_on_all_workspaces()) ? 255 : 0,
						source: texture,
						reactive: true,
						anchor_gravity: Clutter.Gravity.CENTER,
						x: (metaWin.minimized) ? 0 : compositor.x + compositor.width / 2,
						y: (metaWin.minimized) ? 0 : compositor.y + compositor.height / 2
					});
										
					clone.target_width = Math.round(width * scale);
					clone.target_height = Math.round(height * scale);
					clone.target_width_side = clone.target_width * 2/3;
					clone.target_height_side = clone.target_height;
										
					this._previews.push(clone);
					this._previewLayer.add_actor(clone);
				};
			}

			this.actor.add_actor(this._previewLayer);
			Main.uiGroup.add_actor(this.actor);
			
			if (!Main.pushModal(this.actor)) {
				return false;
			}

			this._haveModal = true;
			this._modifierMask = AltTab.primaryModifier(mask);

			this.actor.connect('key-press-event', Lang.bind(this, this._keyPressEvent));
			this.actor.connect('key-release-event', Lang.bind(this, this._keyReleaseEvent));
			this.actor.connect('scroll-event', Lang.bind(this, this._scrollEvent));
			
			// There's a race condition; if the user released Alt before
			// we got the grab, then we won't be notified. (See
			// https://bugzilla.gnome.org/show_bug.cgi?id=596695 for
			// details) So we check now. (Have to do this after updating
			// selection.)
			let [x, y, mods] = global.get_pointer();
			if (!(mods & this._modifierMask)) {
				this._activateSelected();
			}
			
//			this._initialDelayTimeoutId = Mainloop.timeout_add(INITIAL_DELAY_TIMEOUT,
//                    Lang.bind(this, this.show));
			
			this.show();
		},

		show: function(shellwm, binding, mask, window, backwards) {
			this.actor.show();

			// hide all window actors
			let windows = global.get_window_actors();
			for (i in windows) {
				windows[i].hide();
			}

			Tweener.addTween(this._background, {
				opacity: 255,
				time: 0.25,
				transition: 'easeOutQuad',
			});
			
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
			if ((this._currentIndex == this._windows.length - 1) && (this._windows.length > 1)) {
				this._previous((this._windows.length > 2) ? true : false);
			} else {
				this._currentIndex = (this._currentIndex + 1) % this._windows.length;
				this._updateCoverflow((this._currentIndex == this._windows.length - 1) ? false : loop, "next");
			}
			this.actor.set_reactive(true);
		},
		
		// The same here like in next(),
		// but of course the other way around
		_previous: function(loop) {
			this.actor.set_reactive(false);
			if (this._currentIndex == 0) {
				this._next((this._windows.length > 2) ? true : false);
			} else {
				this._currentIndex = this._currentIndex - 1;
				this._updateCoverflow((this._currentIndex == 0) ? false : loop, "previous");
			}
			this.actor.set_reactive(true);
		},

		_updateCoverflow: function(loop, direction) {
			if (loop == undefined) {
				loop = false;
			}
			// on a loop, we want a faster and linear animation
			let animation_time = loop ? 0.05 : 0.25;
			let transition_type = loop ? 'linear' : 'easeOutQuad';
			
			let monitor = Main.layoutManager.primaryMonitor;

			// window title label
			if (this._windowTitle) {
				Tweener.addTween(this._windowTitle, {
					opacity: 0,
					time: animation_time,
					transition: transition_type,
					onComplete: Lang.bind(this._background, this._background.remove_actor, this._windowTitle),
				});
			}
			this._windowTitle = new St.Label({
				style_class: 'modal-dialog',
				text: this._windows[this._currentIndex].get_title(),
				opacity: 0,
				anchor_gravity: Clutter.Gravity.CENTER,
				x: Math.round((monitor.width + ICON_SIZE + ICON_TITLE_SPACING) / 2),
				y: Math.round(monitor.height * ICON_TITLE_POSITION / 8 - OFFSET)
			});	
			// ellipsize if title is too long
			this._windowTitle.clutter_text.ellipsize = Pango.EllipsizeMode.END;
			if (this._windowTitle.clutter_text.width > (monitor.width - 200)) {
				this._windowTitle.clutter_text.width = monitor.width - 200;
			}
			this._windowTitle.add_style_class_name('run-dialog');
			this._windowTitle.add_style_class_name('coverflow-window-title-label');
			this._background.add_actor(this._windowTitle);
			Tweener.addTween(this._windowTitle, {
				opacity: loop ? 0 : 255,
				time: animation_time,
				transition: transition_type,
			});

			// window icon
			if (this._applicationIconBox) {
				Tweener.addTween(this._applicationIconBox, {
					opacity: 0,
					time: animation_time,
					transition: transition_type,
					onComplete: Lang.bind(this._background, this._background.remove_actor, this._applicationIconBox),
				});
			}
			let app = this._tracker.get_window_app(this._windows[this._currentIndex]); 
			this._icon = null;
			if (app) {
				this._icon = app.create_icon_texture(ICON_SIZE);
			}
			if (!this._icon) {
				this._icon = new St.Icon({ 
					icon_name: 'applications-other',
					icon_type: St.IconType.FULLCOLOR,
					icon_size: ICON_SIZE 
				});
			}
			this._applicationIconBox = new St.Bin({ 
				style_class: 'window-iconbox',
				opacity: 0,
				anchor_gravity: Clutter.Gravity.CENTER,
				x: Math.round(this._windowTitle.x - (this._windowTitle.width + ICON_SIZE) / 2 - ICON_TITLE_SPACING),
				y: this._windowTitle.y
			});
			this._applicationIconBox.add_actor(this._icon);
			this._background.add_actor(this._applicationIconBox);
			Tweener.addTween(this._applicationIconBox, {
				opacity: loop ? 0 : 255,
				time: animation_time,
				transition: transition_type,
			});


			// preview windows
			for (i in this._previews) {
				let preview = this._previews[i];

				if (i == this._currentIndex) {
					let rotation_vertex_x = (preview.get_anchor_point_gravity() == Clutter.Gravity.EAST) ?
											preview.width / 2 : -preview.width / 2;
					preview.move_anchor_point_from_gravity(Clutter.Gravity.CENTER);
					preview.rotation_center_y = new Clutter.Vertex({ x: rotation_vertex_x, y: 0.0, z: 0.0 });
					preview.raise_top();
					Tweener.addTween(preview, {
						opacity: 255,
						x: (monitor.width) / 2,
						y: (monitor.height) / 2 - OFFSET,
						width: preview.target_width,
						height: preview.target_height,
						rotation_angle_y: 0.0,
						time: animation_time,
						transition: transition_type,
					});
					
				} else if (i < this._currentIndex) {
					preview.move_anchor_point_from_gravity(Clutter.Gravity.WEST);
					preview.rotation_center_y = new Clutter.Vertex({ x: 0.0, y: 0.0, z: 0.0 });
					preview.raise_top();
					Tweener.addTween(preview, {
						opacity: 255,
						x: monitor.width * 0.1 + 50 * (i - this._currentIndex),
						y: monitor.height / 2 - OFFSET,
						width: preview.target_width_side * (10 - Math.abs(i - this._currentIndex)) / 10,
						height: preview.target_height_side * (10 - Math.abs(i - this._currentIndex)) / 10,
						rotation_angle_y: 60.0,
						time: animation_time,
						transition: transition_type,
					});
					
				} else if (i > this._currentIndex) {
					preview.move_anchor_point_from_gravity(Clutter.Gravity.EAST);
					preview.rotation_center_y = new Clutter.Vertex({ x: 0.0, y: 0.0, z: 0.0 });
					preview.lower_bottom();
					Tweener.addTween(preview, {
						opacity: 255,
						x: monitor.width * 0.9 + 50 * (i - this._currentIndex),
						y: monitor.height / 2 - OFFSET,
						width: preview.target_width_side * (10 - Math.abs(i - this._currentIndex)) / 10,
						height: preview.target_height_side * (10 - Math.abs(i - this._currentIndex)) / 10,
						rotation_angle_y: -60.0,
						time: animation_time,
						transition: transition_type,
						onCompleteParams: [loop, direction, i],
						onComplete: this._onUpdateComplete,
						onCompleteScope: this,
					});
				};;
			};
		},

		
		// Called by every window on the right side on animation completion,
		// because if we do a loop, we want to know when a next() or previous()
		// shift is finished
		_onUpdateComplete: function(loop, direction, index) {
			// if we don't want a loop or if this isn't the last window,
			// do nothing
			if (!loop || index != this._windows.length-1)
				return;
			
			// otherwise do the loop by calling next()/previous() again
			if (direction == "next")
				this._next(true);
			else
				this._previous(true);
		},
		
		_keyPressEvent: function(actor, event) {
			let keysym = event.get_key_symbol();
			let event_state = Shell.get_event_state(event);

			let backwards = event_state & Clutter.ModifierType.SHIFT_MASK;
			let action = global.display.get_keybinding_action(event.get_key_code(), event_state);
						
			// Esc -> close CoverFlow
			if (keysym == Clutter.Escape) {
				this.destroy();
			}
			// Q -> Close window, update previews
			else if (keysym == Clutter.q || keysym == Clutter.Q) {
				this._actions['remove_selected'](this._windows[this._currentIndex]);
			} else if (keysym == Clutter.Right) {
				this._next();
			} else if (keysym == Clutter.Left) {
				this._previous();
			} else if (keysym == Clutter.d || keysym == Clutter.D) {
				this._showDesktop();
			} else if (action == Meta.KeyBindingAction.SWITCH_GROUP ||
					action == Meta.KeyBindingAction.SWITCH_WINDOWS ||
					action == Meta.KeyBindingAction.SWITCH_PANELS) {
				backwards ? this._previous() : this._next();
			} else if (action == Meta.KeyBindingAction.SWITCH_GROUP_BACKWARD ||
					action == Meta.KeyBindingAction.SWITCH_WINDOWS_BACKWARD) {
				this._previous();
			}

			return true;
		},

		_keyReleaseEvent: function(actor, event) {
			let [x, y, mods] = global.get_pointer();
			let state = mods & this._modifierMask;

			if (state == 0) {
				this._activateSelected();
			}

			return true;
		},
		
		_scrollEvent: function(actor, event) {
			actor.set_reactive(false);
			let dir = event.get_scroll_direction();
			(dir == Clutter.ScrollDirection.UP) ? this._next() : this._previous();
			actor.set_reactive(true);
			return true;
		},
		
		_windowDestroyed: function(shellwm, actor) {
			let window = actor.meta_window;
			
			for (i in this._windows) {
				if (window == this._windows[i]) {
					if (this._windows.length == 1) {
						this.destroy();
					} else {
						this._windows.splice(i, 1);
						this._previews[i].destroy();
						this._previews.splice(i, 1);
						this._currentIndex = (i < this._currentIndex) ? this._currentIndex - 1 : this._currentIndex;
						this._updateCoverflow();
						return;
					}
				}
			}
		},
		
		_activateSelected: function() {
			this._actions['activate_selected'](this._windows[this._currentIndex]);
			this.destroy();
		},
		
		_showDesktop: function() {
			for (i in this._windows) {
				if (!this._windows[i].minimized)
					this._windows[i].minimize();
			}
			this.destroy();
		},

		_onHideBackgroundCompleted: function() {
			Main.uiGroup.remove_actor(this.actor);

			// show all window actors
			let currentWorkspace = global.screen.get_active_workspace();
			let windows = global.get_window_actors();
			for (i in windows) {
				let metaWin = windows[i].get_meta_window();
				if (metaWin.get_workspace() == currentWorkspace || metaWin.is_on_all_workspaces()) {
					windows[i].show();
				}
			};
		},

		_onDestroy: function() {
			let monitor = Main.layoutManager.primaryMonitor;
			
			// preview windows
			let currentWorkspace = global.screen.get_active_workspace();
			for (i in this._previews) {
				let preview = this._previews[i];
				let metaWin = this._windows[i];
				let compositor = this._windows[i].get_compositor_private();
				
				let rotation_vertex_x = 0.0;
				if (preview.get_anchor_point_gravity() == Clutter.Gravity.EAST) {
					rotation_vertex_x = preview.width / 2;
				} else if (preview.get_anchor_point_gravity() == Clutter.Gravity.WEST) {
					rotation_vertex_x = -preview.width / 2;
				}
				preview.move_anchor_point_from_gravity(Clutter.Gravity.CENTER);
				preview.rotation_center_y = new Clutter.Vertex({ x: rotation_vertex_x, y: 0.0, z: 0.0 });
				
				Tweener.addTween(preview, {
					opacity: (!metaWin.minimized && metaWin.get_workspace() == currentWorkspace 
							  || metaWin.is_on_all_workspaces()) ? 255 : 0,
					x: (metaWin.minimized) ? 0 : compositor.x + compositor.width / 2,
					y: (metaWin.minimized) ? 0 : compositor.y + compositor.height / 2,
					width: (metaWin.minimized) ? 0 : compositor.width,
					height: (metaWin.minimized) ? 0 : compositor.height,
					rotation_angle_y: 0.0,
					time: 0.25,
					transition: 'easeOutQuad',
				});
			}

			// background
			Tweener.removeTweens(this._background);
			Tweener.addTween(this._background, {
				opacity: 0,
				time: 0.25,
				transition: 'easeOutQuad',
				onComplete: Lang.bind(this, this._onHideBackgroundCompleted),
			});

			if (this._haveModal) {
				Main.popModal(this.actor);
				this._haveModal = false;
			}

			this._windows = null;
			this._windowTitle = null;
			this._icon = null;
			this._applicationIconBox = null;
			this._previews = null;
			this._previewLayer = null;
//			this._initialDelayTimeoutId = null;
		},

		destroy: function() {
			this._onDestroy();
		}
};
