import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls, Sky } from "@react-three/drei";
import * as THREE from "three";

// Preload only the car model
useGLTF.preload("/models/f1_bright_red_buggy_v3.glb");

// ─── Track Curve ─────────────────────────────────────────────────────────────
function buildTrackCurve() {
	const points = [];
	const W = 50;
	const D = 22;
	for (let i = 0; i <= 100; i++) {
		const t = i / 100;
		const angle = t * Math.PI * 2;
		points.push(
			new THREE.Vector3(Math.cos(angle) * W, 0, Math.sin(angle) * D),
		);
	}
	return new THREE.CatmullRomCurve3(points, true);
}

// ─── Helper: build a flat ribbon geometry along a curve ──────────────────────
function buildRibbonGeom(curve, numDiv, widthFn, yOffset = 0) {
	const pts = curve.getPoints(numDiv);
	const up = new THREE.Vector3(0, 1, 0);
	const pos = [],
		nrm = [],
		uvs = [],
		idx = [];

	for (let i = 0; i <= numDiv; i++) {
		const t = i / numDiv;
		const p = pts[i % pts.length];
		const tang = curve.getTangentAt(t).normalize();
		const right = new THREE.Vector3().crossVectors(up, tang).normalize();
		const [lw, rw] = widthFn(t);
		const l = p.clone().addScaledVector(right, lw);
		const r = p.clone().addScaledVector(right, rw);
		pos.push(l.x, yOffset, l.z, r.x, yOffset, r.z);
		nrm.push(0, 1, 0, 0, 1, 0);
		uvs.push(t * 20, 0, t * 20, 1);
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

// ─── Track ───────────────────────────────────────────────────────────────────
function Track({ curve }) {
	const TW = 14; // track half-width = 7 each side
	const N = 200;

	const { trackGeom, leftWhite, rightWhite, centerLine, barrierData } =
		useMemo(() => {
			// main asphalt
			const trackGeom = buildRibbonGeom(curve, N, () => [
				-TW / 2,
				TW / 2,
			]);
			// white edge lines (1.5 wide, sitting on inner edge of barrier)
			const leftWhite = buildRibbonGeom(
				curve,
				N,
				() => [-TW / 2, -TW / 2 + 1.5],
				0.01,
			);
			const rightWhite = buildRibbonGeom(
				curve,
				N,
				() => [TW / 2 - 1.5, TW / 2],
				0.01,
			);
			// yellow center line
			const centerLine = buildRibbonGeom(
				curve,
				N,
				() => [-0.2, 0.2],
				0.02,
			);

			// barrier edge points
			const pts = curve.getPoints(N);
			const up = new THREE.Vector3(0, 1, 0);
			const edgeL = [],
				edgeR = [];
			for (let i = 0; i <= N; i++) {
				const t = i / N;
				const p = pts[i % pts.length];
				const tang = curve.getTangentAt(t).normalize();
				const right = new THREE.Vector3()
					.crossVectors(up, tang)
					.normalize();
				edgeL.push(p.clone().addScaledVector(right, -TW / 2));
				edgeR.push(p.clone().addScaledVector(right, TW / 2));
			}
			const barrierData = [];
			[edgeL, edgeR].forEach((edge) => {
				for (let i = 0; i < edge.length - 1; i++) {
					const a = edge[i],
						b = edge[i + 1];
					const mid = new THREE.Vector3()
						.addVectors(a, b)
						.multiplyScalar(0.5);
					const dir = new THREE.Vector3().subVectors(b, a);
					const len = dir.length();
					const angle = Math.atan2(dir.x, dir.z);
					barrierData.push({ pos: [mid.x, 0.4, mid.z], angle, len });
				}
			});
			return {
				trackGeom,
				leftWhite,
				rightWhite,
				centerLine,
				barrierData,
			};
		}, [curve]);

	// Infield oval (uses ShapeGeometry — no JSX ellipseGeometry)
	const infieldGeom = useMemo(() => {
		const shape = new THREE.Shape();
		const rx = 36,
			ry = 9;
		for (let i = 0; i <= 64; i++) {
			const a = (i / 64) * Math.PI * 2;
			const x = Math.cos(a) * rx,
				y = Math.sin(a) * ry;
			if (i === 0) shape.moveTo(x, y);
			else shape.lineTo(x, y);
		}
		return new THREE.ShapeGeometry(shape, 32);
	}, []);

	return (
		<group>
			{/* Desert sand ground */}
			<mesh
				rotation={[-Math.PI / 2, 0, 0]}
				position={[0, -0.05, 0]}
				receiveShadow
			>
				<planeGeometry args={[500, 500]} />
				<meshStandardMaterial color="#c9a466" roughness={0.95} />
			</mesh>

			{/* Asphalt */}
			<mesh geometry={trackGeom} receiveShadow>
				<meshStandardMaterial
					color="#252525"
					roughness={0.88}
					metalness={0.04}
				/>
			</mesh>

			{/* White edge lines */}
			<mesh geometry={leftWhite}>
				<meshStandardMaterial color="#ffffff" roughness={0.4} />
			</mesh>
			<mesh geometry={rightWhite}>
				<meshStandardMaterial color="#ffffff" roughness={0.4} />
			</mesh>

			{/* Yellow center line */}
			<mesh geometry={centerLine}>
				<meshStandardMaterial color="#f5d020" roughness={0.5} />
			</mesh>

			{/* Red/white barriers */}
			{barrierData.map((b, i) => (
				<mesh
					key={i}
					position={b.pos}
					rotation={[0, b.angle, 0]}
					castShadow
				>
					<boxGeometry args={[b.len + 0.05, 0.8, 0.4]} />
					<meshStandardMaterial
						color={i % 6 < 3 ? "#cc2200" : "#eeeeee"}
						roughness={0.4}
					/>
				</mesh>
			))}

			{/* Sandy infield */}
			<mesh
				geometry={infieldGeom}
				rotation={[-Math.PI / 2, 0, 0]}
				position={[0, -0.02, 0]}
			>
				<meshStandardMaterial color="#d4a96a" roughness={0.9} />
			</mesh>

			{/* Start/Finish line (checker-style white) */}
			<mesh
				position={[50, 0.02, 0]}
				rotation={[-Math.PI / 2, 0, Math.PI / 2]}
			>
				<planeGeometry args={[TW, 3]} />
				<meshStandardMaterial color="#ffffff" roughness={0.5} />
			</mesh>

			{/* Cacti */}
			{Array.from({ length: 18 }).map((_, i) => {
				const angle = (i / 18) * Math.PI * 2;
				const r = 85 + (i % 4) * 12;
				return (
					<group
						key={i}
						position={[Math.cos(angle) * r, 0, Math.sin(angle) * r]}
					>
						{/* Trunk */}
						<mesh position={[0, 2.5, 0]} castShadow>
							<cylinderGeometry args={[0.28, 0.35, 5, 7]} />
							<meshStandardMaterial
								color="#3d7240"
								roughness={0.85}
							/>
						</mesh>
						{/* Left arm */}
						<mesh
							position={[-0.85, 3.2, 0]}
							rotation={[0, 0, Math.PI / 3.5]}
							castShadow
						>
							<cylinderGeometry args={[0.18, 0.22, 2, 7]} />
							<meshStandardMaterial
								color="#3d7240"
								roughness={0.85}
							/>
						</mesh>
						{/* Right arm */}
						<mesh
							position={[0.85, 3.8, 0]}
							rotation={[0, 0, -Math.PI / 3.5]}
							castShadow
						>
							<cylinderGeometry args={[0.18, 0.22, 2, 7]} />
							<meshStandardMaterial
								color="#3d7240"
								roughness={0.85}
							/>
						</mesh>
					</group>
				);
			})}

			{/* Low-poly desert buildings */}
			{Array.from({ length: 10 }).map((_, i) => {
				const angle = (i / 10) * Math.PI * 2;
				const r = 108 + (i % 3) * 15;
				const w = 8 + (i % 4) * 3;
				const h = 4 + (i % 5) * 2;
				const d = w * 0.65;
				return (
					<group
						key={i}
						position={[Math.cos(angle) * r, 0, Math.sin(angle) * r]}
						rotation={[0, angle + Math.PI / 4, 0]}
					>
						{/* Main block */}
						<mesh position={[0, h / 2, 0]} castShadow>
							<boxGeometry args={[w, h, d]} />
							<meshStandardMaterial
								color="#e8dece"
								roughness={0.9}
							/>
						</mesh>
						{/* Roof */}
						<mesh position={[0, h + 0.6, 0]} castShadow>
							<boxGeometry args={[w + 0.5, 0.4, d + 0.5]} />
							<meshStandardMaterial
								color="#d0c0a8"
								roughness={0.9}
							/>
						</mesh>
					</group>
				);
			})}

			{/* Tower / landmark at start */}
			<group position={[55, 0, 0]}>
				<mesh position={[0, 5, 0]} castShadow>
					<cylinderGeometry args={[0.6, 0.8, 10, 8]} />
					<meshStandardMaterial color="#d8d0c0" roughness={0.85} />
				</mesh>
				<mesh position={[0, 10.5, 0]} castShadow>
					<cylinderGeometry args={[0.15, 0.15, 2, 6]} />
					<meshStandardMaterial color="#aaaaaa" roughness={0.7} />
				</mesh>
			</group>

			<group position={[50, 0, 0]}>
				<mesh position={[-7.5, 3, 0]} castShadow>
					<boxGeometry args={[0.5, 6, 0.5]} />
					<meshStandardMaterial color="#888888" roughness={0.6} />
				</mesh>
				<mesh position={[7.5, 3, 0]} castShadow>
					<boxGeometry args={[0.5, 6, 0.5]} />
					<meshStandardMaterial color="#888888" roughness={0.6} />
				</mesh>
				<mesh position={[0, 6.2, 0]} castShadow>
					<boxGeometry args={[15, 0.4, 0.5]} />
					<meshStandardMaterial color="#888888" roughness={0.6} />
				</mesh>
			</group>
		</group>
	);
}

// ─── Car ─────────────────────────────────────────────────────────────────────
const BASE_SPEED = 0.012; // laps/sec at idle crawl
const BOOST_SPEED = 0.055; // laps/sec on word typed
const FINISH_SPEED = 0.09; // laps/sec dash to finish line
const IDLE_HALT_SECONDS = 5; // seconds before car stops

function Car({ curve, progress, isCurrentPlayer, laneOffset }) {
	const { camera } = useThree();
	const { scene } = useGLTF("/models/f1_bright_red_buggy_v3.glb");
	const clone = useMemo(() => scene.clone(), [scene]);

	const groupRef = useRef();
	const flameRef = useRef(); // left exhaust flame group
	const flameRef2 = useRef(); // right exhaust flame group
	const flameLightRef = useRef();

	// Auto-movement state
	const autoT = useRef(0);
	const currentSpeed = useRef(BASE_SPEED);
	const boostTimer = useRef(0);
	const prevProgress = useRef(progress);
	const idleTimer = useRef(0); // seconds since last progress change
	const isHalted = useRef(false);
	const isFinished = useRef(false);

	useFrame((_, delta) => {
		if (!groupRef.current) return;

		// ── Progress change detection ─────────────────────────────────────
		if (progress !== prevProgress.current) {
			const diff = progress - prevProgress.current;
			if (diff > 0) {
				// Word typed — boost
				currentSpeed.current = BOOST_SPEED;
				boostTimer.current = 1.0;
				idleTimer.current = 0;
				isHalted.current = false;

				// Race finished: last word typed → drive to finish line (t=1/0)
				if (progress >= 100) {
					isFinished.current = true;
				}
			}
			prevProgress.current = progress;
		}

		// ── Idle halt logic ───────────────────────────────────────────────
		if (!isFinished.current) {
			idleTimer.current += delta;
			if (idleTimer.current >= IDLE_HALT_SECONDS && !isHalted.current) {
				isHalted.current = true;
				currentSpeed.current = 0;
			}
		}

		// ── Speed decay ────────────────────────────────────────────────────
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

		// ── Finish: dash to t=1.0 at FINISH_SPEED ─────────────────────────
		if (isFinished.current) {
			currentSpeed.current = FINISH_SPEED;
			// Stop exactly when we've crossed 1 full lap from wherever we started
			if (autoT.current > 0.99) {
				currentSpeed.current = 0;
				isFinished.current = false; // settled at finish
			}
		}

		// ── Advance along curve ─────────────────────────────────────────────
		autoT.current = (autoT.current + currentSpeed.current * delta) % 1;

		const t = autoT.current;
		const pos = curve.getPointAt(t);
		const tangent = curve.getTangentAt(t).normalize();
		const up = new THREE.Vector3(0, 1, 0);
		const right = new THREE.Vector3().crossVectors(up, tangent).normalize();

		const carPos = pos.clone().addScaledVector(right, laneOffset);
		carPos.y = 0.4;

		groupRef.current.position.lerp(carPos, 0.15);

		// Face direction of travel
		const ahead = carPos.clone().add(tangent);
		const mat = new THREE.Matrix4().lookAt(carPos, ahead, up);
		const targetQuat = new THREE.Quaternion().setFromRotationMatrix(mat);
		groupRef.current.quaternion.slerp(targetQuat, 0.15);

		// ── Boost VFX ──────────────────────────────────────────────────────
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
		if (flameLightRef.current) {
			flameLightRef.current.intensity = isBoosting
				? boostIntensity * 3
				: 0;
		}

		// ── Chase camera ────────────────────────────────────────────────────
		if (isCurrentPlayer) {
			const behind = tangent.clone().multiplyScalar(-5);
			const camPos = carPos.clone().add(behind);
			camPos.y = carPos.y + 2.5;
			camera.position.lerp(camPos, 0.08);

			const lookAhead = tangent.clone().multiplyScalar(8);
			const lookAtPt = carPos.clone().add(lookAhead);
			lookAtPt.y = carPos.y + 0.5;
			camera.lookAt(lookAtPt);
		}
	});

	// Dual exhaust offsets (left & right of rear, matching buggy geometry roughly)
	// After the 135° rotation, "behind" = +Z, left = −X, right = +X in group space
	const exhaustL = [0.35, 0.28, 0.9];
	const exhaustR = [-0.35, 0.28, 0.9];

	return (
		<group ref={groupRef}>
			{/*
              135° = Math.PI - Math.PI/4
              (180° to face forward, then 45° anti-clockwise to match model)
            */}
			<primitive
				object={clone}
				scale={0.6}
				// rotation={[0, Math, 0]}
				rotation={[0, -Math.PI, 0]}
			/>

			{/* Left exhaust flame */}
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

			{/* Right exhaust flame */}
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

			{/* Boost point light between exhausts */}
			<pointLight
				ref={flameLightRef}
				position={[0, 0.3, 1.0]}
				color="#ff6600"
				intensity={0}
				distance={5}
			/>

			{/* Current player blue glow */}
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

export default function RaceGame3D({ players, currentUserId }) {
	const curve = useMemo(() => buildTrackCurve(), []);
	const hasCurrentPlayer = players.some((p) => p.id === currentUserId);

	return (
		<div className="w-full h-[450px] rounded-2xl overflow-hidden border border-borderMain">
			<Canvas
				shadows
				camera={{ position: [-60, 30, 10], fov: 62 }}
				gl={{ antialias: true }}
			>
				{/* Daytime desert sky */}
				<Sky
					sunPosition={[100, 30, 100]}
					turbidity={6}
					rayleigh={1.2}
					mieCoefficient={0.005}
					mieDirectionalG={0.8}
				/>
				<fog attach="fog" args={["#c8daf0", 180, 450]} />

				{/* Lighting */}
				<ambientLight intensity={0.65} />
				<directionalLight
					position={[60, 90, 40]}
					intensity={1.8}
					castShadow
					shadow-mapSize-width={2048}
					shadow-mapSize-height={2048}
					shadow-camera-far={300}
					shadow-camera-left={-120}
					shadow-camera-right={120}
					shadow-camera-top={80}
					shadow-camera-bottom={-80}
				/>
				<hemisphereLight args={["#aacfff", "#c9a466", 0.4]} />

				<Track curve={curve} />

				{players.map((player, idx) => {
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
						minDistance={20}
						maxDistance={250}
						maxPolarAngle={Math.PI / 2.1}
					/>
				)}
			</Canvas>
		</div>
	);
}
