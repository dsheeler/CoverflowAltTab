import Shell from 'gi://Shell'
import GObject from 'gi://GObject'
import Cogl from 'gi://Cogl'

const VIGNETTE_DECLARATIONS = '                                              \
uniform float brightness;                                                  \n\
uniform float vignette_sharpness;                                          \n\
float rand(vec2 p) {                                                       \n\
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);        \n\
}                                                                          \n';

const VIGNETTE_CODE = '                                                      \
cogl_color_out.a = cogl_color_in.a;                                        \n\
cogl_color_out.rgb = vec3(0.0, 0.0, 0.0);                                  \n\
vec2 position = cogl_tex_coord_in[0].xy - 0.5;                             \n\
float t = clamp(length(1.41421 * position), 0.0, 1.0);                     \n\
float pixel_brightness = mix(1.0, 1.0 - vignette_sharpness, t);            \n\
cogl_color_out.a *= 1.0 - pixel_brightness * brightness;                   \n\
cogl_color_out.a += (rand(position) - 0.5) / 100.0;                        \n';

export const MyRadialShaderEffect = GObject.registerClass({
    Properties: {
        'brightness': GObject.ParamSpec.float(
            'brightness', 'brightness', 'brightness',
            GObject.ParamFlags.READWRITE,
            0, 1, 1),
        'sharpness': GObject.ParamSpec.float(
            'sharpness', 'sharpness', 'sharpness',
            GObject.ParamFlags.READWRITE,
            0, 1, 0),
    },
}, class MyRadialShaderEffect extends Shell.GLSLEffect {
    constructor(params) {
        super(params);
        this._brightness = undefined;
        this._sharpness = undefined;

        this._brightnessLocation = this.get_uniform_location('brightness');
        this._sharpnessLocation = this.get_uniform_location('vignette_sharpness');

        this.brightness = 1.0;
        this.sharpness = 0.0;
    }

    vfunc_build_pipeline() {
        this.add_glsl_snippet(Cogl.SnippetHook.FRAGMENT,
            VIGNETTE_DECLARATIONS, VIGNETTE_CODE, true);
    }

    get brightness() {
        return this._brightness;
    }

    set brightness(v) {
        if (this._brightness === v)
            return;
        this._brightness = v;
        this.set_uniform_float(this._brightnessLocation,
            1, [this._brightness]);
        this.notify('brightness');
    }

    get sharpness() {
        return this._sharpness;
    }

    set sharpness(v) {
        if (this._sharpness === v)
            return;
        this._sharpness = v;
        this.set_uniform_float(this._sharpnessLocation,
            1, [this._sharpness]);
        this.notify('sharpness');
    }
});
