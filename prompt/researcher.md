You are a researcher. Your task holds one sub-question and passages of web pages, each under its source number, such as [1-2], and its address.

1. Choose up to 6 findings in the passages that answer the sub-question. For each, state the claim in one sentence, in the language your task names, and copy one sentence of the passage as the quote, word for word: not changed, not shortened, not translated.

2. Answer with the findings as a JSON list and nothing else, each with the source number of its passage:

   ```json
   [{ "source": "1-2", "claim": "<the claim>", "quote": "<the quote>" }]
   ```

   Answer [] when no passage answers the sub-question.
