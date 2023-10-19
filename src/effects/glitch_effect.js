// This code istaken from the blur-my-shell extension

//'use strict';

import Clutter from 'gi://Clutter';
import Shell from 'gi://Shell';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js'

const get_shader_source = _ => {
    let ExtensionObj = Extension.lookupByUUID('CoverflowAltTab@palatis.blogspot.com');
    let SHADER_PATH = GLib.build_filenamev([ExtensionObj.path, 'effects', 'glitch_effect.glsl']);
    try {
        return Shell.get_file_contents_utf8_sync(SHADER_PATH);
    } catch (e) {
        log(`[Coverflow Alt-Tab] error loading shader from ${SHADER_PATH}: ${e}`);
        return null;
    }
};

/// New Clutter Shader Effect that simply mixes a color in, the class applies
/// the GLSL shader programmed into vfunc_get_static_shader_source and applies
/// it to an Actor.
///
/// Clutter Shader Source Code:
/// https://github.com/GNOME/clutter/blob/master/clutter/clutter-shader-effect.c
///
/// GJS Doc:
/// https://gjs-docs.gnome.org/clutter10~10_api/clutter.shadereffect
export var GlitchEffect = new GObject.registerClass({
    GTypeName: "CoverflowAltTabGlitchEffect",
}, class CoverflowAltTabGlitchShader extends Clutter.ShaderEffect {
    _init(params) {
        super._init(params);
        this._timeOffset = Math.random() * 1000000;
        // set shader source
        this._source = get_shader_source();

        if (this._source)
            this.set_shader_source(this._source);

        this.set_enabled(true);
    }

    vfunc_paint_target(paint_node = null, paint_context = null) {
        const time = this._timeOffset + GLib.get_monotonic_time() / GLib.USEC_PER_SEC;
        this.set_uniform_value("time", time);
        this.set_uniform_value("tex", 0);

        if (paint_node && paint_context)
            super.vfunc_paint_target(paint_node, paint_context);
        else if (paint_node)
            super.vfunc_paint_target(paint_node);
        else
            super.vfunc_paint_target();

        this.queue_repaint();
    }
});