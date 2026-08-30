import pool from '../model/db.js';

const MIN_WORD_COUNT = 1;
const MAX_WORD_COUNT = 1000;

export const getPracticeWordsController = async (request, response) => {
	try {
		// const parsedCount = parseInt(request.query.count, 10);
		// const count = Number.isNaN(parsedCount)
		// 	? 25
		// 	: Math.min(Math.max(parsedCount, MIN_WORD_COUNT), MAX_WORD_COUNT);

		const count = 500;

		const result = await pool.query(
			`
				SELECT word
				FROM typing_words
				ORDER BY RANDOM()
				LIMIT $1
			`,
			[count],
		);

		if (result.rows.length === 0) {
			return response.status(404).json({
				message: "No words found. Run the typing_words seed SQL first.",
			});
		}

		const words = result.rows.map((row) => row.word);

		response.status(200).json({
			words,
			text: words.join(" "),
			count: words.length,
		});
	} catch (error) {
		console.error("PRACTICE WORDS ERROR:", error);
		response.status(500).json({
			error: error.message,
		});
	}
};
