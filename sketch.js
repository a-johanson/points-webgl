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
    const renderer = new THREE.WebGLRenderer({canvas});
    renderer.setSize(width, height);

    const fov = 75;
    const near = 0.1;
    const far = 100;
    const camera = new THREE.PerspectiveCamera(fov, width / height, near, far);
    camera.position.z = 2;

    const scene = new THREE.Scene();

    const vertices = [];
    for ( let i = 0; i < 100; i ++ ) {
        const y = THREE.MathUtils.randFloatSpread(2);
        const phi = THREE.MathUtils.randFloatSpread(2.0 * Math.PI);
        const p = pointOnSphere(y, phi);
        vertices.push(p[0], p[1], p[2]);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute( vertices, 3 ) );

    const material = new THREE.PointsMaterial({color: 0x44aa88, sizeAttenuation: false, size: 3.0});  // greenish blue

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    renderer.render(scene, camera);

    // function render(time) {
    //     time *= 0.001;  // convert time to seconds

    //     points.rotation.y = 0.1 * time;
    //     // points.rotation.y = time;

    //     renderer.render(scene, camera);

    //     requestAnimationFrame(render);
    // }
    // requestAnimationFrame(render);

}

main();
