import supabase from '../model/supabase.js';

const MIN_WORD_COUNT = 1;
const MAX_WORD_COUNT = 1000;

export const getPracticeWordsController = async (request, response) => {
	try {
		const parsedCount = parseInt(request.query.count, 10);
		const count = Number.isNaN(parsedCount)
			? 500
			: Math.min(Math.max(parsedCount, MIN_WORD_COUNT), MAX_WORD_COUNT);

		const { data, error } = await supabase.rpc('get_random_typing_words', {
			p_count: count,
		});

		if (error) {
			throw error;
		}

		if (!data || data.length === 0) {
			return response.status(404).json({
				message: "No words found. Run the typing_words seed SQL first.",
			});
		}

		const words = data.map((row) => row.word);

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
