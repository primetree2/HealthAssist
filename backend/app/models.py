"""Bounded, versioned API contracts. Untrusted extracted values stay strings until validation."""

from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(
        extra="forbid", str_strip_whitespace=True, allow_inf_nan=False
    )


class PatientContext(StrictModel):
    age: int | None = Field(default=None, ge=0, le=120)
    reference_sex: Literal["female", "male", "unspecified"] = "unspecified"
    pregnancy: Literal["yes", "no", "unspecified"] = "unspecified"
    fasting: Literal["yes", "no", "unspecified"] = "unspecified"
    medications: str = Field(default="", max_length=1000)
    emergency_symptoms: bool = False


class RawObservation(StrictModel):
    name: str = Field(min_length=1, max_length=160)
    result: str = Field(max_length=160)
    unit: str = Field(default="", max_length=80)
    reference_text: str = Field(default="", max_length=240)
    flag: str = Field(default="", max_length=30)
    page: int | None = Field(default=None, ge=1, le=15)
    source_kind: Literal[
        "table", "text", "csv", "xlsx", "docx", "json", "fhir", "cloud_ocr", "user"
    ] = "text"
    source_text: str = Field(default="", max_length=600)
    source_row: int | None = Field(default=None, ge=1, le=20000)
    source_section: str = Field(default="", max_length=100)
    report_date: str = Field(default="", max_length=40)
    issues: list[str] = Field(default_factory=list, max_length=12)
    user_verified: bool = False

    @field_validator("issues")
    @classmethod
    def bound_issues(cls, values):
        if any(len(x) > 240 for x in values):
            raise ValueError("Issue is too long")
        return values


Status = Literal[
    "within_report_range",
    "above_report_range",
    "below_report_range",
    "needs_review",
    "reference_unavailable",
    "qualitative",
    "not_reported",
]


class Observation(StrictModel):
    id: str
    raw: RawObservation
    canonical_name: str | None
    category: str
    value: float | None
    comparator: str
    canonical_value: float | None
    canonical_unit: str | None
    reference_low: float | None
    reference_high: float | None
    status: Status
    explanation: str
    issues: list[str]
    name_match: Literal["exact", "unknown", "ambiguous"]


class AnalysisCounts(StrictModel):
    total: int
    within: int
    outside: int
    review: int
    qualitative: int


class ExtractionInfo(StrictModel):
    filename: str | None = None
    format: str
    page_count: int | None = None
    methods: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list, max_length=100)
    ignored_line_count: int = 0
    unparsed_lines: list[str] = Field(default_factory=list, max_length=30)
    cloud_used: bool = False


class EvidenceNote(StrictModel):
    text: str = Field(min_length=1, max_length=700)
    observation_ids: list[str] = Field(default_factory=list, max_length=12)


class AIExplanation(StrictModel):
    overview: str = Field(min_length=1, max_length=900)
    context_notes: list[EvidenceNote] = Field(max_length=6)
    doctor_questions: list[str] = Field(min_length=1, max_length=8)
    limitations: list[str] = Field(min_length=1, max_length=6)

    @field_validator("doctor_questions", "limitations")
    @classmethod
    def short_items(cls, values):
        if any(not v.strip() or len(v) > 500 for v in values):
            raise ValueError("Invalid explanation item")
        return values


class Analysis(StrictModel):
    schema_version: Literal["2.0"] = "2.0"
    id: str
    created_at: str
    context: PatientContext
    symptoms: str
    observations: list[Observation] = Field(max_length=300)
    counts: AnalysisCounts
    extraction: ExtractionInfo
    summary: str
    safety_notices: list[str]
    doctor_questions: list[str]
    limitations: list[str]
    ai: AIExplanation | None = None
    ai_status: Literal["not_requested", "generated", "unavailable"] = "not_requested"
    ai_notice: str | None = None


class ReviewRequest(StrictModel):
    observations: list[RawObservation] = Field(max_length=300)
    context: PatientContext = Field(default_factory=PatientContext)
    symptoms: str = Field(default="", max_length=4000)
    consent_processing: bool
    allow_cloud: bool = False
    explain: bool = False
