import fitz
import os
import json
import re
import google.generativeai as genai
from dotenv import load_dotenv
from .config import settings

genai.configure(api_key=settings.GOOGLE_API_KEY)

#genai.configure(api_key="AIzaSyCYFs3kyOeGFglydZ15PszdDLxx7SytaNI") #use this if getenv or env keys don't work


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    try:
        text = ''
        doc = fitz.open(stream=pdf_bytes, filetype='pdf')
        for page in doc:
            text += page.get_text()
        return text
    except Exception:
        return ''


def build_structured_prompt(age, sex, symptoms, pdf_text=''):
    symptoms = symptoms.strip()
    pdf_excerpt = (pdf_text[:800] + '...') if pdf_text else ''

    prompt = f"""
You are a medical-education assistant. Focus ONLY on the user's symptoms first.
Do NOT invent conditions unrelated to the symptoms.
Use the blood report excerpt only if it clearly supports the symptoms.

Respond ONLY in JSON with the following keys:
- possible_conditions (list of strings, based ONLY on symptoms)
- meaning_behind_symptoms (string, explain symptoms logically)
- what_to_ask_your_doctor (list of strings)
- when_to_take_it_serious (string)
- precautions (string)
- warnings (string)

User demographics:
- Age: {age}
- Sex: {sex}

Symptoms: {symptoms}

Blood report excerpt (optional): {pdf_excerpt}

Return compact JSON only. End.
"""
    return prompt


def call_llm(age, sex, symptoms, pdf_text=''):
    symptoms = symptoms.strip()
    if not symptoms:
        return {
            'possible_conditions': [],
            'meaning_behind_symptoms': "You haven't provided any symptoms to analyze.",
            'what_to_ask_your_doctor': [
                "Can you please describe my symptoms and their potential causes?",
                "What further tests might be needed to understand my health status?",
                "What lifestyle changes or treatments do you recommend based on my current health?"
            ],
            'when_to_take_it_serious': "If you are experiencing any new, severe, or concerning symptoms, it is important to seek medical attention promptly.",
            'precautions': "Please provide your symptoms so I can offer more specific guidance.",
            'warnings': "",
            'get_well_message': "Get well soon!",
            'disclaimer': "This information is not a substitute for professional medical advice."
        }

    prompt = build_structured_prompt(age, sex, symptoms, pdf_text)

    try:
        model = genai.GenerativeModel("gemini-2.5-flash-lite")
        response = model.generate_content(prompt)
        text = response.text.strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            match = re.search(r'{.*}', text, re.DOTALL)
            if match:
                return json.loads(match.group())
            else:
                raise ValueError("LLM response is not valid JSON")

    except Exception as e:
        return {
            'possible_conditions': ['Unable to parse LLM response'],
            'meaning_behind_symptoms': str(e),
            'what_to_ask_your_doctor': [],
            'when_to_take_it_serious': '',
            'precautions': '',
            'warnings': '',
            'get_well_message': 'Get well soon!',
            'disclaimer': 'This is for educational purposes only and not medical advice.'
        }
