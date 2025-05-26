'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { TextureLoader } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

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

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
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

        class Box extends THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> {
            width: number;
            height: number;
            depth: number;
            velocity: { x: number; y: number; z: number };
            gravity: number;
            zAccelaration: boolean;
            top = 0;
            bottom = 0;
            left = 0;
            right = 0;
            front = 0;
            back = 0;
            isGrounded = false;

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

                this.width = width;
                this.height = height;
                this.depth = depth;
                this.velocity = velocity;
                this.gravity = -0.005;
                this.zAccelaration = zAccelaration;
                this.position.set(position.x, position.y, position.z);
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
                if (this.zAccelaration) this.velocity.z += 0.003;
                this.updateSides();
            }

            applyGravity(ground: Box) {
                this.velocity.y += this.gravity;
                const nextBottom = this.position.y + this.velocity.y - this.height / 2;

                if (boxCollision({ box1: this, ground })) {
                    this.position.y = ground.top + this.height / 2;
                    this.velocity.y = 0;
                    if (Math.abs(this.velocity.y) < 0.005) this.velocity.y = 0;
                    this.isGrounded = true;
                } else {
                    this.position.y += this.velocity.y;
                    this.isGrounded = false;
                }

                this.updateSides();
            }
        }

        const boxCollision = ({ box1, ground }: { box1: Box; ground: Box }) => {
            const x = box1.right >= ground.left && box1.left <= ground.right;
            const y = box1.top >= ground.bottom && box1.bottom + box1.velocity.y <= ground.top;
            const z = box1.front >= ground.back && box1.back <= ground.front;
            return x && y && z;
        };

        const controller = new Box({
            width: 1,
            height: 1,
            depth: 1,
            velocity: { x: 0, y: -0.01, z: 0 },
            position: { x: 0, y: 2, z: 20 },
        });

        const ground = new Box({
            width: 15,
            height: 0.5,
            depth: 50,
            color: 0xffffff,
            position: { x: 0, y: -2, z: 0 },
        });

        ground.receiveShadow = true;
        scene.add(ground);

        const textureLoader = new TextureLoader();
        textureLoader.load('/coast_sand_rocks_02_diff_4k.jpg', (texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(4, 10);
            const material = new THREE.MeshStandardMaterial({ map: texture });
            ground.material = material;
        });

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(3, 5, 1);
        directionalLight.castShadow = true;
        scene.add(directionalLight);
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));

        const keys = {
            a: { pressed: false },
            d: { pressed: false },
            w: { pressed: false },
            s: { pressed: false },
        };

        window.addEventListener('keydown', (e) => {
            switch (e.code) {
                case 'KeyD': keys.d.pressed = true; break;
                case 'KeyA': keys.a.pressed = true; break;
                case 'KeyW': keys.w.pressed = true; break;
                case 'KeyS': keys.s.pressed = true; break;
                case 'Space':
                    if (controller.isGrounded) {
                        controller.velocity.y = 0.15;
                        controller.isGrounded = false;
                    }
                    break;
            }
        });

        window.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'KeyD': keys.d.pressed = false; break;
                case 'KeyA': keys.a.pressed = false; break;
                case 'KeyW': keys.w.pressed = false; break;
                case 'KeyS': keys.s.pressed = false; break;
            }
        });

        const enemies: Box[] = [];
        let frames = 0;
        let spawnRate = 200;

        const loader = new GLTFLoader();
        let modelContainer = new THREE.Group();
        scene.add(modelContainer);
        let currentModel: THREE.Object3D | null = null;
        let currentMixer: THREE.AnimationMixer | null = null;
        let runningModel: THREE.Object3D | null = null;
        let runningMixer: THREE.AnimationMixer | null = null;
        let jumpModel: THREE.Object3D | null = null;
        let jumpMixer: THREE.AnimationMixer | null = null;

        Promise.all([
            new Promise<void>((resolve) => {
                loader.load('/Running.glb', (gltf: { scene: THREE.Object3D<THREE.Object3DEventMap> | null; animations: any[]; }) => {
                    runningModel = gltf.scene!;
                    if(!runningModel) return
                    runningModel.scale.set(1, 1, 1);
                    runningModel.rotation.y = Math.PI;
                    runningModel.visible = false;

                    runningModel.traverse((child) => {
                        if ((child as THREE.Mesh).isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });

                    if (gltf.animations.length > 0) {
                        runningMixer = new THREE.AnimationMixer(runningModel);
                        gltf.animations.forEach((clip) => {
                            clip.tracks = clip.tracks.filter(track => !track.name.match(/position/i));
                        });
                        runningMixer.clipAction(gltf.animations[0]).play();
                    }
                    resolve();
                });
            }),
            new Promise<void>((resolve) => {
                loader.load('/Running Jump.glb', (gltf) => {
                    jumpModel = gltf.scene!;
                    if(!jumpModel) return
                    jumpModel.scale.set(1, 1, 1);
                    jumpModel.rotation.y = Math.PI;
                    jumpModel.visible = false;

                    jumpModel.traverse((child) => {
                        if ((child as THREE.Mesh).isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });

                    if (gltf.animations.length > 0) {
                        jumpMixer = new THREE.AnimationMixer(jumpModel);
                        gltf.animations.forEach((clip) => {
                            clip.tracks = clip.tracks.filter(track => !track.name.match(/position/i));
                        });
                        jumpMixer.clipAction(gltf.animations[0]).play();
                    }
                    resolve();
                });
            }),
        ]).then(() => {
            if (runningModel) {
                modelContainer.add(runningModel);
                runningModel.visible = true;
                currentModel = runningModel;
                currentMixer = runningMixer;
            }
        });

        const switchModel = (isGrounded: boolean) => {
            if (!runningModel || !jumpModel) return;

            if (currentModel) {
                modelContainer.remove(currentModel);
                currentModel.visible = false;
            }

            if (isGrounded) {
                modelContainer.add(runningModel!);
                runningModel!.visible = true;
                currentModel = runningModel;
                currentMixer = runningMixer;
            } else {
                modelContainer.add(jumpModel!);
                jumpModel!.visible = true;
                currentModel = jumpModel;
                currentMixer = jumpMixer;
            }
        };

        const clock = new THREE.Clock();

        const animate = () => {
            const animationId = requestAnimationFrame(animate);

            const delta = clock.getDelta();
            if (currentMixer) currentMixer.update(delta);

            frames++;
            if (frames % spawnRate === 0) {
                if (spawnRate > 20) spawnRate -= 20;
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

            controller.velocity.x = (keys.d.pressed ? 1 : 0) - (keys.a.pressed ? 1 : 0);
            controller.velocity.z = (keys.s.pressed ? 1 : 0) - (keys.w.pressed ? 1 : 0);
            const speed = 0.09;
            controller.velocity.x *= speed;
            controller.velocity.z *= speed;

            controller.update(ground);

            if (currentModel === runningModel && !controller.isGrounded) {
                switchModel(false);
            } else if (currentModel === jumpModel && controller.isGrounded) {
                switchModel(true);
            }

            modelContainer.position.copy(controller.position);
            modelContainer.rotation.copy(controller.rotation);

            enemies.forEach((enemy) => {
                enemy.update(ground);
                if (boxCollision({ box1: controller, ground: enemy })) {
                    console.log('Collision detected with enemy!');
                    cancelAnimationFrame(animationId);
                }
            });

            controls.update();
            renderer.render(scene, camera);
        };

        animate();

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
            mountRef.current?.removeChild(renderer.domElement);
        };
    }, []);

    return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />;
};

export default ThreeScene;
