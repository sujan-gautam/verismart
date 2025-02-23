import os
import logging
import google.generativeai as genai
import openai
from transformers import pipeline
import requests
from typing import Dict, Tuple, List
from difflib import SequenceMatcher

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class AIVerificationSystem:
    def __init__(self):
        # Initialize Gemini
        self.gemini_api_key = os.environ.get("GEMINI_API_KEY")
        if self.gemini_api_key:
            genai.configure(api_key=self.gemini_api_key)
            self.gemini_model = genai.GenerativeModel('gemini-pro')
            logger.info("Gemini initialized successfully")
        else:
            logger.error("Gemini API key not found")

        # Initialize OpenAI
        self.openai_api_key = os.environ.get("OPENAI_API_KEY")
        if self.openai_api_key:
            openai.api_key = self.openai_api_key
            logger.info("OpenAI initialized successfully")
        else:
            logger.error("OpenAI API key not found")

        # Initialize Hugging Face
        self.huggingface_api_key = os.environ.get("HUGGINGFACE_API_KEY")
        if self.huggingface_api_key:
            self.hf_api_url = "https://api-inference.huggingface.co/models/google/flan-t5-large"
            self.hf_headers = {"Authorization": f"Bearer {self.huggingface_api_key}"}
            logger.info("Hugging Face initialized successfully")
        else:
            logger.error("Hugging Face API key not found")

    def format_prompt_by_mode(self, query: str, mode: str) -> str:
        """Format the prompt based on the selected mode"""
        if mode == 'math':
            return (
                "You are a mathematical calculator. "
                f"Calculate this mathematical expression and show your work: {query}. "
                "Give a brief explanation of the steps."
            )
        elif mode == 'brainstorm':
            return (
                "You are a creative brainstorming assistant. "
                f"Generate multiple creative ideas for: {query}. "
                "List at least 3-4 unique ideas."
            )
        elif mode == 'code':
            return (
                "You are a coding tutor. For the given code question, provide: "
                "1. A brief explanation of what the code does\n"
                "2. The complete code solution with comments\n"
                "3. Sample output\n"
                "4. Additional tips or best practices if relevant\n\n"
                f"Question: {query}"
            )
        else:  # general mode
            return (
                "You are a helpful assistant. "
                f"Please answer this question clearly and concisely: {query}"
            )

    def format_response_by_mode(self, response: str, mode: str) -> str:
        """Format the response based on the mode"""
        if mode == 'code':
            # Ensure response has proper code block formatting
            if '```' not in response:
                # Extract code and explanation
                parts = response.split('\n')
                explanation = []
                code = []
                output = []
                tips = []
                
                current_section = 'explanation'
                for part in parts:
                    if 'Code:' in part or 'Solution:' in part:
                        current_section = 'code'
                        continue
                    elif 'Output:' in part or 'Result:' in part:
                        current_section = 'output'
                        continue
                    elif 'Tips:' in part or 'Note:' in part:
                        current_section = 'tips'
                        continue
                    
                    if current_section == 'explanation':
                        explanation.append(part)
                    elif current_section == 'code':
                        code.append(part)
                    elif current_section == 'output':
                        output.append(part)
                    elif current_section == 'tips':
                        tips.append(part)

                formatted_response = (
                    "### Code Solution\n\n"
                    f"* Explanation: {' '.join(explanation).strip()}\n\n"
                    "```python\n"
                    f"{' '.join(code).strip()}\n"
                    "```\n\n"
                    f"* Output: {' '.join(output).strip()}\n"
                    f"* Tips: {' '.join(tips).strip() if tips else 'Follow Python naming conventions and add comments for better code readability.'}"
                )
                return formatted_response
            return response
        elif mode == 'math':
            return f"### Mathematical Solution\n\n* Result: {response}"
        elif mode == 'brainstorm':
            ideas = response.split('\n')
            formatted_ideas = [f"* {idea.strip()}" for idea in ideas if idea.strip()]
            return "### Brainstorming Ideas\n\n" + "\n".join(formatted_ideas)
        else:
            return f"### Answer\n\n* {response}"

    def get_gemini_response(self, query: str, mode: str) -> Tuple[str, float]:
        try:
            prompt = self.format_prompt_by_mode(query, mode)
            response = self.gemini_model.generate_content(prompt)
            if response and hasattr(response, 'text'):
                return response.text.strip(), 0.9
            return "", 0.0
        except Exception as e:
            logger.error(f"Gemini error: {str(e)}")
            return "", 0.0

    def get_openai_response(self, query: str, mode: str) -> Tuple[str, float]:
        try:
            prompt = self.format_prompt_by_mode(query, mode)
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=150
            )
            if response.choices:
                return response.choices[0].message.content.strip(), 0.85
            return "", 0.0
        except Exception as e:
            logger.error(f"OpenAI error: {str(e)}")
            return "", 0.0

    def get_huggingface_response(self, query: str, mode: str) -> Tuple[str, float]:
        try:
            prompt = self.format_prompt_by_mode(query, mode)
            response = requests.post(
                self.hf_api_url,
                headers=self.hf_headers,
                json={"inputs": prompt}
            )
            if response.status_code == 200:
                return response.json()[0]['generated_text'].strip(), 0.8
            return "", 0.0
        except Exception as e:
            logger.error(f"Hugging Face error: {str(e)}")
            return "", 0.0

    def calculate_similarity(self, text1: str, text2: str) -> float:
        return SequenceMatcher(None, text1.lower(), text2.lower()).ratio()

    def get_most_common_response(self, responses: List[Tuple[str, float]]) -> Tuple[str, float, List[Dict]]:
        valid_responses = [(r, c) for r, c in responses if r]
        if not valid_responses:
            return "", 0.0, []

        similarities = []
        for i, (r1, c1) in enumerate(valid_responses):
            for j, (r2, c2) in enumerate(valid_responses):
                if i < j:
                    sim = self.calculate_similarity(r1, r2)
                    similarities.append((i, j, sim))

        # Find matching responses
        matching_responses = []
        for i, j, sim in similarities:
            if sim > 0.7:  # Similarity threshold
                matching_responses.extend([i, j])

        if matching_responses:
            # Use the response that appears most in matches
            most_common = max(set(matching_responses), key=matching_responses.count)
            chosen_response, confidence = valid_responses[most_common]
        else:
            # If no matches, use the highest confidence response
            chosen_response, confidence = max(valid_responses, key=lambda x: x[1])

        # Prepare model confidences
        model_confidences = [
            {"model": "Gemini", "confidence": responses[0][1]},
            {"model": "OpenAI", "confidence": responses[1][1]},
            {"model": "Hugging Face", "confidence": responses[2][1]}
        ]

        return chosen_response, confidence, model_confidences

    async def verify_response(self, query: str, mode: str = 'general', mongo_db=None) -> Dict[str, any]:
        try:
            logger.info(f"Processing query: {query} in mode: {mode}")

            # Get responses from all models
            responses = [
                self.get_gemini_response(query, mode),
                self.get_openai_response(query, mode),
                self.get_huggingface_response(query, mode)
            ]

            # Get the most common response
            final_response, confidence, model_confidences = self.get_most_common_response(responses)

            if not final_response:
                return {
                    "response": "### Error\n\n* I'm not sure about the correct answer.",
                    "confidence": 0.0,
                    "source": "uncertain",
                    "mode": mode,
                    "model_confidences": model_confidences
                }

            # Format the response based on mode
            formatted_response = self.format_response_by_mode(final_response, mode)

            return {
                "response": formatted_response,
                "confidence": confidence,
                "source": "verified",
                "mode": mode,
                "model_confidences": model_confidences
            }

        except Exception as e:
            logger.error(f"Error in verify_response: {str(e)}")
            return {
                "response": "### Error\n\n* An error occurred while processing your request.",
                "confidence": 0.0,
                "source": "error",
                "mode": mode,
                "model_confidences": []
            }