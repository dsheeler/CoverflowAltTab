uniform sampler2D tex;
uniform float red;
uniform float green;
uniform float blue;
uniform float blend;

void main() {
    vec4 s = texture2D(tex, cogl_tex_coord_in[0].st);
    vec4 dst = vec4(red, green, blue, blend);
    cogl_color_out = vec4(mix(s.rgb, dst.rgb * s.a, blend), s.a);
}