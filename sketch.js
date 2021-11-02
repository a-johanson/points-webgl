import * as THREE from "./three.module.js";
import SimplexNoise from "./simplex-noise.js";

const simplex = new SimplexNoise("seeeeed");

function rand(a, b) {
    return (b - a) * Math.random() + a;
}

function noise(x, y, z) {
    const falloff = 0.5;
    const octaves = 4;
    let r = 0;
    let amp = 1.0;
    for (let i = 0; i < octaves; i++) {
        amp *= falloff;
        r += amp * (0.5 * simplex.noise3D(x / amp, y / amp, z / amp) + 0.5);
    }
    return r;
}

function pointOnSphere(y, phi) {
    const r = Math.sqrt(1.0 - y*y);
    const x = r * Math.cos(phi);
    const z = r * Math.sin(phi);
    let noiseC     = 100.0;
    let noiseScale = 3.83 * 0.5;
    let noiseMag   = 0.1;
    const m = noiseMag * (2.0 * noise(noiseScale * (x + noiseC), noiseScale * (y + noiseC), noiseScale * (z + noiseC)) - 1.0) + 1.0;
    return [m * x, m * y, m * z];
}

function main() {
    const width = 800;
    const height = 800;
    const canvas = document.querySelector("#c");
    const renderer = new THREE.WebGLRenderer({canvas: canvas, alpha: false, antialias: false});
    renderer.setSize(width, height);
    renderer.setClearColor(0xFAF7F2);

    const fgColors = [
        [255,119,119],
        [162,65,107],
        [133,39,71],
        [201,193,159],
        [137,147,124],
        [148,185,175],
        [84,150,166],
        [250,209,5]
    ];

    const fov = 25;
    const near = 0.01;
    const far = 100;
    const camera = new THREE.PerspectiveCamera(fov, width / height, near, far);
    camera.position.y = -1.0;
    camera.position.z = 0.75;
    camera.lookAt(0, 0, 0);

    const scene = new THREE.Scene();

    const pointCount = 90000;
    const vertices = new Float32Array(pointCount * 4 * 3);
    const colors = new Float32Array(pointCount * 4 * 3);
    const faces = new Uint32Array(pointCount * 2 * 3);
    for (let i = 0; i < pointCount; i++) {
        const s = 0.01 * pointCount;
        const f = (i + s) / (pointCount + s);
        const l = rand(0.0, Math.pow(f, 1.75));
        const y = 1.0 - 2.0 * Math.pow(l, 1.0);
        const phi = THREE.MathUtils.randFloatSpread(2.0 * Math.PI);
        const p = pointOnSphere(y, phi);

        const v_base = i * 4;
        const v_offset = v_base * 3;
        vertices[v_offset + 0] = p[0];
        vertices[v_offset + 1] = p[1];
        vertices[v_offset + 2] = p[2];
        vertices[v_offset + 3] = p[0];
        vertices[v_offset + 4] = p[1];
        vertices[v_offset + 5] = p[2];
        vertices[v_offset + 6] = p[0];
        vertices[v_offset + 7] = p[1];
        vertices[v_offset + 8] = p[2];
        vertices[v_offset + 9] = p[0];
        vertices[v_offset + 10] = p[1];
        vertices[v_offset + 11] = p[2];

        const f_offset = i * 2 * 3;
        faces[f_offset + 0] = v_base + 0;
        faces[f_offset + 1] = v_base + 1;
        faces[f_offset + 2] = v_base + 2;
        faces[f_offset + 3] = v_base + 0;
        faces[f_offset + 4] = v_base + 2;
        faces[f_offset + 5] = v_base + 3;

        const color = fgColors[Math.floor(Math.random() * fgColors.length)];
        colors[v_offset + 0] =  color[0] / 255.0;
        colors[v_offset + 1] =  color[1] / 255.0;
        colors[v_offset + 2] =  color[2] / 255.0;
        colors[v_offset + 3] =  color[0] / 255.0;
        colors[v_offset + 4] =  color[1] / 255.0;
        colors[v_offset + 5] =  color[2] / 255.0;
        colors[v_offset + 6] =  color[0] / 255.0;
        colors[v_offset + 7] =  color[1] / 255.0;
        colors[v_offset + 8] =  color[2] / 255.0;
        colors[v_offset + 9] =  color[0] / 255.0;
        colors[v_offset + 10] = color[1] / 255.0;
        colors[v_offset + 11] = color[2] / 255.0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(new THREE.BufferAttribute(faces, 1));
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.ShaderMaterial({
        uniforms: {
            pointRadius: { value: 0.003 },
            borderColor: {value: new THREE.Vector3(26/255, 24/255, 21/255) }
        },
        vertexShader: `
        uniform float pointRadius;
        attribute vec3 color;
        varying vec2 v_uv;
        varying vec3 v_color;
        void main() {
            int v_i = gl_VertexID % 4;
            v_uv = vec2((v_i == 0 || v_i == 3) ? -1.0 : 1.0, (v_i <= 1) ? -1.0 : 1.0);
            vec4 mv_p = modelViewMatrix * vec4(position, 1.0) + vec4(pointRadius * v_uv, 0.0, 0.0);
            gl_Position = projectionMatrix * mv_p;
            v_color = color;
        }`,
        fragmentShader: `
        uniform vec3 borderColor;
        varying vec2 v_uv;
        varying vec3 v_color;
        void main() {
            float sd = dot(v_uv, v_uv);
            if(sd > 1.0) {
                discard;
            }
            gl_FragColor = vec4(mix(v_color, borderColor, sd * sd * sd), 1.0);
        }`
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = THREE.MathUtils.degToRad(30.0);
    mesh.rotation.z = THREE.MathUtils.degToRad(135.0);

    scene.add(mesh);

    function render(time) {
        time *= 0.001;  // convert time to seconds

        mesh.rotation.y += 0.001;

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

}

main();
