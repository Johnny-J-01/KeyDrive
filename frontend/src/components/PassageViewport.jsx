import { useEffect, useRef, useState, useMemo } from "react";
import clsx from "clsx";

const VISIBLE_LINE_COUNT = 4;

function buildWordMeta(passage) {
	if (!passage) return [];

	const words = [];
	let charIndex = 0;

	for (const word of passage.split(" ")) {
		if (!word) continue;
		words.push({
			text: word,
			startChar: charIndex,
			endChar: charIndex + word.length - 1,
		});
		charIndex += word.length + 1;
	}

	return words;
}

function groupWordsIntoLines(wordElements, words) {
	if (!wordElements.length) return [];

	const lines = [];
	let currentLine = { words: [], startChar: words[0]?.startChar ?? 0 };
	let lastTop = null;

	wordElements.forEach((el, index) => {
		const top = el.offsetTop;
		const word = words[index];

		if (lastTop !== null && top > lastTop) {
			const prevWord = currentLine.words.at(-1);
			currentLine.endChar =
				index === words.length - 1
					? prevWord.endChar
					: prevWord.endChar + 1;
			lines.push(currentLine);
			currentLine = { words: [], startChar: word.startChar };
		}

		currentLine.words.push(word);
		lastTop = top;
	});

	if (currentLine.words.length) {
		const lastWord = currentLine.words.at(-1);
		const lastWordIndex = words.indexOf(lastWord);
		currentLine.endChar =
			lastWordIndex === words.length - 1
				? lastWord.endChar
				: lastWord.endChar + 1;
		lines.push(currentLine);
	}

	return lines;
}

function CharSpan({ char, index, input }) {
	let color = "";
	if (index < input.length) {
		color = input[index] === char ? "text-white" : "text-error bg-error/20";
	}

	const isCurrent = index === input.length;

	return (
		<span
			className={clsx(
				color,
				isCurrent && "border-b-2 border-primary animate-pulse",
			)}
		>
			{char}
		</span>
	);
}

export default function PassageViewport({ passage, input, onFocusInput }) {
	const containerRef = useRef(null);
	const measureRef = useRef(null);
	const [lines, setLines] = useState([]);
	const [scrollLineIndex, setScrollLineIndex] = useState(0);

	const words = useMemo(() => buildWordMeta(passage), [passage]);

	useEffect(() => {
		setScrollLineIndex(0);
	}, [passage]);

	useEffect(() => {
		if (!passage || !containerRef.current || !measureRef.current) {
			setLines([]);
			return;
		}

		const measure = () => {
			const wordElements =
				measureRef.current.querySelectorAll("[data-word-index]");
			setLines(groupWordsIntoLines(wordElements, words));
		};

		measure();

		const observer = new ResizeObserver(measure);
		observer.observe(containerRef.current);

		return () => observer.disconnect();
	}, [passage, words]);

	useEffect(() => {
		if (!lines.length) return;

		let nextScroll = 0;
		for (let i = 0; i < lines.length; i++) {
			if (input.length > lines[i].endChar) {
				nextScroll = i + 1;
			}
		}

		const maxScroll = Math.max(0, lines.length - VISIBLE_LINE_COUNT);
		setScrollLineIndex(Math.min(nextScroll, maxScroll));
	}, [input, lines]);

	const visibleLines = lines.slice(
		scrollLineIndex,
		scrollLineIndex + VISIBLE_LINE_COUNT,
	);

	return (
		<div ref={containerRef} className="w-full relative">
			<div
				ref={measureRef}
				aria-hidden
				className="invisible absolute top-0 left-0 w-full pointer-events-none select-none text-2xl leading-none font-mono"
			>
				{words.map((word, index) => (
					<span
						key={index}
						data-word-index={index}
						className="inline"
					>
						{word.text}
						{index < words.length - 1 ? " " : ""}
					</span>
				))}
			</div>

			<div
				className="w-full overflow-hidden"
				style={{
					height: `${Math.min(Math.max(visibleLines.length, 1), VISIBLE_LINE_COUNT) * 3}rem`,
				}}
				onClick={onFocusInput}
			>
				<div className="text-2xl leading-loose font-mono text-textMuted">
					{visibleLines.length > 0 ? (
						visibleLines.map((line, lineIndex) => {
							const lineText = passage.slice(
								line.startChar,
								line.endChar + 1,
							);

							return (
								<div
									key={scrollLineIndex + lineIndex}
									className="whitespace-pre-wrap min-h-[2.5rem]"
								>
									{lineText
										.split("")
										.map((char, charIndex) => (
											<CharSpan
												key={line.startChar + charIndex}
												char={char}
												index={
													line.startChar + charIndex
												}
												input={input}
											/>
										))}
								</div>
							);
						})
					) : (
						<div className="whitespace-pre-wrap">
							{passage.split("").map((char, index) => (
								<CharSpan
									key={index}
									char={char}
									index={index}
									input={input}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
