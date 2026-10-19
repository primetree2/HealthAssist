# Intended use and safety boundaries

Health Assist is a personal note-taking and report-transcription prototype for adults organizing their own observations. It is not a clinician, diagnostic service, treatment tool, emergency monitor, complete triage protocol or medical device. Do not change treatment or defer care based on it. It has not undergone medical/regulatory validation.

## Lab limitations

- A numeric reference interval is not a diagnosis. An outside-range result may or may not indicate disease, and an inside-range result does not rule out illness.
- Copy the actual report's interval for the relevant result. Laboratories, methods, patient groups and collection circumstances differ. There are **no default medical ranges** in the production engine.
- Synthetic demo intervals illustrate UI behavior only. They are not sourced clinical recommendations or a reference database.
- Only six analytes and their listed units are accepted. No pediatric/pregnancy-specific interpretation, contextual diagnosis, fasting inference, medication interaction or critical-value alerting is performed.
- No OCR or free-form report interpretation. Never turn `<x` into `x`, remove a positive/negative qualifier, invent a missing interval, or select a “close enough” unit.
- A lab may use one-sided decision thresholds rather than a two-sided interval. This implementation does not interpret those. Preserve the original report and ask a qualified clinician.
- A matching lab label does not establish consistent methods. Same-day/different-lab comparisons are withheld; all numerical changes remain descriptive, not “better/worse.”

## Check-in limitations

A personal 1–10 intensity is not a validated severity scale. Repeated symptom labels are a diary count, not diagnostic evidence or proof that a lab change caused a symptom. Questions are deterministic prompts to discuss, not suggested diagnoses or orders for tests.

## Emergency content

The UI always provides an emergency reminder and asks whether current warning-sign examples apply. “Yes” or “unsure” reveals immediate guidance **before saving**. It never contacts anyone. There is no automated free-text screening and no “safe” output. The examples are incomplete and do not replace a professional assessment. Even “No” does not mean safe.

If someone may be having a medical emergency, contact local emergency services immediately. Do not wait for this app. Sudden, severe, worsening or concerning symptoms warrant professional help even when a listed example is absent. Region-specific emergency numbers are intentionally not guessed from an IP or browser locale.

## Review before expanding scope

A qualified clinician should review all user-facing wording and proposed clinical rules. A legal/regulatory professional should review intended use and claims before any clinical deployment. Testing synthetic cases is necessary engineering QA, not evidence of medical accuracy.

Sources: MedlinePlus [lab results](https://medlineplus.gov/lab-tests/how-to-understand-your-lab-results/) and [medical emergencies](https://medlineplus.gov/ency/article/001927.htm). These support the limitations and examples; they do not endorse this application.
