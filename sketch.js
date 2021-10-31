import * as THREE from "./three.module.js";

function pointOnSphere(y, phi) {
    const r = Math.sqrt(1.0 - y*y);
    const x = r * Math.cos(phi);
    const z = r * Math.sin(phi);
    return [x, y, z];
}

function main() {
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
    camera.position.z = 1;
    camera.position.x = 0;
    camera.lookAt(0, 0, 0);

    const scene = new THREE.Scene();

    // const y = THREE.MathUtils.randFloatSpread(2);
    // const phi = THREE.MathUtils.randFloatSpread(2.0 * Math.PI);
    // const p = pointOnSphere(y, phi);

    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array( [
        -1.0, -1.0,  0.0,
        1.0, -1.0,  0.0,
        1.0,  1.0,  0.0,
        -1.0,  1.0,  0.0
    ] );
    const normals = new Float32Array( [
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1
    ] );
    const uv = new Float32Array( [
        -1, -1,
        1, -1,
        1, 1,
        -1, 1
    ] );
    const faces = new Uint32Array([
        0, 1, 2,
        0, 2, 3
    ]);

    geometry.setIndex(new THREE.BufferAttribute(faces, 1));
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));

    // const material = new THREE.MeshBasicMaterial( { color: 0xff0000 } );

    const material = new THREE.ShaderMaterial({
        vertexShader: `
        varying vec2 v_uv;
        void main() {
            mat4 mv = mat4(modelViewMatrix);
            mv[0][0] = 1.0;
            mv[0][1] = 0.0;
            mv[0][2] = 0.0;
            mv[1][0] = 0.0;
            mv[1][1] = 1.0;
            mv[1][2] = 0.0;
            mv[2][0] = 0.0;
            mv[2][1] = 0.0;
            mv[2][2] = 1.0;
            vec4 mvPosition = mv * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            v_uv = uv;
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

        mesh.rotation.y = 0.5 * time;

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

}

main();
