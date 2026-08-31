// import React, { useRef, useMemo, useEffect } from "react";
// import { Canvas, useFrame, useThree } from "@react-three/fiber";
// import { useGLTF, OrbitControls, Sky } from "@react-three/drei";
// import * as THREE from "three";

// // Preload only the car model
// useGLTF.preload("/models/f1_bright_red_buggy_v3.glb");

// // ─── Track Curve ─────────────────────────────────────────────────────────────
// function buildTrackCurve() {
// 	const points = [];
// 	const W = 50;
// 	const D = 22;
// 	for (let i = 0; i <= 100; i++) {
// 		const t = i / 100;
// 		const angle = t * Math.PI * 2;
// 		points.push(
// 			new THREE.Vector3(Math.cos(angle) * W, 0, Math.sin(angle) * D),
// 		);
// 	}
// 	return new THREE.CatmullRomCurve3(points, true);
// }

// // ─── Helper: build a flat ribbon geometry along a curve ──────────────────────
// function buildRibbonGeom(curve, numDiv, widthFn, yOffset = 0) {
// 	const pts = curve.getPoints(numDiv);
// 	const up = new THREE.Vector3(0, 1, 0);
// 	const pos = [],
// 		nrm = [],
// 		uvs = [],
// 		idx = [];

// 	for (let i = 0; i <= numDiv; i++) {
// 		const t = i / numDiv;
// 		const p = pts[i % pts.length];
// 		const tang = curve.getTangentAt(t).normalize();
// 		const right = new THREE.Vector3().crossVectors(up, tang).normalize();
// 		const [lw, rw] = widthFn(t);
// 		const l = p.clone().addScaledVector(right, lw);
// 		const r = p.clone().addScaledVector(right, rw);
// 		pos.push(l.x, yOffset, l.z, r.x, yOffset, r.z);
// 		nrm.push(0, 1, 0, 0, 1, 0);
// 		uvs.push(t * 20, 0, t * 20, 1);
// 		if (i < numDiv) {
// 			const a = i * 2,
// 				b = a + 1,
// 				c = a + 2,
// 				d = a + 3;
// 			idx.push(a, c, b, b, c, d);
// 		}
// 	}
// 	const g = new THREE.BufferGeometry();
// 	g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
// 	g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
// 	g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
// 	g.setIndex(idx);
// 	g.computeBoundingSphere();
// 	return g;
// }

// // ─── Track ───────────────────────────────────────────────────────────────────
// function Track({ curve }) {
// 	const TW = 14; // track half-width = 7 each side
// 	const N = 200;

// 	const { trackGeom, leftWhite, rightWhite, centerLine, barrierData } =
// 		useMemo(() => {
// 			// main asphalt
// 			const trackGeom = buildRibbonGeom(curve, N, () => [
// 				-TW / 2,
// 				TW / 2,
// 			]);
// 			// white edge lines (1.5 wide, sitting on inner edge of barrier)
// 			const leftWhite = buildRibbonGeom(
// 				curve,
// 				N,
// 				() => [-TW / 2, -TW / 2 + 1.5],
// 				0.01,
// 			);
// 			const rightWhite = buildRibbonGeom(
// 				curve,
// 				N,
// 				() => [TW / 2 - 1.5, TW / 2],
// 				0.01,
// 			);
// 			// yellow center line
// 			const centerLine = buildRibbonGeom(
// 				curve,
// 				N,
// 				() => [-0.2, 0.2],
// 				0.02,
// 			);

// 			// barrier edge points
// 			const pts = curve.getPoints(N);
// 			const up = new THREE.Vector3(0, 1, 0);
// 			const edgeL = [],
// 				edgeR = [];
// 			for (let i = 0; i <= N; i++) {
// 				const t = i / N;
// 				const p = pts[i % pts.length];
// 				const tang = curve.getTangentAt(t).normalize();
// 				const right = new THREE.Vector3()
// 					.crossVectors(up, tang)
// 					.normalize();
// 				edgeL.push(p.clone().addScaledVector(right, -TW / 2));
// 				edgeR.push(p.clone().addScaledVector(right, TW / 2));
// 			}
// 			const barrierData = [];
// 			[edgeL, edgeR].forEach((edge) => {
// 				for (let i = 0; i < edge.length - 1; i++) {
// 					const a = edge[i],
// 						b = edge[i + 1];
// 					const mid = new THREE.Vector3()
// 						.addVectors(a, b)
// 						.multiplyScalar(0.5);
// 					const dir = new THREE.Vector3().subVectors(b, a);
// 					const len = dir.length();
// 					const angle = Math.atan2(dir.x, dir.z);
// 					barrierData.push({ pos: [mid.x, 0.4, mid.z], angle, len });
// 				}
// 			});
// 			return {
// 				trackGeom,
// 				leftWhite,
// 				rightWhite,
// 				centerLine,
// 				barrierData,
// 			};
// 		}, [curve]);

// 	// Infield oval (uses ShapeGeometry — no JSX ellipseGeometry)
// 	const infieldGeom = useMemo(() => {
// 		const shape = new THREE.Shape();
// 		const rx = 36,
// 			ry = 9;
// 		for (let i = 0; i <= 64; i++) {
// 			const a = (i / 64) * Math.PI * 2;
// 			const x = Math.cos(a) * rx,
// 				y = Math.sin(a) * ry;
// 			if (i === 0) shape.moveTo(x, y);
// 			else shape.lineTo(x, y);
// 		}
// 		return new THREE.ShapeGeometry(shape, 32);
// 	}, []);

// 	return (
// 		<group>
// 			{/* Desert sand ground */}
// 			<mesh
// 				rotation={[-Math.PI / 2, 0, 0]}
// 				position={[0, -0.05, 0]}
// 				receiveShadow
// 			>
// 				<planeGeometry args={[500, 500]} />
// 				<meshStandardMaterial color="#c9a466" roughness={0.95} />
// 			</mesh>

// 			{/* Asphalt */}
// 			<mesh geometry={trackGeom} receiveShadow>
// 				<meshStandardMaterial
// 					color="#252525"
// 					roughness={0.88}
// 					metalness={0.04}
// 				/>
// 			</mesh>

// 			{/* White edge lines */}
// 			<mesh geometry={leftWhite}>
// 				<meshStandardMaterial color="#ffffff" roughness={0.4} />
// 			</mesh>
// 			<mesh geometry={rightWhite}>
// 				<meshStandardMaterial color="#ffffff" roughness={0.4} />
// 			</mesh>

// 			{/* Yellow center line */}
// 			<mesh geometry={centerLine}>
// 				<meshStandardMaterial color="#f5d020" roughness={0.5} />
// 			</mesh>

// 			{/* Red/white barriers */}
// 			{barrierData.map((b, i) => (
// 				<mesh
// 					key={i}
// 					position={b.pos}
// 					rotation={[0, b.angle, 0]}
// 					castShadow
// 				>
// 					<boxGeometry args={[b.len + 0.05, 0.8, 0.4]} />
// 					<meshStandardMaterial
// 						color={i % 6 < 3 ? "#cc2200" : "#eeeeee"}
// 						roughness={0.4}
// 					/>
// 				</mesh>
// 			))}

// 			{/* Sandy infield */}
// 			<mesh
// 				geometry={infieldGeom}
// 				rotation={[-Math.PI / 2, 0, 0]}
// 				position={[0, -0.02, 0]}
// 			>
// 				<meshStandardMaterial color="#d4a96a" roughness={0.9} />
// 			</mesh>

// 			{/* Start/Finish line (checker-style white) */}
// 			<mesh
// 				position={[50, 0.02, 0]}
// 				rotation={[-Math.PI / 2, 0, Math.PI / 2]}
// 			>
// 				<planeGeometry args={[TW, 3]} />
// 				<meshStandardMaterial color="#ffffff" roughness={0.5} />
// 			</mesh>

// 			{/* Cacti */}
// 			{Array.from({ length: 18 }).map((_, i) => {
// 				const angle = (i / 18) * Math.PI * 2;
// 				const r = 85 + (i % 4) * 12;
// 				return (
// 					<group
// 						key={i}
// 						position={[Math.cos(angle) * r, 0, Math.sin(angle) * r]}
// 					>
// 						{/* Trunk */}
// 						<mesh position={[0, 2.5, 0]} castShadow>
// 							<cylinderGeometry args={[0.28, 0.35, 5, 7]} />
// 							<meshStandardMaterial
// 								color="#3d7240"
// 								roughness={0.85}
// 							/>
// 						</mesh>
// 						{/* Left arm */}
// 						<mesh
// 							position={[-0.85, 3.2, 0]}
// 							rotation={[0, 0, Math.PI / 3.5]}
// 							castShadow
// 						>
// 							<cylinderGeometry args={[0.18, 0.22, 2, 7]} />
// 							<meshStandardMaterial
// 								color="#3d7240"
// 								roughness={0.85}
// 							/>
// 						</mesh>
// 						{/* Right arm */}
// 						<mesh
// 							position={[0.85, 3.8, 0]}
// 							rotation={[0, 0, -Math.PI / 3.5]}
// 							castShadow
// 						>
// 							<cylinderGeometry args={[0.18, 0.22, 2, 7]} />
// 							<meshStandardMaterial
// 								color="#3d7240"
// 								roughness={0.85}
// 							/>
// 						</mesh>
// 					</group>
// 				);
// 			})}

// 			{/* Low-poly desert buildings */}
// 			{Array.from({ length: 10 }).map((_, i) => {
// 				const angle = (i / 10) * Math.PI * 2;
// 				const r = 108 + (i % 3) * 15;
// 				const w = 8 + (i % 4) * 3;
// 				const h = 4 + (i % 5) * 2;
// 				const d = w * 0.65;
// 				return (
// 					<group
// 						key={i}
// 						position={[Math.cos(angle) * r, 0, Math.sin(angle) * r]}
// 						rotation={[0, angle + Math.PI / 4, 0]}
// 					>
// 						{/* Main block */}
// 						<mesh position={[0, h / 2, 0]} castShadow>
// 							<boxGeometry args={[w, h, d]} />
// 							<meshStandardMaterial
// 								color="#e8dece"
// 								roughness={0.9}
// 							/>
// 						</mesh>
// 						{/* Roof */}
// 						<mesh position={[0, h + 0.6, 0]} castShadow>
// 							<boxGeometry args={[w + 0.5, 0.4, d + 0.5]} />
// 							<meshStandardMaterial
// 								color="#d0c0a8"
// 								roughness={0.9}
// 							/>
// 						</mesh>
// 					</group>
// 				);
// 			})}

// 			{/* Tower / landmark at start */}
// 			<group position={[55, 0, 0]}>
// 				<mesh position={[0, 5, 0]} castShadow>
// 					<cylinderGeometry args={[0.6, 0.8, 10, 8]} />
// 					<meshStandardMaterial color="#d8d0c0" roughness={0.85} />
// 				</mesh>
// 				<mesh position={[0, 10.5, 0]} castShadow>
// 					<cylinderGeometry args={[0.15, 0.15, 2, 6]} />
// 					<meshStandardMaterial color="#aaaaaa" roughness={0.7} />
// 				</mesh>
// 			</group>

// 			<group position={[50, 0, 0]}>
// 				<mesh position={[-7.5, 3, 0]} castShadow>
// 					<boxGeometry args={[0.5, 6, 0.5]} />
// 					<meshStandardMaterial color="#888888" roughness={0.6} />
// 				</mesh>
// 				<mesh position={[7.5, 3, 0]} castShadow>
// 					<boxGeometry args={[0.5, 6, 0.5]} />
// 					<meshStandardMaterial color="#888888" roughness={0.6} />
// 				</mesh>
// 				<mesh position={[0, 6.2, 0]} castShadow>
// 					<boxGeometry args={[15, 0.4, 0.5]} />
// 					<meshStandardMaterial color="#888888" roughness={0.6} />
// 				</mesh>
// 			</group>
// 		</group>
// 	);
// }

// // ─── Car ─────────────────────────────────────────────────────────────────────
// const BASE_SPEED = 0.012; // laps/sec at idle crawl
// const BOOST_SPEED = 0.055; // laps/sec on word typed
// const FINISH_SPEED = 0.09; // laps/sec dash to finish line
// const IDLE_HALT_SECONDS = 5; // seconds before car stops

// function Car({ curve, progress, isCurrentPlayer, laneOffset }) {
// 	const { camera } = useThree();
// 	const { scene } = useGLTF("/models/f1_bright_red_buggy_v3.glb");
// 	const clone = useMemo(() => scene.clone(), [scene]);

// 	const groupRef = useRef();
// 	const flameRef = useRef(); // left exhaust flame group
// 	const flameRef2 = useRef(); // right exhaust flame group
// 	const flameLightRef = useRef();

// 	// Auto-movement state
// 	const autoT = useRef(0);
// 	const currentSpeed = useRef(BASE_SPEED);
// 	const boostTimer = useRef(0);
// 	const prevProgress = useRef(progress);
// 	const idleTimer = useRef(0); // seconds since last progress change
// 	const isHalted = useRef(false);
// 	const isFinished = useRef(false);

// 	useFrame((_, delta) => {
// 		if (!groupRef.current) return;

// 		// ── Progress change detection ─────────────────────────────────────
// 		if (progress !== prevProgress.current) {
// 			const diff = progress - prevProgress.current;
// 			if (diff > 0) {
// 				// Word typed — boost
// 				currentSpeed.current = BOOST_SPEED;
// 				boostTimer.current = 1.0;
// 				idleTimer.current = 0;
// 				isHalted.current = false;

// 				// Race finished: last word typed → drive to finish line (t=1/0)
// 				if (progress >= 100) {
// 					isFinished.current = true;
// 				}
// 			}
// 			prevProgress.current = progress;
// 		}

// 		// ── Idle halt logic ───────────────────────────────────────────────
// 		if (!isFinished.current) {
// 			idleTimer.current += delta;
// 			if (idleTimer.current >= IDLE_HALT_SECONDS && !isHalted.current) {
// 				isHalted.current = true;
// 				currentSpeed.current = 0;
// 			}
// 		}

// 		// ── Speed decay ────────────────────────────────────────────────────
// 		if (!isHalted.current) {
// 			if (boostTimer.current > 0) {
// 				boostTimer.current -= delta;
// 			} else if (!isFinished.current) {
// 				currentSpeed.current = THREE.MathUtils.lerp(
// 					currentSpeed.current,
// 					BASE_SPEED,
// 					delta * 3,
// 				);
// 			}
// 		}

// 		// ── Finish: dash to t=1.0 at FINISH_SPEED ─────────────────────────
// 		if (isFinished.current) {
// 			currentSpeed.current = FINISH_SPEED;
// 			// Stop exactly when we've crossed 1 full lap from wherever we started
// 			if (autoT.current > 0.99) {
// 				currentSpeed.current = 0;
// 				isFinished.current = false; // settled at finish
// 			}
// 		}

// 		// ── Advance along curve ─────────────────────────────────────────────
// 		autoT.current = (autoT.current + currentSpeed.current * delta) % 1;

// 		const t = autoT.current;
// 		const pos = curve.getPointAt(t);
// 		const tangent = curve.getTangentAt(t).normalize();
// 		const up = new THREE.Vector3(0, 1, 0);
// 		const right = new THREE.Vector3().crossVectors(up, tangent).normalize();

// 		const carPos = pos.clone().addScaledVector(right, laneOffset);
// 		carPos.y = 0.4;

// 		groupRef.current.position.lerp(carPos, 0.15);

// 		// Face direction of travel
// 		const ahead = carPos.clone().add(tangent);
// 		const mat = new THREE.Matrix4().lookAt(carPos, ahead, up);
// 		const targetQuat = new THREE.Quaternion().setFromRotationMatrix(mat);
// 		groupRef.current.quaternion.slerp(targetQuat, 0.15);

// 		// ── Boost VFX ──────────────────────────────────────────────────────
// 		const isBoosting = boostTimer.current > 0.05;
// 		const boostIntensity = Math.min(boostTimer.current / 1.0, 1);
// 		const showFlame = (refs) => {
// 			if (!refs.current) return;
// 			refs.current.visible = isBoosting;
// 			if (isBoosting) {
// 				const s = 0.6 + boostIntensity * 0.7;
// 				refs.current.scale.set(s, s, s);
// 			}
// 		};
// 		showFlame(flameRef);
// 		showFlame(flameRef2);
// 		if (flameLightRef.current) {
// 			flameLightRef.current.intensity = isBoosting
// 				? boostIntensity * 3
// 				: 0;
// 		}

// 		// ── Chase camera ────────────────────────────────────────────────────
// 		if (isCurrentPlayer) {
// 			const behind = tangent.clone().multiplyScalar(-5);
// 			const camPos = carPos.clone().add(behind);
// 			camPos.y = carPos.y + 2.5;
// 			camera.position.lerp(camPos, 0.08);

// 			const lookAhead = tangent.clone().multiplyScalar(8);
// 			const lookAtPt = carPos.clone().add(lookAhead);
// 			lookAtPt.y = carPos.y + 0.5;
// 			camera.lookAt(lookAtPt);
// 		}
// 	});

// 	// Dual exhaust offsets (left & right of rear, matching buggy geometry roughly)
// 	// After the 135° rotation, "behind" = +Z, left = −X, right = +X in group space
// 	const exhaustL = [0.35, 0.28, 0.9];
// 	const exhaustR = [-0.35, 0.28, 0.9];

// 	return (
// 		<group ref={groupRef}>
// 			{/*
//               135° = Math.PI - Math.PI/4
//               (180° to face forward, then 45° anti-clockwise to match model)
//             */}
// 			<primitive
// 				object={clone}
// 				scale={0.6}
// 				// rotation={[0, Math, 0]}
// 				rotation={[0, -Math.PI, 0]}
// 			/>

// 			{/* Left exhaust flame */}
// 			<group ref={flameRef} position={exhaustL} visible={false}>
// 				<mesh rotation={[Math.PI / 2, 0, 0]}>
// 					<coneGeometry args={[0.07, 0.45, 6]} />
// 					<meshStandardMaterial
// 						color="#fffde7"
// 						emissive="#ffee44"
// 						emissiveIntensity={4}
// 						transparent
// 						opacity={0.95}
// 					/>
// 				</mesh>
// 				<mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.2]}>
// 					<coneGeometry args={[0.13, 0.65, 6]} />
// 					<meshStandardMaterial
// 						color="#ff7700"
// 						emissive="#ff4400"
// 						emissiveIntensity={2}
// 						transparent
// 						opacity={0.6}
// 					/>
// 				</mesh>
// 			</group>

// 			{/* Right exhaust flame */}
// 			<group ref={flameRef2} position={exhaustR} visible={false}>
// 				<mesh rotation={[Math.PI / 2, 0, 0]}>
// 					<coneGeometry args={[0.07, 0.45, 6]} />
// 					<meshStandardMaterial
// 						color="#fffde7"
// 						emissive="#ffee44"
// 						emissiveIntensity={4}
// 						transparent
// 						opacity={0.95}
// 					/>
// 				</mesh>
// 				<mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.2]}>
// 					<coneGeometry args={[0.13, 0.65, 6]} />
// 					<meshStandardMaterial
// 						color="#ff7700"
// 						emissive="#ff4400"
// 						emissiveIntensity={2}
// 						transparent
// 						opacity={0.6}
// 					/>
// 				</mesh>
// 			</group>

// 			{/* Boost point light between exhausts */}
// 			<pointLight
// 				ref={flameLightRef}
// 				position={[0, 0.3, 1.0]}
// 				color="#ff6600"
// 				intensity={0}
// 				distance={5}
// 			/>

// 			{/* Current player blue glow */}
// 			{isCurrentPlayer && (
// 				<pointLight
// 					color="#4488ff"
// 					intensity={1.0}
// 					distance={6}
// 					position={[0, 1, 0]}
// 				/>
// 			)}
// 		</group>
// 	);
// }

// export default function RaceGame3D({ players, currentUserId }) {
// 	const curve = useMemo(() => buildTrackCurve(), []);
// 	const hasCurrentPlayer = players.some((p) => p.id === currentUserId);

// 	return (
// 		<div className="w-full h-[450px] rounded-2xl overflow-hidden border border-borderMain">
// 			<Canvas
// 				shadows
// 				camera={{ position: [-60, 30, 10], fov: 62 }}
// 				gl={{ antialias: true }}
// 			>
// 				{/* Daytime desert sky */}
// 				<Sky
// 					sunPosition={[100, 30, 100]}
// 					turbidity={6}
// 					rayleigh={1.2}
// 					mieCoefficient={0.005}
// 					mieDirectionalG={0.8}
// 				/>
// 				<fog attach="fog" args={["#c8daf0", 180, 450]} />

// 				{/* Lighting */}
// 				<ambientLight intensity={0.65} />
// 				<directionalLight
// 					position={[60, 90, 40]}
// 					intensity={1.8}
// 					castShadow
// 					shadow-mapSize-width={2048}
// 					shadow-mapSize-height={2048}
// 					shadow-camera-far={300}
// 					shadow-camera-left={-120}
// 					shadow-camera-right={120}
// 					shadow-camera-top={80}
// 					shadow-camera-bottom={-80}
// 				/>
// 				<hemisphereLight args={["#aacfff", "#c9a466", 0.4]} />

// 				<Track curve={curve} />

// 				{players.map((player, idx) => {
// 					const isCurrentPlayer = player.id === currentUserId;
// 					const numLanes = players.length;
// 					const laneOffset = (idx - (numLanes - 1) / 2) * 2.5;
// 					return (
// 						<Car
// 							key={player.id}
// 							curve={curve}
// 							progress={player.progress || 0}
// 							laneOffset={laneOffset}
// 							isCurrentPlayer={isCurrentPlayer}
// 						/>
// 					);
// 				})}

// 				{!hasCurrentPlayer && (
// 					<OrbitControls
// 						enableDamping
// 						dampingFactor={0.05}
// 						minDistance={20}
// 						maxDistance={250}
// 						maxPolarAngle={Math.PI / 2.1}
// 					/>
// 				)}
// 			</Canvas>
// 		</div>
// 	);
// }

import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls, Sky } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";

// Preload the car model
useGLTF.preload("/models/f1_bright_red_buggy_v3.glb");

// ─── Track Curve & Math ──────────────────────────────────────────────────────
const curvePoints = [
	new THREE.Vector3(0, 0.5, 90),
	new THREE.Vector3(70, 0.5, 70),
	new THREE.Vector3(100, 15, 0), // Mountain climb
	new THREE.Vector3(60, 20, -70), // High bridge
	new THREE.Vector3(-20, 12, -90), // Downhill sweeper
	new THREE.Vector3(-80, 0.5, -40),
	new THREE.Vector3(-100, 0.5, 30),
	new THREE.Vector3(-50, 0.5, 80),
];

function buildTrackCurve() {
	return new THREE.CatmullRomCurve3(curvePoints, true, "centripetal", 0.5);
}

// Smart ribbon generator that keeps the track flat to the horizon despite elevation
function buildRibbonGeom(curve, numDiv, widthFn, yOffset = 0) {
	const frames = curve.computeFrenetFrames(numDiv, true);
	const pts = curve.getPoints(numDiv);
	const pos = [],
		nrm = [],
		uvs = [],
		idx = [];

	for (let i = 0; i <= numDiv; i++) {
		const t = i / numDiv;
		const p = pts[i];

		// Force the track to stay level horizontally
		const right = frames.binormals[i].clone();
		right.y = 0;
		right.normalize();

		const up = new THREE.Vector3()
			.crossVectors(frames.tangents[i], right)
			.normalize();

		const [lw, rw] = widthFn(t);
		const l = p
			.clone()
			.addScaledVector(right, lw)
			.addScaledVector(up, yOffset);
		const r = p
			.clone()
			.addScaledVector(right, rw)
			.addScaledVector(up, yOffset);

		pos.push(l.x, l.y, l.z, r.x, r.y, r.z);
		nrm.push(up.x, up.y, up.z, up.x, up.y, up.z);
		uvs.push(t * 40, 0, t * 40, 1);

		if (i < numDiv) {
			const a = i * 2,
				b = a + 1,
				c = a + 2,
				d = a + 3;
			idx.push(a, c, b, b, c, d);
		}
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
	g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
	g.setIndex(idx);
	g.computeBoundingSphere();
	return g;
}

// ─── Forest Component (Instanced Rendering) ──────────────────────────────────
function Forest({ curve }) {
	const treeCount = 1200;
	const { trunkGeo, leavesGeo, trunkMatrices, leavesMatrices } =
		useMemo(() => {
			const dummy = new THREE.Object3D();
			const tMats = new Float32Array(treeCount * 16);
			const lMats = new Float32Array(treeCount * 16);
			const pts = curve.getPoints(400);

			let placedTrees = 0;
			while (placedTrees < treeCount) {
				const r = 20 + Math.random() * 110;
				const theta = Math.random() * Math.PI * 2;
				const x = Math.cos(theta) * r;
				const z = Math.sin(theta) * r;
				const pt = new THREE.Vector3(x, 0, z);

				// Avoid placing trees on the track
				let tooClose = false;
				for (let i = 0; i < pts.length; i += 5) {
					// We only care about X/Z distance to avoid trees floating under elevated tracks
					const trackPt2D = new THREE.Vector2(pts[i].x, pts[i].z);
					const treePt2D = new THREE.Vector2(x, z);
					if (treePt2D.distanceTo(trackPt2D) < 18) {
						tooClose = true;
						break;
					}
				}

				if (!tooClose) {
					const scale = 0.7 + Math.random() * 0.8;

					// Trunk
					dummy.position.set(x, 1.5 * scale - 2, z); // -2 is island base height
					dummy.scale.set(scale, scale, scale);
					dummy.updateMatrix();
					dummy.matrix.toArray(tMats, placedTrees * 16);

					// Leaves
					dummy.position.set(x, (3 + 3.5) * scale - 2, z);
					dummy.updateMatrix();
					dummy.matrix.toArray(lMats, placedTrees * 16);

					placedTrees++;
				}
			}

			return {
				trunkGeo: new THREE.CylinderGeometry(0.4, 0.6, 3, 5),
				leavesGeo: new THREE.ConeGeometry(2.5, 7, 5),
				trunkMatrices: tMats,
				leavesMatrices: lMats,
			};
		}, [curve]);

	const trunkRef = useRef();
	const leavesRef = useRef();

	useEffect(() => {
		if (trunkRef.current && leavesRef.current) {
			const tInst = trunkRef.current;
			const lInst = leavesRef.current;
			for (let i = 0; i < treeCount; i++) {
				const tMat = new THREE.Matrix4().fromArray(
					trunkMatrices,
					i * 16,
				);
				const lMat = new THREE.Matrix4().fromArray(
					leavesMatrices,
					i * 16,
				);
				tInst.setMatrixAt(i, tMat);
				lInst.setMatrixAt(i, lMat);
			}
			tInst.instanceMatrix.needsUpdate = true;
			lInst.instanceMatrix.needsUpdate = true;
		}
	}, [trunkMatrices, leavesMatrices]);

	return (
		<group>
			<instancedMesh
				ref={trunkRef}
				args={[trunkGeo, null, treeCount]}
				castShadow
			>
				<meshStandardMaterial color="#4a3018" roughness={1.0} />
			</instancedMesh>
			<instancedMesh
				ref={leavesRef}
				args={[leavesGeo, null, treeCount]}
				castShadow
			>
				<meshStandardMaterial color="#1a3311" roughness={0.9} />
			</instancedMesh>
		</group>
	);
}

// ─── Track Component ─────────────────────────────────────────────────────────
function Track({ curve }) {
	const TW = 16;
	const N = 400;

	const {
		trackGeom,
		edgeLeftGeom,
		edgeRightGeom,
		centerLineGeom,
		pillars,
		gantry,
	} = useMemo(() => {
		const trackGeom = buildRibbonGeom(curve, N, () => [-TW / 2, TW / 2]);
		const edgeLeftGeom = buildRibbonGeom(
			curve,
			N,
			() => [-TW / 2 - 0.5, -TW / 2],
			0.05,
		);
		const edgeRightGeom = buildRibbonGeom(
			curve,
			N,
			() => [TW / 2, TW / 2 + 0.5],
			0.05,
		);
		const centerLineGeom = buildRibbonGeom(
			curve,
			N,
			() => [-0.15, 0.15],
			0.02,
		);

		const pts = curve.getPoints(N);
		const pillars = [];
		for (let i = 0; i <= N; i++) {
			const p = pts[i];
			if (i % 15 === 0 && p.y > 2.5) {
				const height = p.y + 2;
				pillars.push({ pos: [p.x, p.y - height / 2, p.z], height });
			}
		}

		const startPos = pts[0];
		const startTangent = curve.getTangentAt(0).normalize();
		const gantryLookAt = startPos.clone().add(startTangent);

		return {
			trackGeom,
			edgeLeftGeom,
			edgeRightGeom,
			centerLineGeom,
			pillars,
			gantry: { pos: startPos, lookAt: gantryLookAt, TW },
		};
	}, [curve]);

	const waterRef = useRef();
	useFrame((state) => {
		if (waterRef.current) {
			waterRef.current.position.y =
				-2 + Math.sin(state.clock.elapsedTime) * 0.1;
		}
	});

	return (
		<group>
			{/* Water */}
			<mesh
				ref={waterRef}
				rotation={[-Math.PI / 2, 0, 0]}
				position={[0, -2, 0]}
			>
				<planeGeometry args={[2000, 2000]} />
				<meshStandardMaterial
					color="#051b2b"
					roughness={0.1}
					metalness={0.9}
					transparent
					opacity={0.9}
				/>
			</mesh>

			{/* Lush Island Base */}
			<mesh position={[0, -2, 0]} receiveShadow>
				<cylinderGeometry args={[140, 150, 4, 64]} />
				<meshStandardMaterial color="#2d4c1e" roughness={0.9} />
			</mesh>

			{/* Asphalt */}
			<mesh geometry={trackGeom} receiveShadow>
				<meshStandardMaterial
					color="#111111"
					roughness={0.7}
					metalness={0.2}
				/>
			</mesh>

			{/* Neon Edges (Bloom will make these glow) */}
			<mesh geometry={edgeLeftGeom}>
				<meshStandardMaterial
					color="#00ffff"
					emissive="#00c3ff"
					emissiveIntensity={2.5}
				/>
			</mesh>
			<mesh geometry={edgeRightGeom}>
				<meshStandardMaterial
					color="#00ffff"
					emissive="#00c3ff"
					emissiveIntensity={2.5}
				/>
			</mesh>

			{/* Center Line */}
			<mesh geometry={centerLineGeom}>
				<meshStandardMaterial color="#ffffff" roughness={0.5} />
			</mesh>

			{/* Bridge Pillars */}
			{pillars.map((p, i) => (
				<mesh key={i} position={p.pos} castShadow>
					<cylinderGeometry args={[1.5, 2, p.height, 16]} />
					<meshStandardMaterial color="#777777" roughness={0.9} />
				</mesh>
			))}

			<Forest curve={curve} />

			{/* Gantry at Start */}
			<group
				position={gantry.pos}
				onUpdate={(c) => c.lookAt(gantry.lookAt)}
			>
				<mesh position={[-gantry.TW / 2 - 2, 6, 0]} castShadow>
					<boxGeometry args={[1.5, 12, 1.5]} />
					<meshStandardMaterial
						color="#222222"
						metalness={0.8}
						roughness={0.2}
					/>
				</mesh>
				<mesh position={[gantry.TW / 2 + 2, 6, 0]} castShadow>
					<boxGeometry args={[1.5, 12, 1.5]} />
					<meshStandardMaterial
						color="#222222"
						metalness={0.8}
						roughness={0.2}
					/>
				</mesh>
				<mesh position={[0, 12.5, 0]} castShadow>
					<boxGeometry args={[gantry.TW + 5, 2, 1.5]} />
					<meshStandardMaterial
						color="#222222"
						metalness={0.8}
						roughness={0.2}
					/>
				</mesh>
				{/* Red Neon Arch Glow */}
				<mesh position={[0, 12.5, 0]}>
					<boxGeometry args={[gantry.TW + 4, 0.5, 1.6]} />
					<meshStandardMaterial
						color="#ff003c"
						emissive="#ff003c"
						emissiveIntensity={4}
					/>
				</mesh>
			</group>
		</group>
	);
}

// ─── Car ─────────────────────────────────────────────────────────────────────
const BASE_SPEED = 0.012;
const BOOST_SPEED = 0.055;
const FINISH_SPEED = 0.09;
const IDLE_HALT_SECONDS = 5;

function Car({ curve, progress, isCurrentPlayer, laneOffset }) {
	const { camera } = useThree();
	const { scene } = useGLTF("/models/f1_bright_red_buggy_v3.glb");
	const clone = useMemo(() => scene.clone(), [scene]);

	const groupRef = useRef();
	const flameRef = useRef();
	const flameRef2 = useRef();
	const flameLightRef = useRef();

	const autoT = useRef(0);
	const currentSpeed = useRef(BASE_SPEED);
	const boostTimer = useRef(0);
	const prevProgress = useRef(progress);
	const idleTimer = useRef(0);
	const isHalted = useRef(false);
	const isFinished = useRef(false);

	useFrame((_, delta) => {
		if (!groupRef.current) return;

		if (progress !== prevProgress.current) {
			const diff = progress - prevProgress.current;
			if (diff > 0) {
				currentSpeed.current = BOOST_SPEED;
				boostTimer.current = 1.0;
				idleTimer.current = 0;
				isHalted.current = false;
				if (progress >= 100) isFinished.current = true;
			}
			prevProgress.current = progress;
		}

		if (!isFinished.current) {
			idleTimer.current += delta;
			if (idleTimer.current >= IDLE_HALT_SECONDS && !isHalted.current) {
				isHalted.current = true;
				currentSpeed.current = 0;
			}
		}

		if (!isHalted.current) {
			if (boostTimer.current > 0) {
				boostTimer.current -= delta;
			} else if (!isFinished.current) {
				currentSpeed.current = THREE.MathUtils.lerp(
					currentSpeed.current,
					BASE_SPEED,
					delta * 3,
				);
			}
		}

		if (isFinished.current) {
			currentSpeed.current = FINISH_SPEED;
			if (autoT.current > 0.99) {
				currentSpeed.current = 0;
				isFinished.current = false;
			}
		}

		autoT.current = (autoT.current + currentSpeed.current * delta) % 1;

		const t = autoT.current;
		const pos = curve.getPointAt(t);
		const tangent = curve.getTangentAt(t).normalize();

		// Keeping the buggy level horizontally, exactly like the track ribbon
		const right = new THREE.Vector3()
			.crossVectors(new THREE.Vector3(0, 1, 0), tangent)
			.normalize();

		// Up vector based on the level track
		const up = new THREE.Vector3().crossVectors(tangent, right).normalize();

		const carPos = pos.clone().addScaledVector(right, laneOffset);
		carPos.addScaledVector(up, 0.4); // Ride height

		groupRef.current.position.lerp(carPos, 0.15);

		const ahead = carPos.clone().add(tangent);
		const mat = new THREE.Matrix4().lookAt(carPos, ahead, up);
		const targetQuat = new THREE.Quaternion().setFromRotationMatrix(mat);
		groupRef.current.quaternion.slerp(targetQuat, 0.15);

		const isBoosting = boostTimer.current > 0.05;
		const boostIntensity = Math.min(boostTimer.current / 1.0, 1);
		const showFlame = (refs) => {
			if (!refs.current) return;
			refs.current.visible = isBoosting;
			if (isBoosting) {
				const s = 0.6 + boostIntensity * 0.7;
				refs.current.scale.set(s, s, s);
			}
		};
		showFlame(flameRef);
		showFlame(flameRef2);
		if (flameLightRef.current)
			flameLightRef.current.intensity = isBoosting
				? boostIntensity * 3
				: 0;

		// ── Chase camera ────────────────────────────────────────────────────
		if (isCurrentPlayer) {
			const behind = tangent.clone().multiplyScalar(-5);
			const camPos = carPos.clone().add(behind);
			camPos.y += 2.5;
			camera.position.lerp(camPos, 0.08);

			const lookAhead = tangent.clone().multiplyScalar(8);
			const lookAtPt = carPos.clone().add(lookAhead);
			lookAtPt.y += 0.5;
			camera.lookAt(lookAtPt);
		}
	});

	const exhaustL = [0.35, 0.28, 0.9];
	const exhaustR = [-0.35, 0.28, 0.9];

	return (
		<group ref={groupRef}>
			<primitive object={clone} scale={0.6} rotation={[0, -Math.PI, 0]} />

			{/* Exhausts */}
			<group ref={flameRef} position={exhaustL} visible={false}>
				<mesh rotation={[Math.PI / 2, 0, 0]}>
					<coneGeometry args={[0.07, 0.45, 6]} />
					<meshStandardMaterial
						color="#fffde7"
						emissive="#ffee44"
						emissiveIntensity={4}
						transparent
						opacity={0.95}
					/>
				</mesh>
				<mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.2]}>
					<coneGeometry args={[0.13, 0.65, 6]} />
					<meshStandardMaterial
						color="#ff7700"
						emissive="#ff4400"
						emissiveIntensity={2}
						transparent
						opacity={0.6}
					/>
				</mesh>
			</group>

			<group ref={flameRef2} position={exhaustR} visible={false}>
				<mesh rotation={[Math.PI / 2, 0, 0]}>
					<coneGeometry args={[0.07, 0.45, 6]} />
					<meshStandardMaterial
						color="#fffde7"
						emissive="#ffee44"
						emissiveIntensity={4}
						transparent
						opacity={0.95}
					/>
				</mesh>
				<mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.2]}>
					<coneGeometry args={[0.13, 0.65, 6]} />
					<meshStandardMaterial
						color="#ff7700"
						emissive="#ff4400"
						emissiveIntensity={2}
						transparent
						opacity={0.6}
					/>
				</mesh>
			</group>

			<pointLight
				ref={flameLightRef}
				position={[0, 0.3, 1.0]}
				color="#ff6600"
				intensity={0}
				distance={5}
			/>
			{isCurrentPlayer && (
				<pointLight
					color="#4488ff"
					intensity={1.0}
					distance={6}
					position={[0, 1, 0]}
				/>
			)}
		</group>
	);
}

// ─── Main Game Scene ─────────────────────────────────────────────────────────
export default function RaceGame3D({ players, currentUserId }) {
	const curve = useMemo(() => buildTrackCurve(), []);
	const hasCurrentPlayer = players?.some((p) => p.id === currentUserId);

	return (
		<div className="w-full h-[450px] rounded-2xl overflow-hidden border border-borderMain">
			<Canvas
				shadows
				camera={{ position: [-80, 45, 60], fov: 55 }}
				gl={{
					antialias: false,
					powerPreference: "high-performance",
					toneMapping: THREE.ACESFilmicToneMapping,
					toneMappingExposure: 0.6, // Darkened overall scene
				}}
			>
				{/* Post-Processing Bloom */}
				{/* <EffectComposer disableNormalPass>
					<Bloom
						luminanceThreshold={0.5}
						mipmapBlur
						intensity={1.2}
					/>
				</EffectComposer> */}
				<EffectComposer disableNormalPass>
					<Bloom
						luminanceThreshold={0.85} // Increased so only neon lights trigger the bloom
						luminanceSmoothing={0.2}
						intensity={0.8} // Reduced intensity
						mipmapBlur
					/>
				</EffectComposer>

				{/* Environment Setup */}
				<color attach="background" args={["#000000"]} />
				<fogExp2 attach="fog" args={["#ff9d5c", 0.0035]} />

				{/* Sun and Sky */}
				{/* Richer, deeper sunset sky */}
				{/* <Sky
					sunPosition={[50, 5, -50]} // Lowered Y to bring the sun closer to the horizon
					turbidity={10} // Higher dust/haze for a richer atmospheric look
					rayleigh={3.2} // Richer dusk/sunset scatter
					mieCoefficient={0.005}
					mieDirectionalG={0.8}
				/> */}

				<Sky
					sunPosition={[0, 80, -100]}
					turbidity={8}
					rayleigh={1.5}
					mieCoefficient={0.005}
					mieDirectionalG={0.8}
				/>

				{/* Dimmed lighting */}
				<ambientLight color="#4a5e82" intensity={0.5} />
				<directionalLight
					position={[50, 15, -50]}
					intensity={2.0} // Reduced from 3.5 to prevent blowout
					color="#ffaa66" // Warmer sunset tone
					castShadow
					shadow-mapSize-width={2048}
					shadow-mapSize-height={2048}
					shadow-camera-far={300}
					shadow-camera-near={10}
					shadow-camera-left={-120}
					shadow-camera-right={120}
					shadow-camera-top={120}
					shadow-camera-bottom={-120}
				/>
				<Track curve={curve} />

				{players?.map((player, idx) => {
					const isCurrentPlayer = player.id === currentUserId;
					const numLanes = players.length;
					const laneOffset = (idx - (numLanes - 1) / 2) * 2.5;
					return (
						<Car
							key={player.id}
							curve={curve}
							progress={player.progress || 0}
							laneOffset={laneOffset}
							isCurrentPlayer={isCurrentPlayer}
						/>
					);
				})}

				{!hasCurrentPlayer && (
					<OrbitControls
						enableDamping
						dampingFactor={0.05}
						target={[0, 10, 0]}
						maxPolarAngle={Math.PI / 2.05}
					/>
				)}
			</Canvas>
		</div>
	);
}
