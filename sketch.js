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
    return new THREE.Vector3(m * x, m * y, m * z);
}

function sgn(x) {
    return x < 0.0 ? -1.0 : 1.0;
}

function pointAndNormalOnSphere(y, phi) {
    const p0 = pointOnSphere(y, phi);
    const eps = 0.001;
    let p1 = pointOnSphere(y - sgn(y) * eps, phi);
    let p2 = pointOnSphere(y, phi + eps);
    p1.sub(p0);
    p2.sub(p0);
    p1.cross(p2);
    p1.normalize();
    if(p1.dot(p0) < 0.0) {
        p1.negate();
    }
    return [p0, p1];
}

function main() {
    const width = 900;
    const height = 900;
    const canvas = document.querySelector("#c");
    const renderer = new THREE.WebGLRenderer({canvas: canvas, alpha: false, antialias: false});
    renderer.setSize(width, height);
    renderer.setClearColor(0xFAF7F2);

    const bgColor = [250, 247, 242];
    const fgColor = [26, 24, 21];
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

    const fov = 100;
    const near = 0.0075;
    const far = 100;
    const camera = new THREE.PerspectiveCamera(fov, width / height, near, far);
    camera.position.y = -0.8;
    camera.position.z = 0.6;
    camera.lookAt(0, -0.5, 0);

    const scene = new THREE.Scene();

    const pointCount = 90000;
    const vertices = new Float32Array(pointCount * 4 * 3);
    const normals = new Float32Array(pointCount * 4 * 3);
    const faces = new Uint32Array(pointCount * 2 * 3);
    for (let i = 0; i < pointCount; i++) {
        const s = 0.01 * pointCount;
        const f = (i + s) / (pointCount + s);
        const l = rand(0.0, Math.pow(f, 1.75));
        const y = 1.0 - 2.0 * Math.pow(l, 1.0);
        const phi = THREE.MathUtils.randFloatSpread(2.0 * Math.PI);
        const [p, n] = pointAndNormalOnSphere(y, phi);

        const v_base = i * 4;
        const v_offset = v_base * 3;
        vertices[v_offset + 0]  = p.x;
        vertices[v_offset + 1]  = p.y;
        vertices[v_offset + 2]  = p.z;
        vertices[v_offset + 3]  = p.x;
        vertices[v_offset + 4]  = p.y;
        vertices[v_offset + 5]  = p.z;
        vertices[v_offset + 6]  = p.x;
        vertices[v_offset + 7]  = p.y;
        vertices[v_offset + 8]  = p.z;
        vertices[v_offset + 9]  = p.x;
        vertices[v_offset + 10] = p.y;
        vertices[v_offset + 11] = p.z;

        normals[v_offset + 0]  = n.x;
        normals[v_offset + 1]  = n.y;
        normals[v_offset + 2]  = n.z;
        normals[v_offset + 3]  = n.x;
        normals[v_offset + 4]  = n.y;
        normals[v_offset + 5]  = n.z;
        normals[v_offset + 6]  = n.x;
        normals[v_offset + 7]  = n.y;
        normals[v_offset + 8]  = n.z;
        normals[v_offset + 9]  = n.x;
        normals[v_offset + 10] = n.y;
        normals[v_offset + 11] = n.z;

        const f_offset = i * 2 * 3;
        faces[f_offset + 0] = v_base + 0;
        faces[f_offset + 1] = v_base + 1;
        faces[f_offset + 2] = v_base + 2;
        faces[f_offset + 3] = v_base + 0;
        faces[f_offset + 4] = v_base + 2;
        faces[f_offset + 5] = v_base + 3;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(new THREE.BufferAttribute(faces, 1));
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));

    const material = new THREE.ShaderMaterial({
        uniforms: {
            pointRadius: { value: 0.003 },
            shadowColor: { value: fgColor.map(v => v / 255.0) },
            bgColor: {value: bgColor.map(v => v / 255.0) },
            colorCount: { value: fgColors.length },
            colors: { value: fgColors.flat().map(v => v / 255.0) },
            light: {value: new THREE.Vector3(0.0, 0.0, 100.0) }
        },
        vertexShader: `
        uniform float pointRadius;
        uniform vec3 bgColor;
        uniform vec3 colors[8];
        uniform int colorCount;
        uniform vec3 light;
        varying vec2 v_uv;
        varying vec3 v_color;
        varying vec3 lightDir;

        void main() {
            int vertexId = gl_VertexID % 4;
            v_uv = vec2((vertexId == 0 || vertexId == 3) ? -1.0 : 1.0, (vertexId <= 1) ? -1.0 : 1.0);

            int colorId = (gl_VertexID / 4) % colorCount;
            v_color = colors[colorId];

            vec3 p = vec3(modelViewMatrix * vec4(position, 1.0)) + vec3(pointRadius * v_uv, 0.0);
            lightDir = vec3(viewMatrix * vec4(light, 1.0)) - p;
            gl_Position = projectionMatrix * vec4(p, 1.0);
        }`,
        fragmentShader: `
        uniform vec3 shadowColor;
        varying vec2 v_uv;
        varying vec3 v_color;
        varying vec3 lightDir;

        void main() {
            float sd = dot(v_uv, v_uv);
            if(sd > 1.0) {
                discard;
            }

            vec3 n = vec3(v_uv, sqrt(1.0 - sd));
            float illuminance = max(dot(normalize(lightDir), n), 0.0);
            vec3 luminance = mix(shadowColor, v_color, 1.0 - pow(1.0 - illuminance, 2.5));
            gl_FragColor = vec4(luminance, 1.0);
        }`
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = THREE.MathUtils.degToRad(35.0);
    mesh.rotation.z = THREE.MathUtils.degToRad(135.0);

    scene.add(mesh);

    function render(time) {
        time *= 0.001;  // convert time to seconds

        mesh.rotation.y += 0.0001;

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

}

main();
