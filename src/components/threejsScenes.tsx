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
        camera.position.set(4.61, 5, 29);

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
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
            zAccelaration?: boolean;
        }

        class Box extends THREE.Mesh<
            THREE.BoxGeometry,
            THREE.MeshStandardMaterial
        > {
            width: number;
            height: number;
            depth: number;
            velocity: { x: number; y: number; z: number };
            gravity: number;

            top: number = 0;
            bottom: number = 0;
            left: number = 0;
            right: number = 0;

            front: number = 0;
            back: number = 0;
            zAccelaration: boolean;

            constructor({
                width,
                height,
                depth,
                color = 0x00ff00,
                velocity = { x: 0, y: 0, z: 0 },
                position = { x: 0, y: 0, z: 0 },
                zAccelaration = false,
            }: BoxOptions) {
                const geometry = new THREE.BoxGeometry(width, height, depth);
                const material = new THREE.MeshStandardMaterial({ color });
                super(geometry, material);

                this.position.set(position.x, position.y, position.z);
                this.width = width;
                this.height = height;
                this.depth = depth;

                this.front = this.position.z + this.depth / 2;
                this.back = this.position.z - this.depth / 2;
                this.velocity = velocity;
                this.gravity = -0.005;

                this.zAccelaration = zAccelaration;
                this.updateSides();
            }

            updateSides() {
                this.top = this.position.y + this.height / 2;
                this.bottom = this.position.y - this.height / 2;
                this.left = this.position.x - this.width / 2;
                this.right = this.position.x + this.width / 2;
                this.front = this.position.z + this.depth / 2;
                this.back = this.position.z - this.depth / 2;
            }

            update(ground: Box) {
                this.applyGravity(ground);

                this.position.x += this.velocity.x;
                this.position.z += this.velocity.z;
                this.updateSides();
                if (this.zAccelaration) this.velocity.z += 0.003;
            }

            applyGravity(ground: Box) {
                this.velocity.y += this.gravity;

                const nextBottom =
                    this.position.y + this.velocity.y - this.height / 2;

                if (boxCollision({ box1: this, ground })) {
                    this.position.y = ground.top + this.height / 2;
                    this.velocity.y = -this.velocity.y * 0.4;

                    if (Math.abs(this.velocity.y) < 0.005) {
                        this.velocity.y = 0;
                    }
                } else {
                    this.position.y += this.velocity.y;
                }

                this.updateSides();
            }
        }

        const boxCollision = ({ box1, ground }: { box1: Box; ground: Box }) => {
            const xCollision =
                box1.right >= ground.left && box1.left <= ground.right;
            const yCollision =
                box1.top >= ground.bottom &&
                box1.bottom + box1.velocity.y <= ground.top;
            const zCollision =
                box1.front >= ground.back && box1.back <= ground.front;

            return xCollision && yCollision && zCollision;
        };

        const cube = new Box({
            width: 1,
            height: 1,
            depth: 1,
            velocity: { x: 0, y: -0.01, z: 0 },
            position: { x: 0, y: 2, z: 20 },
        });
        cube.castShadow = true;
        cube.position.y = 1;
        scene.add(cube);

        const ground = new Box({
            width: 15,
            height: 0.5,
            depth: 50,
            color: 0xc4a086,
            position: { x: 0, y: -2, z: 0 },
        });

        // new THREE.BoxGeometry(5, 0.5, 10)
        // const groundMaterial = new THREE.MeshStandardMaterial({ color: 0xff5555 })
        // const ground = new THREE.Mesh(groundGeometry, groundMaterial)
        // ground.rotation.x = -Math.PI / 2

        ground.receiveShadow = true;
        scene.add(ground);

        let keys = {
            a: {
                pressed: false,
            },
            d: {
                pressed: false,
            },
            w: {
                pressed: false,
            },
            s: {
                pressed: false,
            },
            space: {
                pressed: false,
            },
        };

        window.addEventListener("keydown", (e) => {
            switch (e.code) {
                case "KeyD":
                    keys.d.pressed = true;
                    break;

                case "KeyA":
                    keys.a.pressed = true;
                    break;

                case "KeyW":
                    keys.w.pressed = true;
                    break;

                case "KeyS":
                    keys.s.pressed = true;
                    break;

                case "Space":
                    cube.velocity.y = 0.15;
                    break;
            }
        });

        window.addEventListener("keyup", (e) => {
            switch (e.code) {
                case "KeyA":
                    keys.a.pressed = false;
                    break;

                case "KeyD":
                    keys.d.pressed = false;
                    break;

                case "KeyW":
                    keys.w.pressed = false;
                    break;

                case "KeyS":
                    keys.s.pressed = false;
                    break;
            }
        });

        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(3, 5, 1);
        light.castShadow = true;
        scene.add(light);
        scene.add(new THREE.AmbientLight(0xffffff, 0.3));

        const enemies: Box[] = [];
        let frames = 0;
        let spawnRate = 200;
        const animate = () => {
            const animationId = requestAnimationFrame(animate);

            frames++;

            //  Spawn enemy every 30 frames
            if (frames % spawnRate === 0) {
                if (spawnRate > 20) spawnRate -= 20; // Decrease spawn rate every 30 frames
                const enemy = new Box({
                    width: 1,
                    height: 1,
                    depth: 1,
                    velocity: { x: 0, y: 0, z: 0.009 },
                    position: { x: (Math.random() - 0.5) * 15, y: 0, z: -18 },
                    color: 0xff0000,
                    zAccelaration: true,
                });
                enemy.castShadow = true;
                scene.add(enemy);
                enemies.push(enemy);
            }

            cube.velocity.x =
                (keys.d.pressed ? 1 : 0) - (keys.a.pressed ? 1 : 0);
            cube.velocity.z =
                (keys.s.pressed ? 1 : 0) - (keys.w.pressed ? 1 : 0);
            const speed = 0.09;
            cube.velocity.x *= speed;
            cube.velocity.z *= speed;

            cube.update(ground);

            enemies.forEach((enemy) => {
                enemy.update(ground);
                if (boxCollision({ box1: cube, ground: enemy })) {
                    console.log("Collision detected with enemy!");
                    cancelAnimationFrame(animationId);
                }
            });

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
