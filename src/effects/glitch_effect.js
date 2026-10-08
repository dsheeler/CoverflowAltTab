// This code istaken from the blur-my-shell extension

//'use strict';

import Clutter from 'gi://Clutter';
import Cogl from 'gi://Cogl';
import Shell from 'gi://Shell';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';


const SHADER_PATH = GLib.filename_from_uri(GLib.uri_resolve_relative(import.meta.url, 'glitch_effect.glsl', GLib.UriFlags.NONE))[0];

const get_shader_source = _ => {
    try {
        return Shell.get_file_contents_utf8_sync(SHADER_PATH);
    } catch (e) {
        console.log(`[Coverflow Alt-Tab] error loading shader from ${SHADER_PATH}: ${e}`);
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
export const GlitchEffect = new GObject.registerClass({
    GTypeName: "CoverflowAltTabGlitchEffect",
}, class CoverflowAltTabGlitchShader extends Clutter.ShaderEffect {
    constructor(params) {
        super(params);
        this._timeOffset = Math.random() * 1000000;

        this.set_enabled(true);
    }

    vfunc_get_static_snippet() {
        const source = get_shader_source();
        if (!source)
            throw new Error('Unable to load Coverflow shader');
        const main = /void\s+main\s*\(\s*\)\s*\{/.exec(source);
        if (!main)
            throw new Error('Coverflow shader has no main function');
        const declarations = source.slice(0, main.index);
        const body = source.slice(main.index + main[0].length, source.lastIndexOf('}'));
        const snippet = Cogl.Snippet.new(Cogl.SnippetHook.FRAGMENT, declarations, null);
        snippet.set_replace(body);
        return snippet;
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
