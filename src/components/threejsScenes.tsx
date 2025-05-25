"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const ThreeScene = () => {
    const mountRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xdddddd);

        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.set(2, 2, 5);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        mountRef.current?.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);

        interface BoxOptions {
            width: number;
            height: number;
            depth: number;
            color?: number;
            velocity?: { x: number; y: number; z: number };
            position?: { x: number; y: number; z: number };
        }

        class Box extends THREE.Mesh<
            THREE.BoxGeometry,
            THREE.MeshStandardMaterial
        > {
            height: number;
            velocity: { x: number; y: number; z: number };
            top: number;
            bottom: number;
            gravity: number;

            constructor({
                width,
                height,
                depth,
                color = 0x00ff00,
                velocity = { x: 0, y: 0, z: 0 },
                position = { x: 0, y: 0, z: 0 },
            }: BoxOptions) {
                const geometry = new THREE.BoxGeometry(width, height, depth);
                const material = new THREE.MeshStandardMaterial({ color });

                super(geometry, material);
                this.position.set(position.x, position.y, position.z);

                this.height = height;
                this.velocity = velocity;

                this.top = this.position.y + height / 2;
                this.bottom = this.position.y - height / 2;
                this.gravity = -0.005;
                // this.castShadow = true
            }

            update(ground: Box) {
                this.position.x += this.velocity.x;

                this.top = this.position.y + this.height / 2;
                this.bottom = this.position.y - this.height / 2;
                this.position.y += this.velocity.y;

                this.applyGravity();
            }

            applyGravity() {
                //here we hitting the ground
                if (this.bottom + this.velocity.y <= ground.top) {
                    this.velocity.y *= 0.8;
                    this.velocity.y = -this.velocity.y;
                } else {
                    this.position.y += this.velocity.y;
                }
            }
        }

        const cube = new Box({
            width: 1,
            height: 1,
            depth: 1,
            velocity: { x: 0, y: -0.01, z: 0 },
            position: { x: 0, y: 2, z: 0 },
        });
        cube.castShadow = true;
        cube.position.y = 1;
        scene.add(cube);

        const ground = new Box({
            width: 5,
            height: 0.5,
            depth: 10,
            color: 0xff5555,
            position: { x: 0, y: -2, z: 0 },
        });

        // new THREE.BoxGeometry(5, 0.5, 10)
        // const groundMaterial = new THREE.MeshStandardMaterial({ color: 0xff5555 })
        // const ground = new THREE.Mesh(groundGeometry, groundMaterial)
        // ground.rotation.x = -Math.PI / 2

        ground.receiveShadow = true;
        scene.add(ground);

        const keys = {
            a: {
                pressed: false,
            },
            b: {
                pressed: false,
            },
        };

        window.addEventListener("keydown", (e) => {
            switch (e.key) {
                case "d":
                    keys.d.pressed = true;
                    break;

                case "a":
                    keys.a.pressed = true;
                    break;
            }
        });

        window.addEventListener("keyup", (e) => {
            switch (e.code) {
                case "KeyA":
                    keys.d.pressed = false;
                    break;

                case "KeyB":
                    keys.a.pressed = false;
                    break;
            }
        });

        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(3, 5, 2);
        light.castShadow = true;
        scene.add(light);
        scene.add(new THREE.AmbientLight(0xffffff, 0.3));

        const animate = () => {
            requestAnimationFrame(animate);

            if (keys.a.pressed) {
                cube.velocity.x = -0.01;
            } else if (keys.d.pressed) {
                cube.velocity.x = 0.01;
            }

            cube.update(ground);
            // cube.position.y += -0.01
            // cube.rotation.y += 0.01
            controls.update();
            renderer.render(scene, camera);
        };

        // console.log(cube.position.y - cube.height / 2)
        console.log(ground.position.y + ground.height / 2);

        animate();

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            renderer.dispose();
            mountRef.current?.removeChild(renderer.domElement);
        };
    }, []);

    return (
        <div
            ref={mountRef}
            style={{ width: "100vw", height: "100vh", margin: 0 }}
        />
    );
};

export default ThreeScene;
