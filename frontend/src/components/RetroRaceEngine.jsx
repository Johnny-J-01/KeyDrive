import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * RetroRaceEngine — Three.js OutRun-style driving visualizer
 *
 * CAMERA: sits at (0, 4, 0), rotated -8° around X to look slightly downward
 *         along the -Z axis (Three.js default look direction).
 *
 * ROAD:   PlaneGeometry quads at y=0, positioned at NEGATIVE Z values.
 *         A pool of VISIBLE quads scrolls toward the camera each frame.
 *         When a quad passes z=0 (behind camera), it recycles to the back.
 *
 * NO KEYBOARD EVENTS are used — zero Phaser, zero event stealing.
 *         Typing input in RaceGame.jsx works perfectly including spacebar.
 */

// ── Colors ────────────────────────────────────────────────────────────────
const GR_A = new THREE.Color(0x4a9e35); // grass light
const GR_B = new THREE.Color(0x3a7b27); // grass dark
const RD_A = new THREE.Color(0x8e8e8e); // road light
const RD_B = new THREE.Color(0x7a7a7a); // road dark
const RB_W = new THREE.Color(0xfafafa); // rumble white
const RB_R = new THREE.Color(0xcc1515); // rumble red
const LN_W = new THREE.Color(0xe0e0e0); // lane marker visible
const LN_H = new THREE.Color(0x8e8e8e); // lane marker hidden (= road)

// ── Scene geometry constants ──────────────────────────────────────────────
const CAMERA_H = 10; // camera height above road (y)
const CAM_TILT = -0.55; // camera X rotation (radians) — look down ~8°
const FOV = 65; // perspective field of view

const ROAD_HW = 4.2; // road half-width (full = 8.4 units)
const RUMBLE_W = 0.65; // rumble strip width
const LANE_MW = 0.14; // lane marker half-width
const GRASS_HW = 55; // grass half-width (covers screen edges)

const SEG_D = 1.0; // segment depth in world units
const VISIBLE = 155; // segments in pool (draw distance)
const ALT_SEGS = 5; // segments per color stripe

const TREE_PAIRS = 22; // tree pairs (left + right)
const TREE_GAP = 6.5; // world-unit spacing between tree rows
const TREE_SIDE_X = 7.0; // x offset of tree from road edge

const MAX_SPD = 3.2; // max scroll speed (world-units/frame at 60fps)
const NPC_COUNT = 5;

// ── Curve layout
function curveAt(n) {
	const i = ((n % 600) + 600) % 600;
	if (i < 60) return 0;
	if (i < 130) return 0.02;
	if (i < 180) return 0;
	if (i < 260) return -0.026;
	if (i < 310) return 0;
	if (i < 390) return 0.028;
	if (i < 440) return 0;
	if (i < 520) return -0.022;
	return 0;
}

function makeQuad(scene, w, color) {
	const geo = new THREE.PlaneGeometry(w, SEG_D);
	const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
	const mesh = new THREE.Mesh(geo, mat);
	mesh.rotation.x = -Math.PI / 2;
	scene.add(mesh);
	return mesh;
}

function makeCar(scene, bodyHex, cabinHex) {
	const g = new THREE.Group();

	const bodyMat = new THREE.MeshLambertMaterial({ color: bodyHex });
	const cabinMat = new THREE.MeshLambertMaterial({ color: cabinHex });
	const glassMat = new THREE.MeshLambertMaterial({
		color: 0x7ab4cc,
		transparent: true,
		opacity: 0.75,
	});
	const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

	const body = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.3, 8.5), bodyMat);
	body.position.y = 0.8;
	g.add(body);

	const cabin = new THREE.Mesh(
		new THREE.BoxGeometry(4.0, 1.1, 4.8),
		cabinMat,
	);
	cabin.position.set(0, 1.95, -0.4);
	g.add(cabin);

	const wf = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.95, 0.08), glassMat);
	wf.position.set(0, 1.95, 2.0);
	g.add(wf);
	const wr = wf.clone();
	wr.position.set(0, 1.95, -2.85);
	g.add(wr);

	const wGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.5, 10);
	[
		[-2.6, 0.65, 2.9],
		[2.6, 0.65, 2.9],
		[-2.6, 0.65, -2.9],
		[2.6, 0.65, -2.9],
	].forEach(([x, y, z]) => {
		const w = new THREE.Mesh(wGeo, wheelMat);
		w.rotation.z = Math.PI / 2;
		w.position.set(x, y, z);
		g.add(w);
	});

	scene.add(g);
	return g;
}

function makeTree(scene) {
	const g = new THREE.Group();

	const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5c3410 });
	const trunk = new THREE.Mesh(
		new THREE.CylinderGeometry(0.14, 0.2, 1.1, 6),
		trunkMat,
	);
	trunk.position.y = 0.55;
	g.add(trunk);

	[
		{ r: 1.5, h: 2.3, y: 1.95, c: 0x1d4d1d },
		{ r: 1.2, h: 2.0, y: 3.1, c: 0x2e7e2e },
		{ r: 0.8, h: 1.7, y: 4.1, c: 0x3ea03e },
	].forEach(({ r, h, y, c }) => {
		const cone = new THREE.Mesh(
			new THREE.ConeGeometry(r, h, 8),
			new THREE.MeshLambertMaterial({ color: c }),
		);
		cone.position.y = y;
		g.add(cone);
	});

	scene.add(g);
	return g;
}

export default function RetroRaceEngine({
	players = [],
	currentUserId,
	wpm = 0,
	errorStreak = false,
}) {
	const mountRef = useRef(null);
	const hudRef = useRef(null);
	const rafRef = useRef(null);

	const wpmRef = useRef(wpm);
	const playersRef = useRef(players);
	const errorRef = useRef(errorStreak);
	const uidRef = useRef(currentUserId);

	useEffect(() => {
		wpmRef.current = wpm;
	}, [wpm]);
	useEffect(() => {
		playersRef.current = players;
	}, [players]);
	useEffect(() => {
		errorRef.current = errorStreak;
	}, [errorStreak]);
	useEffect(() => {
		uidRef.current = currentUserId;
	}, [currentUserId]);

	useEffect(() => {
		const container = mountRef.current;
		const hudCanvas = hudRef.current;
		if (!container) return;

		const W = container.clientWidth || 900;
		const H = container.clientHeight || 500;
		const renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(W, H);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.setClearColor(0x5fc8f5);
		container.appendChild(renderer.domElement);

		const scene = new THREE.Scene();
		scene.fog = new THREE.Fog(0x88c8f0, 90, 200);

		// ── Camera ────────────────────────────────────────────────────────────
		// Camera sits at (0, CAMERA_H, 0), looking in -Z with slight down-tilt.
		// All road geometry MUST be at NEGATIVE Z to be in front of camera.
		const camera = new THREE.PerspectiveCamera(FOV, W / H, 0.1, 400);
		camera.position.set(0, CAMERA_H, 0);
		camera.rotation.x = CAM_TILT; // -8° downward tilt to see road

		// ── Lighting ──────────────────────────────────────────────────────────
		scene.add(new THREE.AmbientLight(0xffffff, 0.75));
		const sun = new THREE.DirectionalLight(0xfffbe0, 1.1);
		sun.position.set(40, 80, 30);
		scene.add(sun);

		// ── Sky (shader gradient sphere, follows camera) ───────────────────────
		const skyMesh = (() => {
			const geo = new THREE.SphereGeometry(350, 16, 8);
			const mat = new THREE.ShaderMaterial({
				side: THREE.BackSide,
				uniforms: {
					top: { value: new THREE.Color(0x1a6fa8) },
					bot: { value: new THREE.Color(0x5fc8f5) },
				},
				vertexShader: `
          varying float vY;
          void main() {
            vY = normalize(position).y;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
				fragmentShader: `
          uniform vec3 top; uniform vec3 bot;
          varying float vY;
          void main() {
            float t = clamp((vY + 0.05) * 5.0, 0.0, 1.0);
            gl_FragColor = vec4(mix(bot, top, t), 1.0);
          }
        `,
			});
			const m = new THREE.Mesh(geo, mat);
			scene.add(m);
			return m;
		})();

		// ── Mountain silhouettes ────────────────────────────────────────────
		{
			const mMat = new THREE.MeshBasicMaterial({ color: 0x6b8aaa });
			for (let m = 0; m < 16; m++) {
				const ang = (m / 16) * Math.PI * 2;
				const r = 150 + (m % 4) * 15;
				const mw = 18 + (m % 5) * 9;
				const mh = 10 + (m % 6) * 7;
				const cone = new THREE.Mesh(
					new THREE.ConeGeometry(mw / 2, mh, 5),
					mMat,
				);
				cone.position.set(
					Math.cos(ang) * r,
					mh / 2 - 4,
					Math.sin(ang) * r,
				);
				scene.add(cone);
			}
		}

		{
			const bigGrassMat = new THREE.MeshBasicMaterial({ color: GR_A });
			const bigGrass = new THREE.Mesh(
				new THREE.PlaneGeometry(600, 600),
				bigGrassMat,
			);
			bigGrass.rotation.x = -Math.PI / 2;
			bigGrass.position.y = -0.01; // slightly below road so road is on top
			scene.add(bigGrass);
		}

		const pool = [];
		let altCounter = 0;

		for (let i = 0; i < VISIBLE; i++) {
			const z = -(i + 0.5) * SEG_D; // NEGATIVE Z: in front of camera
			const alt = Math.floor(i / ALT_SEGS) % 2 === 0;

			const seg = {
				z,
				alt,
				altIdx: Math.floor(i / ALT_SEGS),
				road: makeQuad(scene, ROAD_HW * 2, alt ? RD_A : RD_B),
				grassL: makeQuad(scene, GRASS_HW * 2, alt ? GR_A : GR_B),
				grassR: makeQuad(scene, GRASS_HW * 2, alt ? GR_A : GR_B),
				rumbleL: makeQuad(scene, RUMBLE_W, alt ? RB_W : RB_R),
				rumbleR: makeQuad(scene, RUMBLE_W, alt ? RB_W : RB_R),
				lane1: makeQuad(scene, LANE_MW * 2, alt ? LN_W : LN_H),
				lane2: makeQuad(scene, LANE_MW * 2, alt ? LN_W : LN_H),
			};

			const place = (mesh, xOff) => {
				mesh.position.set(xOff, 0, z);
			};
			place(seg.road, 0);
			place(seg.grassL, -(ROAD_HW + GRASS_HW));
			place(seg.grassR, ROAD_HW + GRASS_HW);
			place(seg.rumbleL, -(ROAD_HW - RUMBLE_W / 2));
			place(seg.rumbleR, ROAD_HW - RUMBLE_W / 2);
			place(seg.lane1, -ROAD_HW / 3);
			place(seg.lane2, ROAD_HW / 3);

			pool.push(seg);
		}

		// ── Trees ─────────────────────────────────────────────────────────────
		const treeObjects = [];
		for (let t = 0; t < TREE_PAIRS; t++) {
			const tz = -(t * TREE_GAP + TREE_GAP / 2);
			const xOff = ROAD_HW + TREE_SIDE_X + Math.random() * 1.5;
			const scl = 0.65 + Math.random() * 0.35;

			const tL = makeTree(scene);
			tL.position.set(-xOff, 0, tz);
			tL.scale.setScalar(scl);

			const tR = makeTree(scene);
			tR.position.set(xOff, 0, tz);
			tR.scale.setScalar(scl);

			treeObjects.push(
				{ group: tL, baseX: -xOff },
				{ group: tR, baseX: xOff },
			);
		}
		const treeCycleZ = TREE_PAIRS * TREE_GAP;

		// ── Player car (fixed in front of camera) ─────────────────────────────
		const playerCar = makeCar(scene, 0xf0f0f0, 0xcccccc);
		playerCar.position.set(0, 0, -6); // 6 units ahead of camera, on road
		playerCar.scale.setScalar(0.52);

		// ── NPC / traffic cars ────────────────────────────────────────────────
		const npcDefs = [
			{ bc: 0xdd2222, cc: 0x991111, z: -32, lane: -ROAD_HW * 0.4 },
			{ bc: 0x2255cc, cc: 0x1133aa, z: -55, lane: ROAD_HW * 0.4 },
			{ bc: 0xddaa00, cc: 0x997700, z: -80, lane: 0 },
			{ bc: 0x22aa44, cc: 0x116622, z: -48, lane: -ROAD_HW * 0.4 },
			{ bc: 0xaa22aa, cc: 0x771177, z: -95, lane: ROAD_HW * 0.4 },
		];
		const npcCars = npcDefs.map((d) => {
			const car = makeCar(scene, d.bc, d.cc);
			car.position.set(d.lane, 0, d.z);
			car.scale.setScalar(0.52);
			return { car, lane: d.lane, spdMul: 0.55 + Math.random() * 0.35 };
		});

		// ── HUD 2D canvas ─────────────────────────────────────────────────────
		const hctx = hudCanvas?.getContext("2d");
		if (hudCanvas) {
			hudCanvas.width = W;
			hudCanvas.height = H;
		}

		function drawHUD() {
			if (!hctx) return;
			hctx.clearRect(0, 0, W, H);

			const ps = playersRef.current;
			const me = ps.find((p) => p.id === uidRef.current) || {};
			const ranked = [...ps].sort(
				(a, b) => (b.progress || 0) - (a.progress || 0),
			);
			const myRank =
				ranked.findIndex((p) => p.id === uidRef.current) + 1 || 1;

			// Radar panel
			const rx = 14,
				ry = 14,
				rw = 190,
				rh = 106;
			hctx.fillStyle = "rgba(0,0,0,0.72)";
			hctx.beginPath();
			hctx.roundRect(rx, ry, rw, rh, 9);
			hctx.fill();
			hctx.strokeStyle = "rgba(255,255,255,0.22)";
			hctx.lineWidth = 1.2;
			hctx.stroke();

			hctx.font = "bold 10px monospace";
			hctx.fillStyle = "#bbb";
			hctx.fillText("RADAR", rx + 10, ry + 16);
			hctx.textAlign = "right";
			hctx.fillText(`P${myRank}/${ps.length || 1}`, rx + rw - 8, ry + 16);
			hctx.textAlign = "left";

			const bx = rx + 10,
				by = ry + 26,
				bw = rw - 20,
				bh = 11;
			hctx.fillStyle = "#2a2a2a";
			hctx.beginPath();
			hctx.roundRect(bx, by, bw, bh, 5);
			hctx.fill();

			hctx.fillStyle = "#ffcc00";
			hctx.fillRect(bx + bw - 2, by - 4, 2, bh + 8);

			ps.forEach((p) => {
				const pct = Math.min(1, Math.max(0, (p.progress || 0) / 100));
				const isMe = p.id === uidRef.current;
				hctx.beginPath();
				hctx.arc(
					bx + pct * bw,
					by + bh / 2,
					isMe ? 6 : 4,
					0,
					Math.PI * 2,
				);
				hctx.fillStyle = isMe ? "#fff" : "#ee4444";
				hctx.fill();
				if (isMe) {
					hctx.strokeStyle = "#66ccff";
					hctx.lineWidth = 1.5;
					hctx.stroke();
				}
			});

			ranked.slice(0, 4).forEach((p, i) => {
				const isMe = p.id === uidRef.current;
				hctx.font = isMe ? "bold 11px monospace" : "11px monospace";
				hctx.fillStyle = isMe ? "#fff" : "#aaa";
				const name = isMe ? "YOU" : p.username || `P${i + 2}`;
				hctx.fillText(
					`${i + 1}. ${name}`,
					rx + 10,
					by + bh + 16 + i * 15,
				);
				hctx.textAlign = "right";
				hctx.fillText(
					`${Math.round(p.progress || 0)}%`,
					rx + rw - 8,
					by + bh + 16 + i * 15,
				);
				hctx.textAlign = "left";
			});

			// Speed panel
			const sx = W - 112,
				sy = 14,
				sw = 100,
				sh = 68;
			hctx.fillStyle = "rgba(0,0,0,0.72)";
			hctx.beginPath();
			hctx.roundRect(sx, sy, sw, sh, 9);
			hctx.fill();
			hctx.strokeStyle = "rgba(255,255,255,0.22)";
			hctx.lineWidth = 1.2;
			hctx.stroke();

			hctx.textAlign = "center";
			hctx.font = "bold 10px monospace";
			hctx.fillStyle = "#999";
			hctx.fillText("SPEED", sx + sw / 2, sy + 17);
			hctx.font = "bold 27px monospace";
			hctx.fillStyle = "#fff";
			hctx.fillText(
				String(me.wpm || wpmRef.current || 0),
				sx + sw / 2,
				sy + 46,
			);
			hctx.font = "bold 9px monospace";
			hctx.fillStyle = "#88aaff";
			hctx.fillText("WPM", sx + sw / 2, sy + 59);

			const sfx = sx + 10,
				sfy = sy + 63,
				sfw = sw - 20;
			const spPct = Math.min(1, (state.speed || 0) / MAX_SPD);
			hctx.fillStyle = "#222";
			hctx.fillRect(sfx, sfy, sfw, 5);
			hctx.fillStyle =
				spPct > 0.75 ? "#ff4444" : spPct > 0.4 ? "#ffaa00" : "#44cc44";
			hctx.fillRect(sfx, sfy, sfw * spPct, 5);
			hctx.textAlign = "left";
		}

		// ── Animation state ───────────────────────────────────────────────────
		const state = { speed: 0, scrollN: 0, cameraX: 0, carBank: 0 };

		// ── Animation loop ────────────────────────────────────────────────────
		let lastTime = performance.now();
		let recycleAlt = VISIBLE;

		function animate(now) {
			rafRef.current = requestAnimationFrame(animate);
			const dt = Math.min((now - lastTime) / 1000, 0.05);
			lastTime = now;

			// Speed from WPM
			const targetSpd = Math.min(MAX_SPD, (wpmRef.current || 0) * 0.033);
			state.speed += (targetSpd - state.speed) * 0.06;
			const dz = state.speed * 60 * dt; // world units to advance this frame

			state.scrollN += dz / SEG_D; // virtual segment index (for curve lookup)

			// Sky follows camera so it always fills the background
			skyMesh.position.copy(camera.position);

			// Current curve value
			const curve = curveAt(Math.floor(state.scrollN));

			// Camera X lean (smooth) — leans into curves
			const targetCamX = curve * 28;
			state.cameraX += (targetCamX - state.cameraX) * 0.08;
			camera.position.x += (-camera.position.x + state.cameraX) * 0.12;

			// Player car banks opposite to curve
			state.carBank += (-curve * 7 - state.carBank) * 0.1;
			playerCar.rotation.z = state.carBank * (Math.PI / 180);
			// Also follow camera X slightly
			playerCar.position.x = state.cameraX * 0.08;

			// ── Road segment treadmill ─────────────────────────────────────
			let cumCurve = 0;
			pool.forEach((seg) => {
				seg.z += dz; // move toward camera (+Z direction = toward cam)

				if (seg.z > 0) {
					// Recycle to back (far end, negative Z)
					seg.z -= VISIBLE * SEG_D;
					const newAlt = Math.floor(recycleAlt / ALT_SEGS) % 2 === 0;
					recycleAlt++;
					seg.alt = newAlt;
					seg.road.material.color.copy(newAlt ? RD_A : RD_B);
					seg.grassL.material.color.copy(newAlt ? GR_A : GR_B);
					seg.grassR.material.color.copy(newAlt ? GR_A : GR_B);
					seg.rumbleL.material.color.copy(newAlt ? RB_W : RB_R);
					seg.rumbleR.material.color.copy(newAlt ? RB_W : RB_R);
					seg.lane1.material.color.copy(newAlt ? LN_W : LN_H);
					seg.lane2.material.color.copy(newAlt ? LN_W : LN_H);
				}

				// Curve X offset — accumulates more for distant segments
				const dist = -seg.z; // positive = distance ahead
				const xOff = dist > 0 ? curve * dist * dist * 0.0018 : 0;

				const pos = (mesh, baseX) => {
					mesh.position.x = baseX + xOff;
					mesh.position.z = seg.z;
					mesh.visible = seg.z < -0.2;
				};
				pos(seg.road, 0);
				pos(seg.grassL, -(ROAD_HW + GRASS_HW));
				pos(seg.grassR, ROAD_HW + GRASS_HW);
				pos(seg.rumbleL, -(ROAD_HW - RUMBLE_W / 2));
				pos(seg.rumbleR, ROAD_HW - RUMBLE_W / 2);
				pos(seg.lane1, -ROAD_HW / 3);
				pos(seg.lane2, ROAD_HW / 3);
			});

			// ── Trees ──────────────────────────────────────────────────────
			treeObjects.forEach((t) => {
				t.group.position.z += dz;
				// Recycle tree to far end when it passes camera
				if (t.group.position.z > 3) {
					t.group.position.z -= treeCycleZ;
				}
				t.group.visible =
					t.group.position.z < -2 && t.group.position.z > -180;
			});

			// ── NPC cars ───────────────────────────────────────────────────
			npcCars.forEach((npc) => {
				npc.car.position.z += dz * npc.spdMul;
				if (npc.car.position.z > -5) npc.car.position.z -= 180;
				npc.car.visible =
					npc.car.position.z < -8 && npc.car.position.z > -180;
			});

			// ── Multiplayer rivals: sync progress to NPC cars ──────────────
			const rivals = playersRef.current.filter(
				(p) => p.id !== uidRef.current,
			);
			rivals.forEach((rp, ri) => {
				if (ri >= npcCars.length) return;
				const prog = Math.min(1, Math.max(0, (rp.progress || 0) / 100));
				// Map 0-1 progress to a Z position ahead of camera (near=5, far=140)
				npcCars[ri].car.position.z = -(5 + prog * 135);
			});

			renderer.render(scene, camera);
			drawHUD();
		}

		rafRef.current = requestAnimationFrame(animate);

		// ── Resize ────────────────────────────────────────────────────────
		const onResize = () => {
			const nw = container.clientWidth;
			const nh = container.clientHeight;
			camera.aspect = nw / nh;
			camera.updateProjectionMatrix();
			renderer.setSize(nw, nh);
			if (hudCanvas) {
				hudCanvas.width = nw;
				hudCanvas.height = nh;
			}
		};
		window.addEventListener("resize", onResize);

		return () => {
			cancelAnimationFrame(rafRef.current);
			window.removeEventListener("resize", onResize);
			renderer.dispose();
			if (container.contains(renderer.domElement))
				container.removeChild(renderer.domElement);
		};
	}, []); // runs once — all live state via refs

	return (
		<div
			className="relative w-full select-none overflow-hidden rounded-2xl shadow-2xl border border-borderMain"
			style={{ height: 500 }}
		>
			{/* Three.js WebGL canvas */}
			<div ref={mountRef} className="absolute inset-0 w-full h-full" />

			{/* 2D HUD overlay — pointer-events none so typing input is unaffected */}
			<canvas
				ref={hudRef}
				className="absolute inset-0 pointer-events-none"
				style={{ width: "100%", height: "100%" }}
			/>
		</div>
	);
}
