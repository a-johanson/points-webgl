import * as THREE from "./three.module.js";
import "./p5.min.js";

// https://newbedev.com/seeding-the-random-number-generator-in-javascript
function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

var mulberry32Instance = mulberry32(0x91FAC742);

function rand(a, b) {
    return (b - a) * mulberry32Instance() + a;
}

let myp5 = new p5(( sketch ) => {
    sketch.setup = () => {
        sketch.noCanvas();
        sketch.noiseSeed(425960);
        sketch.noiseDetail(4, 0.5);
    };
}, document.body);
myp5.setup();

function pointOnSphere(y, phi) {
    const r = Math.sqrt(1.0 - y*y);
    const x = r * Math.cos(phi);
    const z = r * Math.sin(phi);
    const noiseC     = 5.48;
    const noiseScale = 3.83;
    const noiseMag   = 0.13;
    const m = noiseMag * (2.0 * myp5.noise(noiseScale * (x + noiseC), noiseScale * (y + noiseC), noiseScale * (z + noiseC)) - 1.0) + 1.0;
    return new THREE.Vector3(m * x, m * y, m * z);
}

function main() {
    const width = 900;
    const height = 600;
    const canvas = document.querySelector("#c");
    const renderer = new THREE.WebGLRenderer({canvas: canvas, alpha: false, antialias: false});
    renderer.setSize(width, height);

    const bgColor = [250, 247, 242];
    // const fgColor = [26, 24, 21];
    renderer.setClearColor("rgb("+bgColor[0]+","+bgColor[1]+","+bgColor[2]+")");
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

    const fov = 90;
    const near = 0.0075;
    const far = 100;
    const camera = new THREE.PerspectiveCamera(fov, width / height, near, far);
    camera.position.y = 0;
    camera.position.z = 1.5;
    camera.lookAt(0, 0, 0);

    const scene = new THREE.Scene();

    const pointCount = 90000;
    const vertices = new Float32Array(pointCount * 4 * 3);
    const faces = new Uint32Array(pointCount * 2 * 3);
    for (let i = 0; i < pointCount; i++) {
        const s = 0.01 * pointCount;
        const f = (i + s) / (pointCount + s);
        const l = rand(0.0, Math.pow(f, 1.75));
        const y = 1.0 - 2.0 * Math.pow(l, 1.0);
        const phi = rand(0.0, 2.0 * Math.PI);
        const p = pointOnSphere(y, phi);

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

    const material = new THREE.ShaderMaterial({
        uniforms: {
            pointRadius: { value: 0.003 },
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
            vec3 luminance = mix(vec3(0.3, 0.3, 0.4) * v_color, v_color, 1.0 - pow(1.0 - illuminance, 2.5));
            gl_FragColor = vec4(luminance, 1.0);
        }`
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = THREE.MathUtils.degToRad(227.0);
    mesh.rotation.z = THREE.MathUtils.degToRad(145.0);

    scene.add(mesh);

    var pressedKeys = {};
    window.onkeydown = function(e) { pressedKeys[e.key] = true; }
    window.onkeyup = function(e) { pressedKeys[e.key] = false; }

    var yaw = 0.0;
    var pitch = 0.0;
    var last_t = 0.0;

    // renderer.render(scene, camera);

    function render(time) {
        time *= 0.001;  // convert time to seconds
        const delta_t = time - last_t;
        last_t = time;

        const angle_incr = delta_t * 0.5 * Math.PI;
        if (pressedKeys["ArrowLeft"]) { yaw += angle_incr; }
        if (pressedKeys["ArrowRight"]) { yaw -= angle_incr; }
        if (pressedKeys["w"] && pitch < 0.45 * Math.PI) { pitch += angle_incr; }
        if (pressedKeys["s"] && pitch > -0.45 * Math.PI) { pitch -= angle_incr; }

        var look_at_direction = new THREE.Vector3(Math.sin(-yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(-yaw) * Math.cos(pitch));

        const movement_incr = 0.5 * delta_t;
        if (pressedKeys["ArrowUp"]) { camera.position.addScaledVector(look_at_direction, movement_incr); }
        if (pressedKeys["ArrowDown"]) { camera.position.addScaledVector(look_at_direction, -movement_incr); }
        if (pressedKeys["a"]) { camera.position.addScaledVector(new THREE.Vector3().crossVectors(look_at_direction, camera.up).normalize(), -movement_incr); }
        if (pressedKeys["d"]) { camera.position.addScaledVector(new THREE.Vector3().crossVectors(look_at_direction, camera.up).normalize(), movement_incr); }
        if (pressedKeys["q"]) { camera.position.add(new THREE.Vector3(0.0, movement_incr, 0.0)); }
        if (pressedKeys["z"]) { camera.position.add(new THREE.Vector3(0.0, -movement_incr, 0.0)); }

        camera.lookAt(look_at_direction.add(camera.position));

        // mesh.rotation.y += 0.0001;
        //  camera.position.z += 0.001;
        // console.log(mesh.rotation.y * (180 / Math.PI));

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

main();
