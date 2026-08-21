import { useState, useRef, useEffect } from "react";
import {
	Users,
	Plus,
	Lock,
	Globe,
	X,
	KeyRound,
	ChevronRight,
} from "lucide-react";
import RoomLobby from "../pages/RoomLobby";
import { toast } from "sonner";
import LiveRace from "./LiveRace";

export default function Race() {
	// TEmp hardcoded rooms (in dev);
	const [rooms, setRooms] = useState([]);
	const [userData, setUserData] = useState({
		id: `${crypto.randomUUID()}`,
		username: "guest",
	});
	const [activeRoom, setActiveRoom] = useState(null);
	const [gameStarted, setGameStarted] = useState(false);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [showJoinModal, setShowJoinModal] = useState(false);
	const socketRef = useRef(null);
	const [isLoading, setIsLoading] = useState(true);

	// fetch user data on component mount
	useEffect(() => {
		const fetchUserData = async () => {
			try {
				const response = await fetch("http://localhost:3000/profile", {
					method: "GET",
					credentials: "include",
				});
				if (!response.ok) {
					toast.error("Guest Account");
					console.log("Guest data: ", userData);
					return;
				}
				const loggedInUserData = await response.json();
				console.log(
					"Fetched user data:",
					loggedInUserData.data.rows[0],
				);
				setUserData({
					id: loggedInUserData.data.rows[0].id,
					username: loggedInUserData.data.rows[0].username,
				});
			} catch (error) {
				toast.error("Error fetching user data");
			} finally {
				setIsLoading(false);
			}
		};

		fetchUserData();
	}, []);

	// WebSocket connection and event handling
	useEffect(() => {
		const socket = new WebSocket("ws://localhost:3000");
		console.log("connected to websocket server");
		socketRef.current = socket;

		socket.onopen = () => {
			socket.send(JSON.stringify({ type: "room:list" }));
		};

		socket.onmessage = (event) => {
			const message = JSON.parse(event.data);
			if (message.type === "room:list") {
				setRooms(message.payload);
			}
			if (message.type === "room:created") {
				setRooms((currentRooms) => [...currentRooms, message.payload]);
			}
			if (message.type === "room:deleted") {
				setRooms((currentRooms) =>
					currentRooms.filter((room) => room.id !== message.payload),
				);
				setActiveRoom(null);
			}
			if (message.type === "room:joined") {
				setActiveRoom(message.payload);
			}
			if (message.type === "room:join:error") {
				toast.error(message.payload);
			}
			if (message.type === "room:left") {
				setActiveRoom(null);
			}
			if (message.type === "room:updated") {
				setActiveRoom(message.payload);
			}
			if (message.type === "room:start") {
				setActiveRoom(message.payload);
				setGameStarted(true);
				return;
			}
		};

		return () => {
			socket.close();
			socketRef.current = null;
		};
	}, []);

	const handleCreateRoom = (roomData) => {
		const newRoom = {
			id: generateRoomCode(),
			name: roomData.name,
			type: roomData.type,
			status: "waiting",
			playerCount: 1,
			capacity: roomData.capacity,
			password: roomData.password,
			adminId: userData.id,
			players: [
				{
					id: userData.id,
					username: userData.username,
				},
			],
		};

		setShowCreateModal(false);
		socketRef.current?.send(
			JSON.stringify({
				type: "room:create",
				payload: newRoom,
			}),
		);
		setActiveRoom(newRoom);
	};

	const handleJoinPublicRoom = (room) => {
		if (room.playerCount >= room.capacity) {
			toast.message("This room is full.");
			return;
		}

		const updatedRoom = {
			...room,
			playerCount: room.playerCount + 1,
			players: [
				...(room.players || []),
				{
					id: userData.id,
					username: userData.username,
				},
			],
		};

		socketRef.current?.send(
			JSON.stringify({
				type: "room:join",
				payload: { roomId: room.id, user: userData },
			}),
		);
	};

	const handleJoinPrivateRoom = (roomCode, roomPassword) => {
		const room = rooms.find(
			(currentRoom) =>
				currentRoom.id.toLowerCase() === roomCode.toLowerCase(),
		);

		if (!room) {
			return {
				success: false,
				message: "Room not found.",
			};
		}

		if (room.type !== "private") {
			return {
				success: false,
				message: "This is not a private room.",
			};
		}

		if (room.playerCount >= room.capacity) {
			return {
				success: false,
				message: "This room is full.",
			};
		}

		const updatedRoom = {
			...room,
			playerCount: room.playerCount + 1,
			players: [
				...(room.players || []),
				{
					id: userData.id,
					username: userData.username,
				},
			],
		};

		socketRef.current?.send(
			JSON.stringify({
				type: "room:join",
				payload: {
					roomId: room.id,
					user: userData,
					password: roomPassword,
				},
			}),
		);
	};

	const handleLeaveRoom = () => {
		if (activeRoom) {
			socketRef.current?.send(
				JSON.stringify({
					type: "room:leave",
					payload: {
						roomId: activeRoom.id,
						userData: userData,
					},
				}),
			);
		}
	};

	const handleDeleteRoom = () => {
		if (!activeRoom || activeRoom.adminId !== userData.id) return;

		socketRef.current?.send(
			JSON.stringify({
				type: "room:delete",
				payload: {
					roomId: activeRoom.id,
					userData: userData,
				},
			}),
		);
		setActiveRoom(null);
	};

	if (activeRoom) {
		if (gameStarted) {
			return (
				<LiveRace
					room={activeRoom}
					userData={userData}
					socketRef={socketRef}
				/>
			);
		}

		return (
			<RoomLobby
				socketRef={socketRef}
				room={activeRoom}
				userData={userData}
				onLeave={handleLeaveRoom}
				onDelete={handleDeleteRoom}
			/>
		);
	}

	return (
		<>
			<div className="max-w-5xl mx-auto py-8 px-4 flex flex-col gap-8">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
					<div>
						<h1 className="text-4xl font-bold text-white mb-2">
							Race Rooms
						</h1>

						<p className="text-textMuted">
							Join a public race or create a private room for your
							friends.
						</p>
					</div>

					<div className="flex gap-3">
						<button
							onClick={() => setShowJoinModal(true)}
							className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-borderMain text-white font-semibold hover:bg-surface transition-colors"
						>
							<KeyRound className="w-4 h-4" />
							Join Private
						</button>

						<button
							onClick={() => setShowCreateModal(true)}
							className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
						>
							<Plus className="w-4 h-4" />
							Create Room
						</button>
					</div>
				</div>

				<section className="flex flex-col gap-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Globe className="w-5 h-5 text-primary" />

							<h2 className="text-xl font-bold text-white">
								Public Rooms
							</h2>
						</div>

						<span className="text-sm text-textMuted">
							{
								rooms.filter((room) => room.type === "public")
									.length
							}{" "}
							rooms
						</span>
					</div>

					{rooms.filter((room) => room.type === "public").length ===
					0 ? (
						<div className="bg-surface border border-borderMain rounded-xl p-10 text-center">
							<Users className="w-10 h-10 text-textMuted mx-auto mb-4" />

							<h3 className="text-lg font-semibold text-white mb-1">
								No public rooms available
							</h3>

							<p className="text-textMuted text-sm">
								Create a room and start a race with other
								players.
							</p>
						</div>
					) : (
						<div className="grid gap-3">
							{rooms
								.filter((room) => room.type === "public")
								.map((room) => (
									<RoomCard
										key={room.id}
										room={room}
										onJoin={handleJoinPublicRoom}
									/>
								))}
						</div>
					)}
				</section>
			</div>

			{showCreateModal && (
				<CreateRoomModal
					onClose={() => setShowCreateModal(false)}
					onCreate={handleCreateRoom}
				/>
			)}

			{showJoinModal && (
				<JoinPrivateRoomModal
					onClose={() => setShowJoinModal(false)}
					onJoin={handleJoinPrivateRoom}
				/>
			)}
		</>
	);
}

function RoomCard({ room, onJoin }) {
	const isFull = room.playerCount >= room.capacity;
	const isRunning = room.status === "running";

	return (
		<div className="bg-surface border border-borderMain rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 hover:border-primary/40 transition-colors">
			<div className="flex items-center gap-4">
				<div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
					<Globe className="w-5 h-5 text-primary" />
				</div>

				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-3">
						<span className="font-semibold text-white">
							{room.name}
						</span>

						<RoomStatus status={room.status} />
					</div>

					<div className="flex items-center gap-3 text-sm text-textMuted">
						<span className="font-mono">#{room.id}</span>

						<span>•</span>

						<div className="flex items-center gap-1">
							<Users className="w-4 h-4" />
							{room.playerCount} / {room.capacity}
						</div>
					</div>
				</div>
			</div>

			<button
				onClick={() => onJoin(room)}
				disabled={isFull || isRunning}
				className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
			>
				{isRunning ? "In Progress" : isFull ? "Room Full" : "Join Room"}

				{!isRunning && !isFull && <ChevronRight className="w-4 h-4" />}
			</button>
		</div>
	);
}

function RoomStatus({ status }) {
	if (status === "waiting") {
		return (
			<span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">
				Waiting
			</span>
		);
	}

	if (status === "starting") {
		return (
			<span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400">
				Starting
			</span>
		);
	}

	if (status === "running") {
		return (
			<span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400">
				In Progress
			</span>
		);
	}

	return null;
}

function CreateRoomModal({ onClose, onCreate }) {
	const [roomType, setRoomType] = useState("public");
	const [roomName, setRoomName] = useState("");
	const [capacity, setCapacity] = useState(5);
	const [password, setPassword] = useState("");

	const handleSubmit = (event) => {
		event.preventDefault();

		if (!roomName.trim()) {
			return;
		}

		if (roomType === "private" && !password.trim()) {
			return;
		}

		onCreate({
			name: roomName.trim(),
			type: roomType,
			capacity: Number(capacity),
			password: roomType === "private" ? password : null,
		});
	};

	return (
		<Modal onClose={onClose}>
			<div className="mb-6">
				<h2 className="text-2xl font-bold text-white">Create Room</h2>

				<p className="text-sm text-textMuted mt-1">
					Create a room and invite other players to race.
				</p>
			</div>

			<form onSubmit={handleSubmit} className="flex flex-col gap-6">
				<div>
					<label className="text-sm font-medium text-white mb-2 block">
						Room Name
					</label>

					<input
						type="text"
						value={roomName}
						onChange={(event) => setRoomName(event.target.value)}
						placeholder="e.g. Friday Night Race"
						maxLength={40}
						className="w-full px-4 py-3 rounded-lg bg-surface border border-borderMain text-white placeholder:text-textMuted outline-none focus:border-primary"
					/>
				</div>

				<div>
					<label className="text-sm font-medium text-white mb-3 block">
						Room Type
					</label>

					<div className="grid grid-cols-2 gap-3">
						<button
							type="button"
							onClick={() => setRoomType("public")}
							className={`p-4 rounded-lg border text-left transition-colors ${
								roomType === "public"
									? "border-primary bg-primary/10"
									: "border-borderMain bg-surface hover:border-primary/40"
							}`}
						>
							<Globe
								className={`w-5 h-5 mb-2 ${
									roomType === "public"
										? "text-primary"
										: "text-textMuted"
								}`}
							/>

							<div className="font-semibold text-white">
								Public
							</div>

							<div className="text-xs text-textMuted mt-1">
								Anyone can join.
							</div>
						</button>

						<button
							type="button"
							onClick={() => setRoomType("private")}
							className={`p-4 rounded-lg border text-left transition-colors ${
								roomType === "private"
									? "border-primary bg-primary/10"
									: "border-borderMain bg-surface hover:border-primary/40"
							}`}
						>
							<Lock
								className={`w-5 h-5 mb-2 ${
									roomType === "private"
										? "text-primary"
										: "text-textMuted"
								}`}
							/>

							<div className="font-semibold text-white">
								Private
							</div>

							<div className="text-xs text-textMuted mt-1">
								Password protected.
							</div>
						</button>
					</div>
				</div>

				<div>
					<label className="text-sm font-medium text-white mb-2 block">
						Player Capacity
					</label>

					<select
						value={capacity}
						onChange={(event) => setCapacity(event.target.value)}
						className="w-full px-4 py-3 rounded-lg bg-surface border border-borderMain text-white outline-none focus:border-primary"
					>
						<option value={2}>2 Players</option>
						<option value={3}>3 Players</option>
						<option value={4}>4 Players</option>
						<option value={5}>5 Players</option>
					</select>
				</div>

				{roomType === "private" && (
					<div>
						<label className="text-sm font-medium text-white mb-2 block">
							Room Password
						</label>

						<input
							type="password"
							value={password}
							onChange={(event) =>
								setPassword(event.target.value)
							}
							placeholder="Enter a password"
							className="w-full px-4 py-3 rounded-lg bg-surface border border-borderMain text-white placeholder:text-textMuted outline-none focus:border-primary"
						/>
					</div>
				)}

				<div className="flex gap-3 pt-2">
					<button
						type="button"
						onClick={onClose}
						className="flex-1 px-4 py-3 rounded-lg border border-borderMain text-white font-semibold hover:bg-surface transition-colors"
					>
						Cancel
					</button>

					<button
						type="submit"
						className="flex-1 px-4 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
					>
						Create Room
					</button>
				</div>
			</form>
		</Modal>
	);
}

function JoinPrivateRoomModal({ onClose, onJoin }) {
	const [roomCode, setRoomCode] = useState("");
	const [roomPassword, setRoomPassword] = useState("");
	const [error, setError] = useState("");

	const handleSubmit = (event) => {
		event.preventDefault();

		if (!roomCode.trim()) {
			setError("Please enter a room code.");
			return;
		}

		const result = onJoin(roomCode.trim(), roomPassword.trim());

		if (!result?.success) {
			setError(result?.message || "Unable to join room.");
			return;
		}

		onClose();
	};

	return (
		<Modal onClose={onClose}>
			<div className="mb-6">
				<div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
					<KeyRound className="w-5 h-5 text-primary" />
				</div>

				<h2 className="text-2xl font-bold text-white">
					Join Private Room
				</h2>

				<p className="text-sm text-textMuted mt-1">
					Enter the room code and password shared by your friend.
				</p>
			</div>

			<form onSubmit={handleSubmit} className="flex flex-col gap-5">
				<div>
					<label className="text-sm font-medium text-white mb-2 block">
						Room Code
					</label>

					<input
						type="text"
						value={roomCode}
						onChange={(event) => {
							setRoomCode(event.target.value.toUpperCase());
							setError("");
						}}
						placeholder="e.g. A82KD"
						className="w-full px-4 py-3 rounded-lg bg-surface border border-borderMain text-white placeholder:text-textMuted outline-none focus:border-primary font-mono tracking-widest uppercase"
					/>

					<label className="text-sm font-medium text-white mb-2 block">
						Room Password
					</label>

					<input
						type="password"
						value={roomPassword}
						onChange={(event) => {
							setRoomPassword(event.target.value);
							setError("");
						}}
						placeholder="*******"
						className="w-full px-4 py-3 rounded-lg bg-surface border border-borderMain text-white placeholder:text-textMuted outline-none focus:border-primary font-mono tracking-widest uppercase"
					/>

					{error && (
						<p className="text-sm text-red-400 mt-2">{error}</p>
					)}
				</div>

				<div className="flex gap-3 pt-2">
					<button
						type="button"
						onClick={onClose}
						className="flex-1 px-4 py-3 rounded-lg border border-borderMain text-white font-semibold hover:bg-surface transition-colors"
					>
						Cancel
					</button>

					<button
						type="submit"
						className="flex-1 px-4 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
					>
						Join Room
					</button>
				</div>
			</form>
		</Modal>
	);
}

function Modal({ children, onClose }) {
	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) {
					onClose();
				}
			}}
		>
			<div className="w-full max-w-md bg-background border border-borderMain rounded-2xl shadow-2xl p-6 relative">
				<button
					onClick={onClose}
					className="absolute top-4 right-4 text-textMuted hover:text-white transition-colors"
				>
					<X className="w-5 h-5" />
				</button>

				{children}
			</div>
		</div>
	);
}

function generateRoomCode() {
	return Math.random().toString(36).substring(2, 7).toUpperCase();
}
