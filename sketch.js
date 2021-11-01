import * as THREE from "./three.module.js";
import SimplexNoise from "./simplex-noise.js";

function pointOnSphere(y, phi, simplex) {
    const r = Math.sqrt(1.0 - y*y);
    const x = r * Math.cos(phi);
    const z = r * Math.sin(phi);
    const noiseC     = 5.48;
    const noiseScale = 1.8;
    const noiseMag   = 0.025;
    const m = noiseMag * (2.0 * simplex.noise3D(noiseScale * (x + noiseC), noiseScale * (y + noiseC), noiseScale * (z + noiseC)) - 1.0) + 1.0;
    return [m * x, m * y, m * z];
}

function main() {
    const simplex = new SimplexNoise("seeeeed");

    const width = 600;
    const height = 600;
    const canvas = document.querySelector("#c");
    const renderer = new THREE.WebGLRenderer({canvas: canvas, alpha: false, antialias: false});
    renderer.setSize(width, height);
    renderer.setClearColor(0xFAF7F2);

    const fov = 75;
    const near = 0.1;
    const far = 100;
    const camera = new THREE.PerspectiveCamera(fov, width / height, near, far);
    camera.position.z = 2;
    camera.position.x = 0;
    camera.lookAt(0, 0, 0);

    const scene = new THREE.Scene();

    const pointCount = 30000;
    const vertices = new Float32Array(pointCount * 4 * 3);
    const faces = new Uint32Array(pointCount * 2 * 3);
    for (let i = 0; i < pointCount; i++) {
        const y = THREE.MathUtils.randFloatSpread(2);
        const phi = THREE.MathUtils.randFloatSpread(2.0 * Math.PI);
        const p = pointOnSphere(y, phi, simplex);

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
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(new THREE.BufferAttribute(faces, 1));
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));

    // const material = new THREE.MeshBasicMaterial( { color: 0xff0000 } );

    const material = new THREE.ShaderMaterial({
        uniforms: {
            pointRadius: { value: 0.005 }
        },
        vertexShader: `
        uniform float pointRadius;
        varying vec2 v_uv;
        void main() {
            int v_i = gl_VertexID % 4;
            v_uv = vec2((v_i == 0 || v_i == 3) ? -1.0 : 1.0, (v_i <= 1) ? -1.0 : 1.0);
            vec4 mv_p = modelViewMatrix * vec4(position, 1.0) + vec4(pointRadius * v_uv, 0.0, 0.0);
            gl_Position = projectionMatrix * mv_p;
        }`,
        fragmentShader: `
        varying vec2 v_uv;
        void main() {
            float sd = dot(v_uv, v_uv);
            if(sd > 1.0) {
                discard;
            }
            gl_FragColor = vec4( sqrt(sd), 0.5, 0.3, 1.0);
        }`
    });

    const mesh = new THREE.Mesh( geometry, material );

    scene.add(mesh);

    function render(time) {
        time *= 0.001;  // convert time to seconds

        mesh.rotation.y = 0.2 * time;

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

}

main();
