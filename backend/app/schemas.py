from pydantic import BaseModel
from typing import List

class AnalyzeResult(BaseModel):
    possible_conditions: List[str]
    meaning_behind_symptoms: str
    what_to_ask_your_doctor: List[str]
    when_to_take_it_serious: str
    precautions: str
    warnings: str
    get_well_message: str
    disclaimer: str
